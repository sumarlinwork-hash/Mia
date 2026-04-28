// Capability Dictionary - Phase 4.2
// Translates technical capability names to human-readable descriptions
// Used throughout the marketplace for clarity

export const CAPABILITY_DICTIONARY: Record<string, string> = {
    // AI/ML Capabilities
    "llm": "Can generate AI-powered responses",
    "conversation": "Supports interactive conversations",
    "writing": "Generates written content",
    "creative": "Creates original creative content",
    "analysis": "Analyzes data and provides insights",
    "calculation": "Performs mathematical calculations",
    "summarization": "Summarizes long texts into key points",
    "translation": "Translates between languages",

    // Automation Capabilities
    "automation": "Automates repetitive tasks",
    "scheduling": "Manages calendars and schedules",
    "reminders": "Creates and manages reminders",
    "workflow": "Orchestrates multi-step workflows",
    "integration": "Connects with external services",

    // Data Capabilities
    "search": "Searches and retrieves information",
    "data_visualization": "Creates charts and graphs",
    "reporting": "Generates structured reports",
    "analytics": "Provides usage analytics",
    "extraction": "Extracts data from documents",

    // Communication Capabilities
    "email": "Sends and manages emails",
    "messaging": "Handles instant messaging",
    "notifications": "Sends push notifications",
    "voice": "Supports voice interactions",
    "video": "Processes video content",
    "image": "Generates or processes images",

    // File/Document Capabilities
    "document_generation": "Creates documents",
    "pdf_processing": "Reads and creates PDFs",
    "spreadsheet": "Works with spreadsheets",
    "file_management": "Manages file operations",
    "cloud_storage": "Integrates with cloud storage",

    // Development Capabilities
    "code_generation": "Generates code snippets",
    "debugging": "Helps debug code",
    "api_integration": "Connects to APIs",
    "database": "Queries and manages databases",
    "testing": "Creates and runs tests",

    // Business Capabilities
    "crm": "Customer relationship management",
    "project_management": "Manages projects and tasks",
    "invoice": "Creates and manages invoices",
    "expense_tracking": "Tracks expenses",
    "time_tracking": "Tracks time and productivity",

    // Social Media Capabilities
    "social_media": "Manages social media accounts",
    "content_scheduling": "Schedules social posts",
    "engagement": "Monitors social engagement",

    // Research Capabilities
    "web_scraping": "Extracts data from websites",
    "market_research": "Conducts market analysis",
    "competitor_analysis": "Analyzes competitors",
    "trend_detection": "Identifies market trends",

    // Security Capabilities
    "encryption": "Encrypts sensitive data",
    "authentication": "Handles user authentication",
    "audit_logging": "Maintains audit logs",
    "compliance": "Ensures regulatory compliance",
};

/**
 * Translates a technical capability name to human-readable description
 */
export function translateCapability(capability: string): string {
    return CAPABILITY_DICTIONARY[capability] || capability;
}

/**
 * Translates multiple capabilities
 */
export function translateCapabilities(capabilities: string[]): string[] {
    return capabilities.map(translateCapability);
}

/**
 * Gets all capabilities for autocomplete/search
 */
export function getAllCapabilities(): string[] {
    return Object.keys(CAPABILITY_DICTIONARY);
}

/**
 * Searches capabilities by keyword
 */
export function searchCapabilities(keyword: string): string[] {
    const lowerKeyword = keyword.toLowerCase();
    return Object.entries(CAPABILITY_DICTIONARY)
        .filter(([key, value]) =>
            key.toLowerCase().includes(lowerKeyword) ||
            value.toLowerCase().includes(lowerKeyword)
        )
        .map(([key]) => key);
}

export default CAPABILITY_DICTIONARY;
