import * as vscode from 'vscode';
import * as positron from 'positron';
import { RPackageProvider } from './rPackageProvider';
import { refreshRPackages } from './rPackageRefresh';

/**
 * Sets up event listeners for Positron runtime changes
 */
export function setupRuntimeEvents(provider: RPackageProvider, context: vscode.ExtensionContext): void {
    // Listen for changes in foreground session - only refresh when R session becomes active
    const changeForegroundEvent = positron.runtime.onDidChangeForegroundSession((sessionId) => {
        // Only refresh if the new session is an R session
        if (!sessionId?.startsWith('r-')) { 
            return; 
        }
        vscode.commands.executeCommand('pmp-package-manager.refreshRPackages');
    });

    // Add to context subscriptions for proper cleanup
    context.subscriptions.push(changeForegroundEvent);
}

/**
 * Check if R runtime is available and active
 */
export async function checkRuntimeAvailability(): Promise<{ hasRuntime: boolean; hasActiveSession: boolean }> {
    try {
        const hasRuntime = await positron.runtime.getRegisteredRuntimes()
            .then((runtimes) => runtimes.some((runtime) => runtime.languageId === 'r'));
        
        const hasActiveSession = await positron.runtime.getActiveSessions()
            .then((sessions) => sessions.some((session) => session.runtimeMetadata.languageId === 'r'));
        
        return { hasRuntime, hasActiveSession };
    } catch (error) {
        console.error('Error checking R runtime availability:', error);
        return { hasRuntime: false, hasActiveSession: false };
    }
}
