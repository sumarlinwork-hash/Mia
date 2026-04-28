// UI Label Mapping Layer - Terminology Reframe
// Translates technical terms to user-friendly language

export const LABELS = {
    // Core terminology
    skill: "Aplikasi",
    skills: "Aplikasi",
    use: "Miliki",
    add_to_ai: "Tambahkan ke AI",
    run: "Gunakan",
    running: "Sedang Berjalan",
    update: "Pembaruan",
    remove: "Hapus",
    uninstall: "Hapus",
    plugin: "Kemampuan",
    mcp: "Integrasi",
    tool: "Fitur",

    // Action verbs
    discover: "Eksplorasi",
    execute: "Jalankan",
    configure: "Atur",

    // Status messages
    installing: "Menambahkan...",
    installed: "Sudah Dimiliki",
    not_installed: "Belum Dimiliki",
} as const;

// Helper function to get label
export function getLabel(key: keyof typeof LABELS): string {
    return LABELS[key];
}

// Component props type for labels
export type LabelKey = keyof typeof LABELS;
