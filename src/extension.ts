// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as positron from 'positron';

// Simple tree data provider for an empty view
class EmptyTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    // Return an empty array for now - you can add items here later
    return Promise.resolve([]);
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "positron-package-manager" is now active!');

  // Create empty tree data providers for R and Python packages
  const rPackageProvider = new EmptyTreeDataProvider();
  const pythonPackageProvider = new EmptyTreeDataProvider();

  // Register the tree data providers for our views
  vscode.window.registerTreeDataProvider('rPackageView', rPackageProvider);
  vscode.window.registerTreeDataProvider('pythonPackageView', pythonPackageProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
