// Translator Utility - Sprint 5
// Maps technical keys to user-friendly labels

const CAPABILITY_MAP: Record<string, string> = {
    "llm": "AI Reasoning & Text Generation",
    "conversation": "Natural Dialogue & Chat",
    "analysis": "Data Analysis & Insight Extraction",
    "calculation": "Mathematical & Logical Calculations",
    "writing": "Content Creation & Editing",
    "creative": "Creative Ideation & Brainstorming",
    "automation": "Workflow Automation",
    "external_api": "External Service Integration",
    "search": "Web & Knowledge Search",
    "vision": "Image & Visual Recognition",
    "audio": "Audio Processing & Speech",
    "planning": "Task Planning & Execution"
};

const PERMISSION_MAP: Record<string, string> = {
    "llm_access": "Interact with AI Brain",
    "external_api": "Connect to external websites/services",
    "file_read": "Read your local files",
    "file_write": "Modify or create local files",
    "os_control": "Perform actions on your operating system",
    "screenshot": "Take screenshots of your screen",
    "terminal": "Run commands in your terminal",
    "user_info": "Access your basic profile information",
    "history_read": "Read your conversation history",
    "internet": "Access the public internet"
};

/**
 * Translates a technical capability tag into a user-friendly label
 */
export function translateCapability(cap: string): string {
    return CAPABILITY_MAP[cap.toLowerCase()] || cap;
}

/**
 * Translates a technical permission key into a user-friendly label
 */
export function translatePermission(perm: string): string {
    return PERMISSION_MAP[perm.toLowerCase()] || perm;
}

/**
 * Translates a list of capabilities
 */
export function translateCapabilities(caps: string[]): string[] {
    return (caps || []).map(translateCapability);
}

/**
 * Translates a list of permissions
 */
export function translatePermissions(perms: string[]): string[] {
    return (perms || []).map(translatePermission);
}
