import * as vscode from 'vscode';
import * as positron from 'positron';
import { filter } from 'fuzzaldrin-plus';
import { RPackageInfo } from './types';

/**
 * Tree data provider for R packages
 */
export class RPackageProvider implements vscode.TreeDataProvider<RPackageItem> {
    private filterText: string = '';
    private showOnlyLoadedPackages: boolean = false;
    private _onDidChangeTreeData: vscode.EventEmitter<RPackageItem | undefined | void> = new vscode.EventEmitter();
    readonly onDidChangeTreeData: vscode.Event<RPackageItem | undefined | void> = this._onDidChangeTreeData.event;

    private packages: RPackageInfo[] = [];

    /**
     * Refresh the package list with the given data
     * @param packages A list of RPackageInfo objects
     */
    refresh(packages: RPackageInfo[]): void {
        this.packages = packages;
        this._onDidChangeTreeData.fire();
    }

    /**
     * Returns the TreeItem for the given RPackageItem
     */
    getTreeItem(element: RPackageItem): vscode.TreeItem {
        return element;
    }

    /**
     * Returns the children elements of the tree view
     */
    getChildren(): Thenable<RPackageItem[]> {
        let filtered = this.packages;

        // Apply text filter if exists
        if (this.filterText.trim()) {
            const enriched = this.packages.map(pkg => ({
                pkg,
                query: `${pkg.name} ${pkg.title}`
            }));

            const matches = filter(enriched, this.filterText.trim(), {
                key: 'query'
            });

            filtered = matches.map((m: { pkg: RPackageInfo; query: string }) => m.pkg);
        }

        // Apply loaded packages filter if enabled
        if (this.showOnlyLoadedPackages) {
            filtered = filtered.filter(pkg => pkg.loaded);
        }

        // Return placeholder if no packages found
        if (filtered.length === 0) {
            return Promise.resolve([
                new PlaceholderItem("No R package information available yet.") as RPackageItem,
                new PlaceholderItem("Try to refresh after R starts or clear search.") as RPackageItem
            ]);
        }

        return Promise.resolve(filtered.map(pkg => new RPackageItem(pkg)));
    }

    /**
     * Handles checkbox state changes for package loading/unloading
     */
    async handleCheckboxChange(item: RPackageItem, newState: vscode.TreeItemCheckboxState): Promise<void> {
        const isNowChecked = newState === vscode.TreeItemCheckboxState.Checked;

        const code = isNowChecked
            ? `library(${JSON.stringify(item.pkg.name)}, lib.loc = ${JSON.stringify(item.pkg.libpath)})`
            : `detach("package:${item.pkg.name}", unload = TRUE)`;

        try {
            await positron.runtime.executeCode('r', code, true, undefined, positron.RuntimeCodeExecutionMode.Interactive);
            // Refresh packages after loading/unloading
            vscode.commands.executeCommand('pmp-package-manager.refreshRPackages');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to ${isNowChecked ? 'load' : 'unload'} package: ${error}`);
        }
    }

    /**
     * Gets the current filter text
     */
    getFilter(): string {
        return this.filterText || '';
    }

    /**
     * Sets the filter text and refreshes the view
     */
    setFilter(filterText: string): void {
        this.filterText = filterText;
        this._onDidChangeTreeData.fire();
    }

    /**
     * Gets the current list of packages
     */
    getPackages(): RPackageInfo[] {
        return this.packages;
    }

    /**
     * Toggles the filter for showing only loaded packages
     */
    toggleShowOnlyLoadedPackages(): void {
        this.showOnlyLoadedPackages = !this.showOnlyLoadedPackages;
        this._onDidChangeTreeData.fire();
    }

    /**
     * Check if only loaded packages are shown
     */
    isShowingOnlyLoadedPackages(): boolean {
        return this.showOnlyLoadedPackages;
    }
}

/**
 * Tree item representing an R package
 */
export class RPackageItem extends vscode.TreeItem {
    constructor(public pkg: RPackageInfo) {
        super(pkg.name, vscode.TreeItemCollapsibleState.None);

        this.description = `${pkg.version} (${pkg.locationtype})`;
        this.tooltip = `${pkg.title}\n(${pkg.libpath})`;
        this.contextValue = 'rPackage';

        // Set checkbox state based on whether package is loaded
        this.checkboxState = pkg.loaded
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;

        // Set icon (you can customize this or use a default one)
        this.iconPath = new vscode.ThemeIcon('package');

        // Set command to open help when clicked
        this.command = {
            command: 'pmp-package-manager.openRPackageHelp',
            title: 'Open Package Help',
            arguments: [pkg.name],
        };
    }
}

/**
 * Placeholder item for when no packages are available
 */
class PlaceholderItem extends vscode.TreeItem {
    constructor(message: string) {
        super(message, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('info');
        this.contextValue = 'placeholder';
    }
}
