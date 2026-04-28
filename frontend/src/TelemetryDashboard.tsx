import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, TrendingUp, Zap, Activity, AlertTriangle } from 'lucide-react';

const API = 'http://localhost:8000/api';

interface KPIData {
    total_installs: number;
    total_uninstalls: number;
    total_updates: number;
    total_executions: number;
    total_searches: number;
    installs_7d: number;
    uninstalls_7d: number;
    updates_7d: number;
    installs_24h: number;
    uninstalls_24h: number;
    uninstall_under_24h: number;
    install_success_rate: number;
    update_adoption_rate: number;
    top_installed_items: Array<{ item_id: string; installs: number }>;
    active_tools_7d: number;
}

interface ActivityEvent {
    item_id: string;
    user: string;
    timestamp: string;
    event_type: string;
    reason?: string;
    query?: string;
    results_count?: number;
    from_version?: string;
    to_version?: string;
}

const TelemetryDashboard: React.FC = () => {
    const [kpis, setKpis] = useState<KPIData | null>(null);
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTelemetry = useCallback(async () => {
        try {
            const [kpisRes, activityRes] = await Promise.all([
                fetch(`${API}/discovery/telemetry/kpis`),
                fetch(`${API}/discovery/telemetry/activity?limit=100`),
            ]);
            if (kpisRes.ok) setKpis(await kpisRes.json());
            if (activityRes.ok) setActivity(await activityRes.json());
        } catch (error) {
            console.error('Failed to fetch telemetry:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            if (mounted) {
                await fetchTelemetry();
            }
        };

        loadData();
        const interval = setInterval(fetchTelemetry, 30000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [fetchTelemetry]);

    if (loading) {
        return (
            <div className="px-4 py-8 sm:px-8 max-w-[1480px] mx-auto">
                <div className="text-white/30 font-mono uppercase tracking-widest mb-4">Loading telemetry...</div>
                <div className="w-12 h-12 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="px-4 py-8 sm:px-8 max-w-[1480px] mx-auto">
            <header className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-widest uppercase">
                    <BarChart3 size={14} />
                    Discovery Analytics
                </div>
                <h1 className="mt-3 text-4xl md:text-5xl font-black text-white tracking-tight">Marketplace Telemetry</h1>
                <p className="mt-2 text-white/55 max-w-3xl">
                    Real-time insights into marketplace performance, installation trends, and user engagement.
                </p>
            </header>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
                    <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase tracking-widest">
                        <Download size={14} />
                        Total Installs
                    </div>
                    <div className="text-3xl font-bold text-white mt-2">{kpis?.total_installs || 0}</div>
                    <div className="text-xs text-primary mt-1">{kpis?.installs_7d || 0} this week</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
                    <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase tracking-widest">
                        <Zap size={14} />
                        Success Rate
                    </div>
                    <div className="text-3xl font-bold text-green-400 mt-2">{kpis?.install_success_rate || 0}%</div>
                    <div className="text-xs text-white/40 mt-1">Install conversion</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
                    <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase tracking-widest">
                        <TrendingUp size={14} />
                        Updates
                    </div>
                    <div className="text-3xl font-bold text-yellow-300 mt-2">{kpis?.total_updates || 0}</div>
                    <div className="text-xs text-white/40 mt-1">{kpis?.update_adoption_rate || 0}% adoption</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
                    <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase tracking-widest">
                        <Activity size={14} />
                        Active (7d)
                    </div>
                    <div className="text-3xl font-bold text-blue-400 mt-2">{kpis?.active_tools_7d || 0}</div>
                    <div className="text-xs text-white/40 mt-1">{kpis?.total_executions || 0} executions</div>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="rounded-3xl border border-white/10 bg-black/35 backdrop-blur-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Key Performance Indicators</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Installs (24h)</span>
                            <span className="text-white font-bold">{kpis?.installs_24h || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Uninstalls (24h)</span>
                            <span className="text-error font-bold">{kpis?.uninstalls_24h || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Uninstalls under 24h</span>
                            <span className="text-yellow-300 font-bold">{kpis?.uninstall_under_24h || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Total Searches</span>
                            <span className="text-white font-bold">{kpis?.total_searches || 0}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/10 pt-4">
                            <span className="text-white font-bold">Net Growth (7d)</span>
                            <span className="text-green-400 font-bold">
                                {(kpis?.installs_7d || 0) - (kpis?.uninstalls_7d || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/35 backdrop-blur-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Top Installed Items</h2>
                    <div className="space-y-3">
                        {kpis?.top_installed_items && kpis.top_installed_items.length > 0 ? (
                            kpis.top_installed_items.slice(0, 5).map((item, idx) => (
                                <div key={item.item_id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl font-bold text-white/20">#{idx + 1}</div>
                                        <div>
                                            <div className="text-white font-semibold">{item.item_id}</div>
                                            <div className="text-[11px] text-white/40">Plugin</div>
                                        </div>
                                    </div>
                                    <div className="text-primary font-bold">{item.installs} installs</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-white/40 text-sm">No installation data yet.</div>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/35 backdrop-blur-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                    <div className="text-xs text-white/40">Last 100 events</div>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {activity.length === 0 ? (
                        <div className="text-white/40 text-sm py-8 text-center">No activity recorded yet.</div>
                    ) : (
                        activity.map((event, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.01 }}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`px-2 py-1 rounded-lg text-[11px] uppercase tracking-wider font-bold ${event.event_type === 'installs'
                                            ? 'bg-green-500/20 text-green-400'
                                            : event.event_type === 'uninstalls'
                                                ? 'bg-error/20 text-error'
                                                : event.event_type === 'updates'
                                                    ? 'bg-yellow-400/20 text-yellow-300'
                                                    : event.event_type === 'executions'
                                                        ? 'bg-blue-400/20 text-blue-400'
                                                        : 'bg-white/10 text-white/60'
                                            }`}
                                    >
                                        {event.event_type}
                                    </div>
                                    <div>
                                        <div className="text-white font-semibold text-sm">{event.item_id}</div>
                                        <div className="text-[11px] text-white/40">
                                            {new Date(event.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                {event.event_type === 'searches' && event.query && (
                                    <div className="text-xs text-white/60">Query: "{event.query}" ({event.results_count} results)</div>
                                )}
                                {event.event_type === 'uninstalls' && event.reason && (
                                    <div className="flex items-center gap-1 text-xs text-error">
                                        <AlertTriangle size={12} />
                                        {event.reason}
                                    </div>
                                )}
                                {event.event_type === 'updates' && event.from_version && event.to_version && (
                                    <div className="text-xs text-yellow-300">
                                        {event.from_version} → {event.to_version}
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
};

export default TelemetryDashboard;
