import * as vscode from 'vscode';
import * as positron from 'positron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RPackageProvider } from './rPackageProvider';
import { RPackageInfo } from './types';

// Global flag to prevent concurrent refreshes
let isRefreshing = false;

/**
 * Remove ANSI escape codes from a string, so that only the plain text remains.
 */
function stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Returns an ExecutionObserver that shows an error message for R package refresh
 */
function getObserver(template: string): positron.runtime.ExecutionObserver {
    function errorHandling(error: string) {
        // Check for jsonlite-specific error
        if (/jsonlite/i.test(error)) {
            vscode.window.showWarningMessage(
                "The 'jsonlite' package appears to be missing. Would you like to install it?",
                "Install"
            ).then(selection => {
                if (selection === "Install") {
                    installJsonlite();
                }
            });
        } else {
            vscode.window.showErrorMessage(`${template} ${error}`);
        }
    }

    const observer: positron.runtime.ExecutionObserver = {
        // Commenting out onError and onOutput to prevent code from showing in console
        // onOutput: (message: string) => {
        //     // Suppress output during silent execution
        // },
        // onError: (error: string) => {
        //     errorHandling(stripAnsi(error));
        // },
        onFailed: (error: Error) => {
            errorHandling(stripAnsi(error.message));
        }
    };
    return observer;
}

/**
 * Install jsonlite package
 */
async function installJsonlite(): Promise<void> {
    const rCode = `install.packages("jsonlite")`;

    try {
        await positron.runtime.executeCode(
            'r',
            rCode,
            true,
            undefined,
            positron.RuntimeCodeExecutionMode.Interactive
        );
        vscode.window.showInformationMessage('jsonlite package installed successfully');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to install jsonlite package');
    }
}

/**
 * Waits for a file to be created with a timeout
 */
async function waitForFile(filePath: string, timeout: number = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const interval = setInterval(() => {
            if (fs.existsSync(filePath)) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                const error = new Error(`Timeout waiting for file: ${filePath}`);
                reject(error);
            }
        }, 100);
    });
}

/**
 * Refreshes the R package list by executing R code to retrieve package information
 * Based on the original positron-r-package-manager implementation
 */
export async function refreshRPackages(provider: RPackageProvider): Promise<void> {
    // Prevent concurrent refreshes
    if (isRefreshing) {
        console.log('Refresh already in progress, skipping...');
        return;
    }

    isRefreshing = true;
    
    try {
        // Check if R runtime is available
        const hasR = await positron.runtime.getRegisteredRuntimes()
            .then((runtimes) => runtimes.some((runtime) => runtime.languageId === 'r'));
        
        if (!hasR) {
            throw new Error("No R runtime available.");
        }

        // Generate temporary file path
        const tmpPath = path.join(os.tmpdir(), `r_packages_${Date.now()}.json`);
        const rTmpPath = tmpPath.replace(/\\/g, '/');

        // R code based on the original implementation - simple and clean
        const rCode = `
            (function() {
              jsonlite::write_json(
                {
                  do.call(rbind, lapply(.libPaths(), function(lib) {
                    if (!dir.exists(lib)) return(NULL)

                    pkgs <- installed.packages(lib.loc = lib)[, c("Package", "Version"), drop = FALSE]
                    if (nrow(pkgs) == 0) return(NULL)

                    titles <- vapply(pkgs[, "Package"], function(pkg) {
                      tryCatch(packageDescription(pkg, fields = "Title"), error = function(e) NA_character_)
                    }, character(1))

                    loaded_paths <- vapply(loadedNamespaces(), function(pkg) {
                      tryCatch(dirname(getNamespaceInfo(pkg, "path")), error = function(e) NA_character_)
                    }, character(1), USE.NAMES = TRUE)

                    df <- data.frame(
                      Package = pkgs[, "Package"],
                      Version = pkgs[, "Version"],
                      LibPath = lib,
                      LocationType = if (normalizePath(lib, winslash = "/", mustWork = FALSE) %in%
                                           normalizePath(.Library, winslash = "/", mustWork = FALSE)) "System" else "User",
                      Title = titles,
                      Loaded = pkgs[, "Package"] %in% names(loaded_paths) & loaded_paths[pkgs[, "Package"]] == lib,
                      stringsAsFactors = FALSE
                    )

                    df
                  })) -> result

                  if (is.null(result)) list() else result[order(result$Package, result$LibPath), ]
                },
                path = "${rTmpPath}",
                auto_unbox = TRUE
              )
            })()
        `.trim();

        const observer = getObserver("Error refreshing packages:");

        // Execute R code with observer (this is the key for silent execution)
        await positron.runtime.executeCode(
            'r',
            rCode,
            false,
            undefined,
            positron.RuntimeCodeExecutionMode.Silent,
            undefined,
            observer
        );

        // Wait for file and read results
        await waitForFile(tmpPath);
        const contents = fs.readFileSync(tmpPath, 'utf-8');
        
        const parsed: {
            Package: string;
            Version: string;
            LibPath: string;
            LocationType: string;
            Title: string;
            Loaded: boolean;
        }[] = JSON.parse(contents);

        // Clean up temporary file
        try {
            fs.unlinkSync(tmpPath);
        } catch (unlinkErr) {
            console.warn('Failed to delete temp file:', unlinkErr);
        }

        // Convert to RPackageInfo format
        const pkgInfo: RPackageInfo[] = parsed.map(pkg => ({
            name: pkg.Package,
            version: pkg.Version,
            libpath: pkg.LibPath,
            locationtype: pkg.LocationType,
            title: pkg.Title || `Package ${pkg.Package}`,
            loaded: pkg.Loaded
        }));

        // Update the provider
        provider.refresh(pkgInfo);
        
        console.log(`Refreshed ${pkgInfo.length} R packages`);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to refresh R packages: ${errorMessage}`);
        console.error('Error refreshing R packages:', error);
    } finally {
        isRefreshing = false;
    }
}
