// Description Generator - Phase 4.4
// Generates human-readable app descriptions from manifest data
// Combines category, capabilities, and usage examples

import { translateCapability } from '../config/capabilityDictionary';

export interface AppDescriptionInput {
    name: string;
    category?: string;
    capabilities?: string[];
    description?: string;
    permissions?: string[];
    execution_mode?: 'instant' | 'setup_required';
}

/**
 * Generates a compelling app description from manifest data
 */
export function generateAppDescription(input: AppDescriptionInput): string {
    const { name, category, capabilities = [], description, execution_mode } = input;

    // If custom description exists, enhance it rather than replace
    if (description && description.length > 20) {
        return description;
    }

    // Generate from capabilities
    const capabilityTexts = capabilities.slice(0, 3).map(cap => {
        const translated = translateCapability(cap);
        return translated.toLowerCase();
    });

    if (capabilityTexts.length === 0) {
        return `${name} - A powerful ${category?.toLowerCase() || 'AI'} tool to enhance your workflow.`;
    }

    // Build description based on capabilities
    let descriptionText: string;

    if (capabilityTexts.length === 1) {
        descriptionText = `${name} ${capabilityTexts[0]}.`;
    } else if (capabilityTexts.length === 2) {
        descriptionText = `${name} ${capabilityTexts[0]} and ${capabilityTexts[1]}.`;
    } else {
        descriptionText = `${name} ${capabilityTexts.slice(0, -1).join(', ')}, and ${capabilityTexts[capabilityTexts.length - 1]}.`;
    }

    // Add execution mode context
    if (execution_mode === 'instant') {
        descriptionText += ' Start using it immediately - no setup required.';
    }

    return descriptionText;
}

/**
 * Generates a short tagline for app cards
 */
export function generateTagline(input: AppDescriptionInput): string {
    const { category, capabilities = [] } = input;

    if (capabilities.length === 0) {
        return category || 'AI Tool';
    }

    // Use first capability as tagline
    const primaryCapability = translateCapability(capabilities[0]);
    return primaryCapability.split(' ').slice(0, 4).join(' ');
}

/**
 * Generates feature highlights for detail panel
 */
export function generateFeatureHighlights(input: AppDescriptionInput): string[] {
    const { capabilities = [] } = input;
    const highlights: string[] = [];

    // Add capability-based features
    capabilities.slice(0, 5).forEach(cap => {
        highlights.push(translateCapability(cap));
    });

    return highlights.length > 0 ? highlights : ['AI-powered functionality'];
}

/**
 * Generates "What this app does" section content
 */
export function generateWhatItDoes(input: AppDescriptionInput): string[] {
    const { capabilities = [] } = input;

    if (capabilities.length === 0) {
        return ['Provides AI-powered assistance'];
    }

    return capabilities.map(cap => translateCapability(cap));
}

/**
 * Gets category display name
 */
export function getCategoryDisplayName(category?: string): string {
    const categoryMap: Record<string, string> = {
        'productivity': 'Productivity',
        'business': 'Business Tools',
        'creative': 'Creative & Design',
        'developer': 'Developer Tools',
        'communication': 'Communication',
        'analytics': 'Analytics & Data',
        'automation': 'Automation',
        'education': 'Education & Learning',
        'marketing': 'Marketing & Social',
        'finance': 'Finance & Accounting',
        'general': 'General Tools',
    };

    const key = category?.toLowerCase();
    return (key && categoryMap[key]) || category || 'General Tools';
}

/**
 * Creates a complete app summary object
 */
export function generateAppSummary(input: AppDescriptionInput) {
    return {
        name: input.name,
        tagline: generateTagline(input),
        description: generateAppDescription(input),
        category: getCategoryDisplayName(input.category),
        features: generateFeatureHighlights(input),
        whatItDoes: generateWhatItDoes(input),
        isInstant: input.execution_mode === 'instant',
    };
}

export default generateAppDescription;
