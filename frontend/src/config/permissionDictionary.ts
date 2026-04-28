// Permission Dictionary - Phase 4.3
// Translates technical permission names to human-readable explanations
// Used in detail panels, consent prompts, and setup flows

export const PERMISSION_DICTIONARY: Record<string, string> = {
    // AI/LLM Permissions
    "llm_access": "Can generate AI-powered responses using language models",
    "llm_unlimited": "Unlimited AI usage (may incur costs)",
    "embedding_access": "Can create text embeddings for similarity search",
    "model_selection": "Can switch between different AI models",

    // Data Access Permissions
    "read_memory": "Can access your conversation history",
    "write_memory": "Can save conversations to memory",
    "delete_memory": "Can delete stored memories",
    "read_files": "Can read files from your system",
    "write_files": "Can create and modify files",
    "read_contacts": "Can access your contact list",
    "read_calendar": "Can view your calendar events",
    "write_calendar": "Can create and modify calendar events",

    // External Service Permissions
    "external_api": "Can connect to external services and APIs",
    "internet_access": "Can browse and retrieve information from the internet",
    "webhook_send": "Can send webhooks to external URLs",
    "oauth_access": "Can authenticate with third-party services",

    // Communication Permissions
    "send_email": "Can send emails on your behalf",
    "send_message": "Can send instant messages",
    "send_notification": "Can push notifications to your device",
    "make_call": "Can initiate voice or video calls",

    // Media Permissions
    "camera_access": "Can access your camera",
    "microphone_access": "Can access your microphone",
    "voice_synthesis": "Can generate voice/audio output",
    "image_generation": "Can create and process images",
    "video_processing": "Can process and edit videos",

    // System Permissions
    "filesystem_read": "Can read from your file system",
    "filesystem_write": "Can write to your file system",
    "terminal_exec": "Can execute terminal commands",
    "process_management": "Can manage running processes",
    "environment_read": "Can read environment variables",

    // Payment/Commerce Permissions
    "payment_processing": "Can process payments and transactions",
    "invoice_creation": "Can create and send invoices",
    "subscription_management": "Can manage subscription services",

    // Social Media Permissions
    "social_read": "Can read from social media accounts",
    "social_write": "Can post to social media accounts",
    "social_analytics": "Can access social media analytics",

    // Business Tool Permissions
    "crm_access": "Can access customer relationship data",
    "project_read": "Can view project information",
    "project_write": "Can create and modify projects",
    "task_management": "Can create and manage tasks",

    // Analytics/Telemetry Permissions
    "telemetry_send": "Can send usage analytics data",
    "analytics_read": "Can access analytics and reports",
    "performance_monitoring": "Can monitor system performance",

    // Security Permissions
    "encryption": "Can encrypt and decrypt sensitive data",
    "authentication": "Can authenticate users",
    "token_management": "Can manage authentication tokens",
    "secret_storage": "Can store and retrieve secrets",

    // Advanced Permissions (High Risk)
    "admin_access": "Full administrative access to system",
    "user_impersonation": "Can act on behalf of other users",
    "bulk_operations": "Can perform bulk data operations",
    "data_export": "Can export data in various formats",
};

/**
 * Risk levels for permissions
 */
export const PERMISSION_RISK_LEVELS: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    // Low risk
    "llm_access": "low",
    "read_memory": "low",
    "write_memory": "low",
    "voice_synthesis": "low",
    "image_generation": "low",

    // Medium risk
    "external_api": "medium",
    "internet_access": "medium",
    "send_email": "medium",
    "send_notification": "medium",
    "read_calendar": "medium",
    "write_calendar": "medium",
    "telemetry_send": "medium",

    // High risk
    "filesystem_read": "high",
    "filesystem_write": "high",
    "read_contacts": "high",
    "send_message": "high",
    "social_write": "high",
    "payment_processing": "high",

    // Critical risk
    "terminal_exec": "critical",
    "admin_access": "critical",
    "user_impersonation": "critical",
    "secret_storage": "critical",
    "delete_memory": "critical",
};

/**
 * Translates a technical permission name to human-readable explanation
 */
export function translatePermission(permission: string): string {
    return PERMISSION_DICTIONARY[permission] || permission;
}

/**
 * Translates multiple permissions
 */
export function translatePermissions(permissions: string[]): string[] {
    return permissions.map(translatePermission);
}

/**
 * Gets risk level for a permission
 */
export function getPermissionRiskLevel(permission: string): 'low' | 'medium' | 'high' | 'critical' {
    return PERMISSION_RISK_LEVELS[permission] || 'medium';
}

/**
 * Filters permissions by risk level
 */
export function getPermissionsByRisk(level: 'low' | 'medium' | 'high' | 'critical'): string[] {
    return Object.entries(PERMISSION_RISK_LEVELS)
        .filter(([, risk]) => risk === level)
        .map(([permission]) => permission);
}

/**
 * Checks if permission is high risk
 */
export function isHighRisk(permission: string): boolean {
    const risk = getPermissionRiskLevel(permission);
    return risk === 'high' || risk === 'critical';
}

/**
 * Gets all permissions for autocomplete/search
 */
export function getAllPermissions(): string[] {
    return Object.keys(PERMISSION_DICTIONARY);
}

export default PERMISSION_DICTIONARY;
