// Preview Modal - Phase 3.5
// Semi-dynamic preview system with cost control
// Allows users to "Try" apps before installing

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Sparkles, Zap, Clock, AlertCircle } from 'lucide-react';

interface PreviewModalProps {
    appId: string;
    appName: string;
    previewConfig?: {
        type?: string;
        mode?: 'static' | 'template' | 'light_llm';
        template?: string;
    };
    onClose: () => void;
    onInstall?: () => void;
}

interface PreviewState {
    loading: boolean;
    error: string | null;
    response: string | null;
    requestCount: number;
    mode: 'static' | 'template' | 'light_llm';
}

const API = 'http://localhost:8000/api';
const MAX_LLM_REQUESTS = 5; // Rate limit per session

export function PreviewModal({ appId, appName, previewConfig, onClose, onInstall }: PreviewModalProps) {
    const [userInput, setUserInput] = useState('');
    const [previewState, setPreviewState] = useState<PreviewState>({
        loading: false,
        error: null,
        response: null,
        requestCount: 0,
        mode: previewConfig?.mode || 'static',
    });

    const mode = previewState.mode;
    const isLLMLimited = mode === 'light_llm' && previewState.requestCount >= MAX_LLM_REQUESTS;

    const getStaticResponse = React.useCallback(() => {
        const template = previewConfig?.template || 'default';

        const responses: Record<string, string> = {
            chatbot_demo: "Halo! Aku asisten AI kamu. Kamu bisa tanya apa saja, dan aku akan bantu semampuku. Coba tanya sesuatu!",
            story_generator: "Dahulu kala, di dunia di mana AI bisa menulis segalanya... [Ini pratinjau. Miliki untuk cerita lengkap!]",
            analytics_sample: "Sampel Laporan Analitik:\n\n• Total Pengguna: 1.234\n• Tingkat Pertumbuhan: +15%\n• Engagement: 78%\n\n[Miliki untuk data live]",
            automation_preview: "Pratinjau Alur Kerja:\n\n1. Pemicu: Email baru diterima\n2. Tindakan: Ekstrak lampiran\n3. Output: Simpan ke penyimpanan awan\n\n[Miliki untuk mengaktifkan]",
            default: `Ini adalah pratinjau dari ${appName}. Miliki aplikasi ini untuk membuka fungsionalitas penuh.`,
        };

        return responses[template] || responses.default;
    }, [appName, previewConfig?.template]);

    const loadStaticPreview = React.useCallback(() => {
        setPreviewState(prev => ({
            ...prev,
            response: getStaticResponse(),
        }));
    }, [getStaticResponse]);

    // Load static preview on mount
    useEffect(() => {
        if (mode === 'static') {
            const handle = setTimeout(() => {
                loadStaticPreview();
            }, 0);
            return () => clearTimeout(handle);
        }
    }, [mode, loadStaticPreview]);

    const handlePreviewSubmit = async () => {
        if (!userInput.trim()) return;

        if (mode === 'light_llm' && previewState.requestCount >= MAX_LLM_REQUESTS) {
            setPreviewState(prev => ({
                ...prev,
                error: `Preview limit reached (${MAX_LLM_REQUESTS} attempts). Install the app for unlimited use!`,
            }));
            return;
        }

        setPreviewState(prev => ({
            ...prev,
            loading: true,
            error: null,
        }));

        try {
            const response = await fetch(`${API}/discovery/preview/${appId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_input: userInput,
                    mode: mode,
                    template: previewConfig?.template,
                }),
            });

            if (!response.ok) {
                throw new Error('Preview request failed');
            }

            const data = await response.json();

            setPreviewState(prev => ({
                ...prev,
                loading: false,
                response: data.response || data.output || 'Preview response generated.',
                requestCount: mode === 'light_llm' ? prev.requestCount + 1 : prev.requestCount,
            }));

            setUserInput('');
        } catch {
            // Fallback to template/static if LLM fails
            setPreviewState(prev => ({
                ...prev,
                loading: false,
                error: null,
                response: getFallbackResponse(),
                mode: mode === 'light_llm' ? 'template' : prev.mode,
            }));
        }
    };

    const getFallbackResponse = () => {
        return `Mode Pratinjau: ${appName} demo berjalan dengan template ringan.\n\nMiliki untuk fungsionalitas penuh bertenaga AI!`;
    };

    const getModeLabel = () => {
        switch (mode) {
            case 'static':
                return { icon: <Zap size={12} />, text: 'Instant Preview', color: 'text-green-400' };
            case 'template':
                return { icon: <Clock size={12} />, text: 'Template Mode', color: 'text-blue-400' };
            case 'light_llm':
                return {
                    icon: <Sparkles size={12} />,
                    text: `AI Preview (${MAX_LLM_REQUESTS - previewState.requestCount} left)`,
                    color: 'text-primary',
                };
            default:
                return { icon: <Zap size={12} />, text: 'Preview', color: 'text-white/60' };
        }
    };

    const modeLabel = getModeLabel();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-black max-h-[85vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-primary" />
                                <span className="text-xs uppercase tracking-widest text-primary font-bold">Preview Mode</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white">Try {appName}</h3>
                            <p className="text-white/60 text-sm mt-1">Test before you install - no commitment</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Mode indicator */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 ${modeLabel.color}`}>
                        {modeLabel.icon}
                        <span className="text-xs font-bold">{modeLabel.text}</span>
                    </div>

                    {isLLMLimited && (
                        <div className="mt-3 p-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={14} className="text-yellow-400 mt-0.5" />
                                <div className="text-yellow-400 text-sm">
                                    Kamu sudah menggunakan semua {MAX_LLM_REQUESTS} batas pratinjau. Miliki aplikasi ini untuk lanjut menggunakannya!
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Response display */}
                    <div className="mb-4 min-h-[300px] rounded-2xl border border-white/10 bg-black/40 p-5">
                        {previewState.loading ? (
                            <div className="flex items-center justify-center h-40">
                                <div className="text-center">
                                    <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                    <div className="text-white/60 text-sm">Generating preview...</div>
                                </div>
                            </div>
                        ) : previewState.error ? (
                            <div className="text-red-400 text-sm">{previewState.error}</div>
                        ) : previewState.response ? (
                            <div className="whitespace-pre-wrap text-white/80 text-sm leading-relaxed">
                                {previewState.response}
                            </div>
                        ) : (
                            <div className="text-white/40 text-center py-20">
                                <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
                                <div className="text-sm">
                                    {mode === 'static' ? 'Preview loaded. Try customizing below!' : 'Enter a prompt to test this app'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input area (only for non-static modes) */}
                    {mode !== 'static' && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handlePreviewSubmit()}
                                placeholder={mode === 'light_llm' ? "Ask anything..." : "Test with custom input..."}
                                disabled={isLLMLimited}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                onClick={handlePreviewSubmit}
                                disabled={previewState.loading || isLLMLimited || !userInput.trim()}
                                className={`px-4 py-3 rounded-xl transition-all ${previewState.loading || isLLMLimited || !userInput.trim()
                                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                    : 'bg-primary text-black hover:brightness-110'
                                    }`}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    )}

                    {mode === 'static' && (
                        <div className="text-center text-white/50 text-xs">
                            This is a static preview. Install the app for interactive functionality.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-white/5 text-white/70 font-bold hover:bg-white/10 transition-all"
                        >
                            Nanti Saja
                        </button>
                        <button
                            onClick={onInstall}
                            className="flex-1 px-5 py-2.5 rounded-xl bg-primary text-black font-bold hover:brightness-110 transition-all"
                        >
                            Miliki Sekarang
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default PreviewModal;
