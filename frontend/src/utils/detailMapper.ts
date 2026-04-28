// Detail Panel Mapper
// Transforms raw app data into human-readable structure

import { generateAppDescription, generateWhatItDoes } from './descriptionGenerator';

export interface DetailSection {
    what_it_does: string[];
    works_with: string[];
    trust: {
        score: number;
        level: 'low' | 'medium' | 'high';
        permissions: string[];
        security_level?: string;
        isolation_required?: boolean;
    };
    technical: Record<string, unknown>;
    creator: {
        name: string;
        verified: boolean;
        source: string;
    };
}

export interface AppMetadata {
    id?: string;
    name?: string;
    description?: string;
    category?: string;
    trust_score?: number;
    permissions?: string[];
    security_level?: string;
    isolation_required?: boolean;
    manifest?: Record<string, unknown>;
    publisher?: string;
    author?: string;
    verification?: string;
    source?: string;
    capabilities?: string[];
    execution_mode?: string;
    requires_memory?: boolean;
    requires_voice?: boolean;
    requires_external_api?: boolean;
    mcp_endpoint?: string;
}

/**
 * Maps raw app data to structured detail sections
 */
export function mapDetail(app: AppMetadata): DetailSection {
    return {
        what_it_does: generateWhatItDoes({
            name: app.name || 'Unknown App',
            category: app.category || 'Utility',
            capabilities: app.capabilities || [],
            description: app.description || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            execution_mode: (app.execution_mode as any) || 'instant'
        }),
        works_with: detectIntegrations(app),
        trust: {
            score: app.trust_score || 0,
            level: getTrustLevel(app.trust_score || 0),
            permissions: app.permissions || [],
            security_level: app.security_level || 'low',
            isolation_required: app.isolation_required || false,
        },
        technical: app.manifest || {},
        creator: {
            name: app.publisher || app.author || 'Unknown',
            verified: app.verification === 'verified' || false,
            source: app.source || 'community',
        },
    };
}

/**
 * Generates user-friendly description for app
 */
export function generateAppDetailDescription(app: AppMetadata): string {
    return generateAppDescription({
        name: app.name || 'Unknown App',
        category: app.category || 'Utility',
        capabilities: app.capabilities || [],
        description: app.description || '',
        execution_mode: (app.execution_mode as 'instant' | 'setup_required') || 'instant',
    });
}

/**
 * Detects integrations from app configuration
 */
function detectIntegrations(app: AppMetadata): string[] {
    const integrations: string[] = [];

    if (app.requires_memory) integrations.push('Memory');
    if (app.requires_voice) integrations.push('Voice');
    if (app.requires_external_api) integrations.push('External Tools');
    if (app.mcp_endpoint) integrations.push('MCP Server');

    return integrations;
}

/**
 * Gets trust level from score
 */
function getTrustLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
}

export function getSourceBadge(source: string): { label: string; icon: string } {
    const badges: Record<string, { label: string; icon: string }> = {
        core: { label: 'Built-in', icon: '⚙️' },
        community: { label: 'Community', icon: '🌍' },
        verified: { label: 'Verified Creator', icon: '✅' },
    };

    if (badges[source.toLowerCase()]) return badges[source.toLowerCase()];

    // Federation fallback
    return {
        label: source.length > 12 ? source.substring(0, 10) + '...' : source,
        icon: '🔗'
    };
}
