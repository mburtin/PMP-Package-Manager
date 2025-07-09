import * as vscode from 'vscode';
import * as positron from 'positron';
import { RPackageProvider, RPackageItem } from './rPackageProvider';
import { refreshRPackages } from './rPackageRefresh';

/**
 * Handles R package related commands
 */
export class RPackageCommands {
    constructor(private provider: RPackageProvider) {}

    /**
     * Search R packages with a filter
     */
    async searchPackages(): Promise<void> {
        const input = await vscode.window.showInputBox({
            prompt: 'Search R packages — press Esc to clear filter, Enter to apply',
            value: this.provider.getFilter(),
            placeHolder: 'e.g. ggplot2, dplyr, data.table',
        });

        this.provider.setFilter(input ?? '');
    }

    /**
     * Install R packages
     */
    async installPackages(): Promise<void> {
        const packageNames = await vscode.window.showInputBox({
            prompt: 'Enter R package names to install (separated by commas)',
            placeHolder: 'e.g. ggplot2, dplyr, tidyr',
        });

        if (!packageNames) {
            return;
        }

        try {
            // Check if R session is available
            const hasActiveR = await positron.runtime.getActiveSessions()
                .then((sessions) => sessions.some((session) => session.runtimeMetadata.languageId === 'r'));
            
            if (!hasActiveR) {
                vscode.window.showWarningMessage('No active R console session available. Please start one.');
                return;
            }

            const packages = packageNames.split(',').map(pkg => pkg.trim()).filter(pkg => pkg.length > 0);
            
            if (packages.length === 0) {
                vscode.window.showWarningMessage('No valid package names provided.');
                return;
            }

            vscode.window.showInformationMessage(`Installing R packages: ${packages.join(', ')}`);

            // Create install command
            const installCode = `install.packages(c(${packages.map(pkg => `"${pkg}"`).join(', ')}))`;

            await positron.runtime.executeCode(
                'r',
                installCode,
                true,
                undefined,
                positron.RuntimeCodeExecutionMode.Interactive
            );

            // Refresh package list after installation
            setTimeout(() => {
                refreshRPackages(this.provider);
            }, 2000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to install packages: ${errorMessage}`);
        }
    }

    /**
     * Uninstall an R package
     */
    async uninstallPackage(item?: RPackageItem): Promise<void> {
        if (!item) {
            vscode.window.showWarningMessage('No package selected for uninstallation.');
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            `Are you sure you want to uninstall package "${item.pkg.name}"?`,
            { modal: true },
            'Yes', 'No'
        );

        if (confirmation !== 'Yes') {
            return;
        }

        try {
            // Check if R session is available
            const hasActiveR = await positron.runtime.getActiveSessions()
                .then((sessions) => sessions.some((session) => session.runtimeMetadata.languageId === 'r'));
            
            if (!hasActiveR) {
                vscode.window.showWarningMessage('No active R console session available. Please start one.');
                return;
            }

            vscode.window.showInformationMessage(`Uninstalling R package: ${item.pkg.name}`);

            const uninstallCode = `remove.packages("${item.pkg.name}", lib = "${item.pkg.libpath}")`;

            await positron.runtime.executeCode(
                'r',
                uninstallCode,
                true,
                undefined,
                positron.RuntimeCodeExecutionMode.Interactive
            );

            // Refresh package list after uninstallation
            setTimeout(() => {
                refreshRPackages(this.provider);
            }, 1000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to uninstall package: ${errorMessage}`);
        }
    }

    /**
     * Update all R packages
     */
    async updatePackages(): Promise<void> {
        const confirmation = await vscode.window.showWarningMessage(
            'This will update all R packages. This may take a while. Continue?',
            { modal: true },
            'Yes', 'No'
        );

        if (confirmation !== 'Yes') {
            return;
        }

        try {
            // Check if R session is available
            const hasActiveR = await positron.runtime.getActiveSessions()
                .then((sessions) => sessions.some((session) => session.runtimeMetadata.languageId === 'r'));
            
            if (!hasActiveR) {
                vscode.window.showWarningMessage('No active R console session available. Please start one.');
                return;
            }

            vscode.window.showInformationMessage('Updating all R packages...');

            const updateCode = 'update.packages(ask = FALSE)';

            await positron.runtime.executeCode(
                'r',
                updateCode,
                true,
                undefined,
                positron.RuntimeCodeExecutionMode.Interactive
            );

            // Refresh package list after update
            setTimeout(() => {
                refreshRPackages(this.provider);
            }, 5000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to update packages: ${errorMessage}`);
        }
    }

    /**
     * Open package help documentation
     */
    async openPackageHelp(packageName: string): Promise<void> {
        try {
            const hasActiveR = await positron.runtime.getActiveSessions()
                .then((sessions) => sessions.some((session) => session.runtimeMetadata.languageId === 'r'));
            
            if (!hasActiveR) {
                vscode.window.showWarningMessage('No active R console session available. Please start one.');
                return;
            }

            const helpCode = `help(package = "${packageName}")`;

            await positron.runtime.executeCode(
                'r',
                helpCode,
                false,
                undefined,
                positron.RuntimeCodeExecutionMode.Silent
            );

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to open help for package ${packageName}: ${errorMessage}`);
        }
    }

    /**
     * Toggle filter for showing only loaded packages
     */
    filterLoadedPackages(): void {
        this.provider.toggleShowOnlyLoadedPackages();
        const isFiltering = this.provider.isShowingOnlyLoadedPackages();
        vscode.window.showInformationMessage(
            isFiltering ? 'Showing only loaded packages' : 'Showing all packages'
        );
    }
}
