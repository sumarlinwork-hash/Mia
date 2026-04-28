// Recommended Section - Phase 2.1
// Personalized recommendations with explainability
// Shows "Because you used X" reasoning

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Star, Download, ArrowRight, CheckCircle2 } from 'lucide-react';

interface RecommendedItem {
    id: string;
    name: string;
    description: string;
    icon?: React.ReactNode;
    rating?: number;
    downloads?: number;
    is_installed?: boolean;
    reason?: string; // Explainability field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface RecommendedSectionProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[]; // From parent catalog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onInstall: (item: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPreview: (item: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onRun: (item: any) => void;
}

const API = 'http://localhost:8000/api';

export function RecommendedSection({ items, onInstall, onPreview, onRun }: RecommendedSectionProps) {
    const [recommended, setRecommended] = useState<RecommendedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId] = useState('current_user'); // In production, use real user ID

    const formatDownloads = React.useCallback((count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
        return `${count}`;
    }, []);

    const getDefaultReason = React.useCallback(() => {
        // Default explainability based on user history
        return 'Popular in your area';
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getTrendingReason = React.useCallback((item: any) => {
        const downloads = (item.downloads as number) || 0;
        if (downloads > 1000) {
            return `🔥 ${formatDownloads(downloads)} users this week`;
        }
        if (downloads > 100) {
            return 'Trending in your category';
        }
        return 'Recently added';
    }, [formatDownloads]);

    const loadTrendingFallback = React.useCallback(() => {
        // Use items with highest engagement as fallback
        const trending = items
            .filter(item => !item.is_installed)
            .sort((a, b) => ((b.downloads as number) || 0) - ((a.downloads as number) || 0))
            .slice(0, 6)
            .map(item => ({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(item as any),
                reason: getTrendingReason(item),
            })) as RecommendedItem[];
        setRecommended(trending);
    }, [items, getTrendingReason]);

    const loadRecommendations = React.useCallback(async () => {
        setLoading(true);
        try {
            // Fetch personalized recommendations
            const res = await fetch(`${API}/discovery/personalization/recommendations?user_id=${userId}&limit=6`);

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setRecommended(data.map((item: any) => ({
                        ...item,
                        reason: item.reason || item.explanation || getDefaultReason(),
                    })) as RecommendedItem[]);
                } else {
                    // Fallback to trending
                    loadTrendingFallback();
                }
            } else {
                loadTrendingFallback();
            }
        } catch {
            loadTrendingFallback();
        } finally {
            setLoading(false);
        }
    }, [userId, loadTrendingFallback, getDefaultReason]);

    useEffect(() => {
        const handle = setTimeout(() => {
            loadRecommendations();
        }, 0);
        return () => clearTimeout(handle);
    }, [loadRecommendations]);


    if (loading) {
        return (
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={18} className="text-primary" />
                    <h2 className="text-xl font-bold text-white">Recommended for You</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="min-w-[280px] h-[180px] rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (recommended.length === 0) {
        return null; // Don't show if empty
    }

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-primary" />
                    <h2 className="text-xl font-bold text-white">Recommended for You</h2>
                </div>
                <button className="inline-flex items-center gap-1 text-sm text-primary font-bold hover:underline">
                    View All
                    <ArrowRight size={14} />
                </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {recommended.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="min-w-[280px] max-w-[280px] rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 hover:border-primary/30 transition-all"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/20">
                                    <Zap size={16} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm truncate">{item.name}</h3>
                                    {item.is_installed && (
                                        <div className="flex items-center gap-1 text-[10px] text-green-400">
                                            <CheckCircle2 size={10} />
                                            Sudah Dimiliki
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-white/60 mb-3 line-clamp-2 h-8">{item.description}</p>

                        {/* Explainability - "Because you used X" */}
                        {item.reason && (
                            <div className="mb-3 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                <p className="text-[10px] text-primary font-medium">{item.reason}</p>
                            </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-3 mb-3 text-[10px] text-white/50">
                            {item.rating && (
                                <div className="flex items-center gap-1">
                                    <Star size={10} className="text-yellow-400" />
                                    {item.rating.toFixed(1)}
                                </div>
                            )}
                            {item.downloads && (
                                <div className="flex items-center gap-1">
                                    <Download size={10} />
                                    {formatDownloads(item.downloads)}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            {item.is_installed ? (
                                <button 
                                    onClick={() => onRun(item)}
                                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white/70 text-xs font-bold hover:bg-white/10 transition-all"
                                >
                                    Gunakan
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => onInstall(item)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-primary text-black text-xs font-bold hover:brightness-110 transition-all"
                                    >
                                        Miliki
                                    </button>
                                    <button
                                        onClick={() => onPreview(item)}
                                        className="px-3 py-2 rounded-lg bg-white/5 text-white/70 text-xs font-bold hover:bg-white/10 transition-all"
                                    >
                                        Coba
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default RecommendedSection;
