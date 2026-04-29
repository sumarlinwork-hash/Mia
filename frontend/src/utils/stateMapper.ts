export type AppState = 'UPDATING' | 'ERROR' | 'ACTIVE' | 'READY' | 'AVAILABLE';

export function mapState(app: { is_updating?: boolean, error?: string | null, is_running?: boolean, is_installed?: boolean }): AppState {
  if (app.is_updating) {
    return 'UPDATING';
  }

  if (app.error) {
    return 'ERROR';
  }

  if (app.is_running) {
    return 'ACTIVE';
  }

  if (app.is_installed) {
    return 'READY';
  }

  return 'AVAILABLE';
}

export default mapState;
