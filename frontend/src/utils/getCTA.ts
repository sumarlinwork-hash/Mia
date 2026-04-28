// CTA (Call-to-Action) Logic
// Determines which buttons to show based on app state

import { mapState } from './stateMapper';
import type { BackendState } from './stateMapper';
import type { AppMetadata } from './detailMapper';

export type CTAButton = {
    primary: string;
    secondary?: string;
    primaryDisabled?: boolean;
    secondaryDisabled?: boolean;
};

/**
 * Gets CTA buttons for an app based on its state
 * 
 * @param app - App object with backend state
 * @returns CTA button configuration
 */
export function getCTA(app: BackendState): CTAButton {
    const state = mapState(app);

    switch (state) {
        case 'AVAILABLE':
            return {
                primary: 'Miliki',
                secondary: 'Try',
                primaryDisabled: false,
                secondaryDisabled: false,
            };

        case 'READY':
            return {
                primary: 'Gunakan',
                secondary: undefined,
                primaryDisabled: false,
            };

        case 'ACTIVE':
            return {
                primary: 'Running',
                secondary: undefined,
                primaryDisabled: true,
            };

        case 'UPDATING':
            return {
                primary: 'Updating...',
                secondary: undefined,
                primaryDisabled: true,
            };

        case 'ERROR':
            return {
                primary: 'Fix',
                secondary: 'Retry',
                primaryDisabled: false,
                secondaryDisabled: false,
            };

        default:
            return {
                primary: 'Miliki',
                secondary: 'Try',
            };
    }
}

/**
 * Checks if app has preview capability
 */
export function hasPreview(app: AppMetadata): boolean {
    const manifest = app?.manifest as Record<string, unknown>;
    return !!(manifest?.preview && (manifest.preview as Record<string, unknown>).type !== undefined);
}

/**
 * Gets execution mode for safe execution logic
 */
export function getExecutionMode(app: AppMetadata): 'instant' | 'setup_required' {
    return (app?.execution_mode as 'instant' | 'setup_required') || 'instant';
}

/**
 * Determines if setup flow should be shown
 */
export function needsSetup(app: AppMetadata): boolean {
    return getExecutionMode(app) === 'setup_required';
}
