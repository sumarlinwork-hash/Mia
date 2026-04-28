// State Abstraction Layer
// Maps complex backend states to simplified frontend states

export type BackendState = {
    is_installed?: boolean;
    is_running?: boolean;
    is_updating?: boolean;
    has_error?: boolean;
    error_message?: string;
};

export type FrontendState =
    | 'AVAILABLE'
    | 'READY'
    | 'ACTIVE'
    | 'UPDATING'
    | 'ERROR';

/**
 * Maps backend app state to simplified frontend state
 * 
 * @param app - App object with backend state properties
 * @returns Simplified frontend state
 */
export function mapState(app: BackendState): FrontendState {
    // Check error state first
    if (app.has_error) {
        return 'ERROR';
    }

    // Check updating state
    if (app.is_updating) {
        return 'UPDATING';
    }

    // Check if app is currently running
    if (app.is_running) {
        return 'ACTIVE';
    }

    // Check if app is installed
    if (app.is_installed) {
        return 'READY';
    }

    // Default: app is available but not installed
    return 'AVAILABLE';
}

/**
 * Gets human-readable label for state
 */
export function getStateLabel(state: FrontendState): string {
    const labels: Record<FrontendState, string> = {
        AVAILABLE: 'Available',
        READY: 'Ready to use',
        ACTIVE: 'Currently running',
        UPDATING: 'Updating...',
        ERROR: 'Error occurred',
    };
    return labels[state];
}
