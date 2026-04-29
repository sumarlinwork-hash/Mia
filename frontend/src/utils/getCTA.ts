import labels from './labels';
import { AppState } from './stateMapper';

export interface CTA {
  primary: string;
  secondary?: string | null;
  disabled: boolean;
}

export function getCTA(state: AppState, hasPreview: boolean = false): CTA {
  switch (state) {
    case 'AVAILABLE':
      return {
        primary: labels.ADD,
        secondary: hasPreview ? labels.TRY : null,
        disabled: false
      };

    case 'READY':
      return {
        primary: labels.USE,
        disabled: false
      };

    case 'ACTIVE':
      return {
        primary: labels.RUNNING,
        disabled: true
      };

    case 'UPDATING':
      return {
        primary: labels.UPDATING,
        disabled: true
      };

    case 'ERROR':
      return {
        primary: labels.FIX,
        secondary: labels.RETRY,
        disabled: false
      };

    default:
      return {
        primary: labels.USE,
        disabled: false
      };
  }
}

export default getCTA;
