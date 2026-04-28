// Trending Section - Phase 2.2
// Shows trending apps with social proof
// Uses trending_score from backend

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Star, Download, CheckCircle2, Crown } from 'lucide-react';

interface TrendingItem {
    id: string;
    name: string;
    description: string;
    category?: string;
    rating?: number;
    downloads?: number;
    is_installed?: boolean;
    trending_score?: number;
    installs_last_7_days?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface TrendingSectionProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onInstall: (item: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPreview: (item: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onRun: (item: any) => void;
}

const API = 'http://localhost:8000/api';
const MIN_INSTALLS = 100; // Threshold for showing real metrics

export function TrendingSection({ items, onInstall, onPreview, onRun }: TrendingSectionProps) {
    const [trending, setTrending] = useState<TrendingItem[]>([]);
    const [loading, setLoading] = useState(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isRecentlyAdded = React.useCallback((item: any) => {
        if (!(item.created_at as string)) return false;
        const created = new Date(item.created_at as string);
        const now = new Date();
        const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff < 7; // Less than 7 days old
    }, []);

    const formatNumber = React.useCallback((num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }, []);

    // Social Proof Threshold Safety - Phase 2.3
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applySocialProofThreshold = React.useCallback((item: any): TrendingItem => {
        const installs = (item.installs_last_7_days as number) || (item.downloads as number) || 0;

        let socialProofLabel: string;
        let socialProofType: 'real' | 'trending' | 'recent' | 'new';

        if (installs >= MIN_INSTALLS) {
            // Show real metrics
            socialProofLabel = `🔥 ${formatNumber(installs)} users this week`;
            socialProofType = 'real';
        } else if (installs >= 50) {
            // Show trending label
            socialProofLabel = '📈 Trending';
            socialProofType = 'trending';
        } else if (isRecentlyAdded(item)) {
            // Show recently added
            socialProofLabel = '✨ Recently added';
            socialProofType = 'recent';
        } else {
            // Default fallback
            socialProofLabel = '🆕 New';
            socialProofType = 'new';
        }

        return {
            ...item,
            installs_last_7_days: installs,
            socialProofLabel,
            socialProofType,
        } as TrendingItem & { socialProofLabel: string; socialProofType: string };
    }, [formatNumber, isRecentlyAdded]);

    const loadFallbackTrending = React.useCallback(() => {
        // Calculate trending from available items
        const calculated = items
            .filter(item => !item.is_installed)
            .map(applySocialProofThreshold)
            .sort((a, b) => {
                // Sort by trending score or downloads
                return ((b.trending_score as number) || (b.downloads as number) || 0) - ((a.trending_score as number) || (a.downloads as number) || 0);
            })
            .slice(0, 8);

        setTrending(calculated);
    }, [items, applySocialProofThreshold]);

    const loadTrending = React.useCallback(async () => {
        setLoading(true);
        try {
            // Fetch trending from backend
            const res = await fetch(`${API}/discovery/personalization/trending?limit=8`);

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setTrending(data.map(applySocialProofThreshold));
                } else {
                    loadFallbackTrending();
                }
            } else {
                loadFallbackTrending();
            }
        } catch {
            loadFallbackTrending();
        } finally {
            setLoading(false);
        }
    }, [applySocialProofThreshold, loadFallbackTrending]);

    useEffect(() => {
        const handle = setTimeout(() => {
            loadTrending();
        }, 0);
        return () => clearTimeout(handle);
    }, [loadTrending]);


    const getBadgeColor = (type: string) => {
        switch (type) {
            case 'real': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'trending': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'recent': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'new': return 'bg-white/10 text-white/60 border-white/20';
            default: return 'bg-white/10 text-white/60 border-white/20';
        }
    };

    if (loading) {
        return (
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-orange-400" />
                    <h2 className="text-xl font-bold text-white">Trending This Week</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-[160px] rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (trending.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-orange-400" />
                    <h2 className="text-xl font-bold text-white">Trending This Week</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {trending.map((item, index) => {
                    const itemWithProof = item as TrendingItem & { socialProofLabel?: string; socialProofType?: string };

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 hover:border-orange-400/30 transition-all group"
                        >
                            {/* Rank badge */}
                            {index < 3 && (
                                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-xs font-black text-black">
                                    {index + 1}
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-orange-500/20">
                                    {index === 0 ? (
                                        <Crown size={16} className="text-orange-400" />
                                    ) : (
                                        <Zap size={16} className="text-orange-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold text-sm truncate">{item.name}</h3>
                                    {item.category && (
                                        <div className="text-[10px] text-white/50 uppercase tracking-wider">{item.category}</div>
                                    )}
                                </div>
                            </div>

                            {/* Social Proof Badge */}
                            {itemWithProof.socialProofLabel && (
                                <div className={`mb-3 px-2 py-1.5 rounded-lg border text-[10px] font-bold ${getBadgeColor(itemWithProof.socialProofType || 'new')}`}>
                                    {itemWithProof.socialProofLabel}
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
                                        {formatNumber(item.downloads)}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {item.is_installed ? (
                                <button 
                                    onClick={() => onRun(item)}
                                    className="w-full px-3 py-2 rounded-lg bg-white/5 text-white/70 text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1"
                                >
                                    <CheckCircle2 size={12} />
                                    Gunakan
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onInstall(item)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-400 to-yellow-400 text-black text-xs font-bold hover:brightness-110 transition-all"
                                    >
                                        Miliki
                                    </button>
                                    <button
                                        onClick={() => onPreview(item)}
                                        className="px-3 py-2 rounded-lg bg-white/5 text-white/70 text-xs font-bold hover:bg-white/10 transition-all"
                                    >
                                        Coba
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

export default TrendingSection;
