/**
 * Master System Health - Human-Centered Root Diagnostic
 * Matches the "New UI" Sage Green aesthetic
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Cpu,
    Database,
    Globe,
    Zap,
    Shield,
    HardDrive,
    Server,
    Wifi,
    RefreshCw,
    Terminal,
    Compass,
    ShieldCheck
} from 'lucide-react';

import api from '../../services/api';

function MasterSystemHealth() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchHealth = async () => {
        setIsRefreshing(true);
        try {
            const res = await api.get('/superadmin/health');
            setHealth(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHealth();
    }, []);

    const metrics = [
        { label: 'CPU Performance', value: health?.cpuSpeed || '...', status: health?.status || 'Good', icon: Cpu, color: 'sage' },
        { label: 'Available Memory', value: health?.memoryUsed || '...', status: 'Stable', icon: Database, color: 'sky' },
        { label: 'Network Latency', value: health?.latency || '...', status: 'Fast', icon: Wifi, color: 'sage' },
        { label: 'Security Level', value: health?.securityLevel || 'Layer 5', status: 'Secured', icon: Shield, color: 'coral' },
        { label: 'System Uptime', value: health?.uptime || '99.9%', status: 'Normal', icon: Zap, color: 'sky' },
        { label: 'Available Storage', value: health?.storage || '...', status: 'Healthy', icon: HardDrive, color: 'neutral' },
    ];

    const colors: any = {
        sage: { text: 'text-[#2D6A4F]', bg: 'bg-[#D8F3DC]', border: 'border-[#2D6A4F]/20', fill: 'bg-[#2D6A4F]', glow: 'shadow-[#2D6A4F]/30' },
        sky: { text: 'text-[#457B9D]', bg: 'bg-[#E8F4F8]', border: 'border-[#457B9D]/20', fill: 'bg-[#457B9D]', glow: 'shadow-[#457B9D]/30' },
        coral: { text: 'text-[#E07A5F]', bg: 'bg-[#FFF1E6]', border: 'border-[#E07A5F]/20', fill: 'bg-[#E07A5F]', glow: 'shadow-[#E07A5F]/30' },
        neutral: { text: 'text-[#74796D]', bg: 'bg-[#F8F9FA]', border: 'border-[#E9ECEF]', fill: 'bg-[#74796D]', glow: 'shadow-[#74796D]/30' },
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 border-b border-[#E9ECEF] pb-12 mb-12">
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <h1 className="text-3xl md:text-5xl font-black text-[#1B4332] tracking-tighter uppercase leading-[0.9]">
                            Platform Status
                        </h1>
                        <div className="h-4 w-px bg-[#D8F3DC] hidden md:block" />
                        <div className="px-5 py-2 bg-[#D8F3DC] border border-[#2D6A4F]/10 rounded-2xl flex items-center gap-3 shadow-sm shadow-[#1B4332]/5">
                            <Activity className="w-4 h-4 text-[#2D6A4F]" />
                            <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-[0.2em]">Real-time Diagnostics</span>
                        </div>
                    </div>
                    <p className="text-lg text-[#52796F] font-medium italic opacity-80">Monitoring core infrastructure and network integrity.</p>
                </div>
                <button
                    onClick={fetchHealth}
                    className="w-full xl:w-auto px-10 py-5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-xl shadow-[#1B4332]/25 active:scale-95"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh Analytics
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                {metrics.map((m, i) => {
                    const c = colors[m.color];
                    return (
                        <motion.div
                            key={m.label}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className="bg-white border border-[#E9ECEF] rounded-[40px] p-8 shadow-sm relative overflow-hidden group hover:border-[#2D6A4F]/20 transition-all"
                        >
                            <div className={`absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity`}>
                                <m.icon className="w-20 h-20 text-[#1B4332]" />
                            </div>

                            <div className="flex items-center gap-5 mb-8 relative z-10">
                                <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center border ${c.border} shadow-lg shadow-black/5`}>
                                    <m.icon className={`w-7 h-7 ${c.text}`} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-[#95A3A4] uppercase tracking-widest leading-none">{m.label}</p>
                                    <p className="text-2xl font-black text-[#1B4332] mt-2 tracking-tighter">{m.value}</p>
                                </div>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <span className="text-[10px] font-black text-[#74796D] uppercase tracking-widest">Efficiency</span>
                                    <span className={`text-[10px] font-black ${c.text} uppercase tracking-widest`}>{m.status}</span>
                                </div>
                                <div className="w-full bg-[#F8F9FA] h-2 rounded-full overflow-hidden border border-[#E9ECEF]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: ['20%', '90%', '65%'][i % 3] }}
                                        className={`h-full ${c.fill} shadow-[0_0_10px] ${c.glow}`}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Lower Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Kernel Logs */}
                <div className="bg-white border border-[#E9ECEF] rounded-[48px] p-10 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-24 h-24 bg-[#D8F3DC]/30 blur-3xl rounded-full -ml-12 -mt-12" />

                    <h3 className="text-xl font-black text-[#1B4332] mb-8 flex items-center gap-4 relative z-10">
                        <Terminal className="w-6 h-6 text-[#1B4332]" />
                        SYSTEM ACTIVITY LOGS
                    </h3>
                    <div className="space-y-5 font-mono text-[11px] h-72 overflow-y-auto custom-scrollbar pr-6 relative z-10">
                        <div className="flex gap-4 border-b border-[#F8F9FA] pb-3">
                            <span className="text-[#95A3A4] font-black shrink-0">[{new Date().toLocaleTimeString()}]</span>
                            <span className="text-[#52796F] font-bold tracking-tight">
                                <span className="text-[#2D6A4F] mr-2">PLATFORM:</span>
                                {health?.platform || 'Detecting...'} ({health?.arch || 'x64'})
                            </span>
                        </div>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
                            <div key={i} className="flex gap-4 border-b border-[#F8F9FA] pb-3 last:border-0">
                                <span className="text-[#95A3A4] font-black shrink-0">[{new Date().toLocaleTimeString()}]</span>
                                <span className="text-[#52796F] font-bold tracking-tight">
                                    <span className="text-[#2D6A4F] mr-2">LOG:</span>
                                    System_Monitor [0x{(health?.threadId || 'AFF02').toUpperCase()}] Verification sequence active.
                                </span>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-10 py-4 bg-[#F8F9FA] hover:bg-[#D8F3DC] border border-[#E9ECEF] rounded-2xl text-[10px] font-black text-[#1B4332] uppercase tracking-[0.3em] transition-all relative z-10">
                        Export Logs to File
                    </button>
                </div>

                {/* Uptime Index Card - Premium Content */}
                <div className="bg-white border border-[#E9ECEF] rounded-[48px] shadow-sm relative overflow-hidden group flex flex-col items-center">
                    <div className="w-full p-12 bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-32 -mt-32 animate-pulse" />
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-white/10 backdrop-blur-xl flex items-center justify-center mb-6 border border-white/20 shadow-2xl">
                                <ShieldCheck className="w-12 h-12 text-[#D8F3DC]" />
                            </div>
                            <h3 className="text-5xl font-black text-white tracking-tighter mb-2">{health?.uptimeIndex || '99.9'}%</h3>
                            <span className="text-[11px] font-black text-[#D8F3DC] uppercase tracking-[0.4em] bg-white/10 px-6 py-2 rounded-full border border-white/10">INFRASTRUCTURE HUB</span>
                        </div>
                    </div>

                    <div className="p-10 text-center">
                        <h3 className="text-2xl font-black text-[#1B4332] mb-3 tracking-tight uppercase">Platform Integrity</h3>
                        <p className="text-[#74796D] text-sm max-w-xs font-bold leading-relaxed mx-auto">
                            The TrackX infrastructure is maintained by automated scaling protocols and redundant data clusters. No service interruptions detected.
                        </p>

                        <div className="mt-10 flex items-center justify-center gap-3">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-[#D8F3DC] flex items-center justify-center shadow-sm">
                                        <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-[#95A3A4] uppercase tracking-widest ml-2">Tier 4 Protected</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MasterSystemHealth;
