import * as vscode from 'vscode';
import * as positron from 'positron';
import { RPackageProvider } from './rPackageProvider';
import { refreshRPackages } from './rPackageRefresh';

/**
 * Sets up event listeners for Positron runtime changes
 */
export function setupRuntimeEvents(provider: RPackageProvider, context: vscode.ExtensionContext): void {
    // Listen for changes in active runtime sessions
    const changeForegroundEvent = positron.runtime.onDidChangeForegroundSession((sessionId) => {
        // Get the active sessions and check if any is R
        positron.runtime.getActiveSessions().then((sessions) => {
            const hasActiveR = sessions.some((session) => session.runtimeMetadata.languageId === 'r');
            if (hasActiveR) {
                // Refresh packages when R session becomes active
                setTimeout(() => {
                    refreshRPackages(provider);
                }, 1000);
            }
        });
    });

    // Listen for new runtime registrations
    const registerRuntimeEvent = positron.runtime.onDidRegisterRuntime((runtime) => {
        if (runtime.languageId === 'r') {
            // Refresh packages when new R runtime is registered
            setTimeout(() => {
                refreshRPackages(provider);
            }, 1000);
        }
    });

    // Add to context subscriptions for proper cleanup
    context.subscriptions.push(changeForegroundEvent);
    context.subscriptions.push(registerRuntimeEvent);
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
