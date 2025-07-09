// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as positron from 'positron';
import { RPackageProvider, RPackageItem } from './rPackageProvider';
import { PythonPackageProvider } from './pythonPackageProvider';
import { RPackageCommands } from './rPackageCommands';
import { refreshRPackages } from './rPackageRefresh';
import { setupRuntimeEvents } from './runtimeEvents';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('PMP Package Manager extension is now active!');

    // Create providers for R and Python packages
    const rPackageProvider = new RPackageProvider();
    const pythonPackageProvider = new PythonPackageProvider();

    // Create R package commands handler
    const rPackageCommands = new RPackageCommands(rPackageProvider);

    // Register tree data providers
    const rTreeView = vscode.window.createTreeView('rPackageView', {
        treeDataProvider: rPackageProvider,
        showCollapseAll: false,
        canSelectMany: false
    });

    // Handle checkbox changes for R packages (load/unload)
    rTreeView.onDidChangeCheckboxState((event) => {
        for (const [item, newState] of event.items) {
            if (item instanceof RPackageItem) {
                rPackageProvider.handleCheckboxChange(item, newState);
            }
        }
    });

    // Auto-refresh when R tree view becomes visible
    rTreeView.onDidChangeVisibility(async (event) => {
        if (event.visible) {
            const hasR = await positron.runtime.getRegisteredRuntimes()
                .then((runtimes) => runtimes.some((runtime) => runtime.languageId === 'r'));
            if (hasR) {
                // Use command to avoid duplicate refreshes
                vscode.commands.executeCommand('pmp-package-manager.refreshRPackages');
            }
        }
    });

    // Register Python tree view (placeholder for now)
    vscode.window.registerTreeDataProvider('pythonPackageView', pythonPackageProvider);

    // Register R package commands
    context.subscriptions.push(
        vscode.commands.registerCommand('pmp-package-manager.refreshRPackages', () => {
            refreshRPackages(rPackageProvider);
        }),

        vscode.commands.registerCommand('pmp-package-manager.searchRPackages', () => {
            rPackageCommands.searchPackages();
        }),

        vscode.commands.registerCommand('pmp-package-manager.installRPackages', () => {
            rPackageCommands.installPackages();
        }),

        vscode.commands.registerCommand('pmp-package-manager.uninstallRPackage', (item?: RPackageItem) => {
            rPackageCommands.uninstallPackage(item);
        }),

        vscode.commands.registerCommand('pmp-package-manager.updateRPackages', () => {
            rPackageCommands.updatePackages();
        }),

        vscode.commands.registerCommand('pmp-package-manager.filterLoadedRPackages', () => {
            rPackageCommands.filterLoadedPackages();
        }),

        vscode.commands.registerCommand('pmp-package-manager.openRPackageHelp', (packageName: string) => {
            rPackageCommands.openPackageHelp(packageName);
        })
    );

    // Setup runtime event listeners
    setupRuntimeEvents(rPackageProvider, context);

    // Initial refresh if R is available
    setTimeout(async () => {
        const hasR = await positron.runtime.getRegisteredRuntimes()
            .then((runtimes) => runtimes.some((runtime) => runtime.languageId === 'r'));
        if (hasR) {
            vscode.commands.executeCommand('pmp-package-manager.refreshRPackages');
        }
    }, 1000);
}

// This method is called when your extension is deactivated
export function deactivate() {}
