import * as vscode from 'vscode';
import { PythonPackageInfo } from './types';

/**
 * Placeholder provider for Python packages (to be implemented)
 */
export class PythonPackageProvider implements vscode.TreeDataProvider<PythonPackageItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PythonPackageItem | undefined | void> = new vscode.EventEmitter();
    readonly onDidChangeTreeData: vscode.Event<PythonPackageItem | undefined | void> = this._onDidChangeTreeData.event;

    getTreeItem(element: PythonPackageItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<PythonPackageItem[]> {
        return Promise.resolve([
            new PlaceholderItem("Python package management coming soon...") as PythonPackageItem
        ]);
    }
}

/**
 * Placeholder item for Python packages
 */
export class PythonPackageItem extends vscode.TreeItem {
    constructor(public pkg: PythonPackageInfo) {
        super(pkg.name, vscode.TreeItemCollapsibleState.None);
        this.description = pkg.version;
        this.tooltip = pkg.summary;
        this.contextValue = 'pythonPackage';
    }
}

/**
 * Placeholder item for when Python support is not yet implemented
 */
class PlaceholderItem extends vscode.TreeItem {
    constructor(message: string) {
        super(message, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('info');
        this.contextValue = 'placeholder';
    }
}
