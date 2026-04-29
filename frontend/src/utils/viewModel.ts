import capabilityDict from './capabilityDictionary.json';
import permissionDict from './permissionDictionary.json';
import mapState from './stateMapper';
import getCTA from './getCTA';

/**
 * viewModel.ts - Sprint 5
 * Pure functional layer for data normalization and UI-safe representation.
 */

export interface App {
  id: string;
  name: string;
  description: string;
  category?: string;
  is_installed?: boolean;
  is_running?: boolean;
  is_updating?: boolean;
  error?: string | null;
  execution_mode?: 'instant' | 'setup_required';
  has_preview?: boolean;
  capabilities?: string[];
  required_permissions?: string[];
  downloads?: number;
  executions?: number;
  trust_score?: number;
  recommendation_reason?: string;
}

export interface UIApp extends App {
  displayCapabilities: string[];
  displayPermissions: string[];
  displayDescription: string;
  status: string;
  cta: {
    primary: string;
    secondary: string | null;
    disabled: boolean;
  };
}

const translate = (items: string[] | undefined, dict: Record<string, string>): string[] => {
  if (!items) return [];
  return items.map(item => {
    const key = item.toLowerCase();
    return dict[key as keyof typeof dict] || `Fitur ${item}`; // Friendly Fallback
  });
};

const enrichDescription = (name: string, description: string, category: string): string => {
  if (!description || description.length < 20) {
    return `${name} adalah aplikasi ${category || 'pintar'} yang dirancang untuk membantu produktivitas Anda.`;
  }
  return description;
};

export const transform = (app: App): UIApp => {
  const status = mapState(app);
  const cta = getCTA(status, app.has_preview);

  return {
    ...app,
    displayCapabilities: translate(app.capabilities, capabilityDict),
    displayPermissions: translate(app.required_permissions, permissionDict),
    displayDescription: enrichDescription(app.name, app.description, app.category || ''),
    status,
    cta
  };
};

const viewModel = {
  transform
};

export default viewModel;
