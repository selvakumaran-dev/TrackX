/**
 * Master Admin Dashboard - Command Center (Human-Centered)
 * Matches the "New UI" Sage Green aesthetic
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Building2,
    Bus,
    Globe,
    TrendingUp,
    Zap,
    RefreshCw,
    Activity,
    Shield,
    CheckCircle2,
    ArrowRight,
    ShieldCheck,
    Settings,
    Plus
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface GlobalStats {
    totalOrganizations: number;
    totalAdmins: number;
    totalDrivers: number;
    totalBuses: number;
    onlineBuses: number;
    offlineBuses: number;
    systemHealth: number;
    trends: {
        organizations: number;
        admins: number;
        buses: number;
    };
    lastUpdated: string;
}

interface TrendData {
    date: string;
    organizations: number;
    drivers: number;
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
    const themes: any = {
        sage: 'bg-emerald-50 border-emerald-100 text-emerald-700',
        sky: 'bg-blue-50 border-blue-100 text-blue-700',
        coral: 'bg-orange-50 border-orange-100 text-orange-700',
        neutral: 'bg-slate-50 border-slate-100 text-slate-700',
    };

    return (
        <motion.div
            whileHover={{ y: -6, shadow: '0 25px 50px -12px rgba(27,67,50,0.12)' }}
            className="bg-white rounded-[32px] border border-[#E9ECEF] p-8 shadow-sm transition-all relative overflow-hidden group"
        >
            <div className={`absolute top-0 left-0 w-2 h-full ${themes[color].split(' ')[2].replace('text-', 'bg-')} opacity-40`} />

            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-[#95A3A4] text-[10px] font-black uppercase tracking-[0.25em] mb-4">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-4xl font-black text-[#1B4332] tracking-tighter">{value}</h3>
                        {trend === 'Live' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2" />}
                    </div>
                    {trend && trend !== 'Live' && (
                        <div className="flex items-center gap-2 mt-4 bg-emerald-50 w-fit px-2.5 py-1 rounded-full border border-emerald-100">
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase">+{trend}% Growth</span>
                        </div>
                    )}
                </div>
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-inner transition-all group-hover:rotate-6 ${themes[color]}`}>
                    <Icon className="w-8 h-8" />
                </div>
            </div>
        </motion.div>
    );
}

function MasterDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [statsRes, trendsRes, activityRes] = await Promise.all([
                api.get('/superadmin/stats'),
                api.get('/superadmin/trends'),
                api.get('/superadmin/activity')
            ]);
            setStats(statsRes.data.data || null);
            setTrends(trendsRes.data.data || []);
            setActivities(activityRes.data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="relative">
                    <div className="w-16 h-16 border-[6px] border-[#D8F3DC] rounded-full" />
                    <div className="absolute inset-0 border-t-[6px] border-[#2D6A4F] rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Intel Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-3 bg-[#D8F3DC] w-fit px-3 py-1 rounded-full border border-[#2D6A4F]/10">
                        <Shield className="w-3.5 h-3.5 text-[#2D6A4F]" />
                        <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-widest">Secured Administration</span>
                    </div>
                    <h1 className="text-5xl font-black text-[#1B4332] tracking-tighter">Dashboard Overview</h1>
                    <p className="text-[#52796F] mt-2 font-medium text-lg italic">"Monitoring all institutions and connected buses."</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white border border-[#E9ECEF] rounded-2xl px-6 py-3 shadow-sm flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-[#2D6A4F] animate-pulse" />
                        <div>
                            <p className="text-[9px] text-[#74796D] font-black uppercase tracking-widest">Core Status</p>
                            <p className="text-[#1B4332] font-black text-xs uppercase tracking-tight">System Optimized</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchData()}
                        className="p-4 bg-white hover:bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl transition-all shadow-sm group"
                    >
                        <RefreshCw className="w-5 h-5 text-[#2D6A4F] group-active:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Total Clients', value: stats?.totalOrganizations || '0', icon: Building2, trend: stats?.trends?.organizations || 0, color: 'sage' },
                    { title: 'Registered Staff', value: stats?.totalAdmins || '0', icon: ShieldCheck, trend: stats?.trends?.admins || 0, color: 'sky' },
                    { title: 'Active Buses', value: stats?.totalBuses || '0', icon: Bus, trend: stats?.trends?.buses || 0, color: 'coral' },
                    { title: 'Service Health', value: `${stats?.systemHealth || 0}%`, icon: Zap, trend: 'Live', color: 'neutral' },
                ].map((card, index) => (
                    <StatCard
                        key={index}
                        title={card.title}
                        value={card.value}
                        icon={card.icon}
                        trend={card.trend}
                        color={card.color}
                    />
                ))}
            </div>

            {/* Quick Actions - The "Simple and Useful" Feature */}
            <div className="bg-white rounded-[40px] border border-[#E9ECEF] p-8 lg:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFF1E6]/30 blur-[100px] -mr-32 -mt-32 rounded-full" />
                <h2 className="text-2xl font-black text-[#1B4332] mb-8 flex items-center gap-3 relative z-10">
                    <Zap className="w-6 h-6 text-[#E07A5F]" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <button
                        onClick={() => navigate('/superadmin/organizations')}
                        className="flex items-center gap-4 p-5 rounded-3xl bg-[#F8F9FA] hover:bg-[#D8F3DC] border border-[#E9ECEF] transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6 text-[#2D6A4F]" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black text-[#1B4332] uppercase tracking-tight">Add Institute</p>
                            <p className="text-[10px] text-[#74796D] font-bold">Enroll a new campus</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/superadmin/system')}
                        className="flex items-center gap-4 p-5 rounded-3xl bg-[#F8F9FA] hover:bg-[#E8F4F8] border border-[#E9ECEF] transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <Activity className="w-6 h-6 text-[#457B9D]" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black text-[#1B4332] uppercase tracking-tight">System Status</p>
                            <p className="text-[10px] text-[#74796D] font-bold">Check platform health</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/superadmin/settings')}
                        className="flex items-center gap-4 p-5 rounded-3xl bg-[#F8F9FA] hover:bg-[#E9ECEF] border border-[#E9ECEF] transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <Settings className="w-6 h-6 text-[#74796D]" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black text-[#1B4332] uppercase tracking-tight">Settings</p>
                            <p className="text-[10px] text-[#74796D] font-bold">Configure options</p>
                        </div>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Growth Analytics */}
                <div className="lg:col-span-2 bg-white rounded-[40px] border border-[#E9ECEF] p-8 lg:p-10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-2xl font-black text-[#1B4332] flex items-center gap-3">
                                <Activity className="w-6 h-6 text-[#2D6A4F]" />
                                Infrastructure Growth
                            </h2>
                            <p className="text-[10px] text-[#74796D] font-bold uppercase tracking-[0.2em] mt-2 ml-9">Platform Usage Trends - Last 30 Days</p>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-[#1B4332]" />
                                <span className="text-[10px] font-black text-[#52796F] uppercase tracking-widest">Fleet</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-[#D8F3DC] border border-[#2D6A4F]/40" />
                                <span className="text-[10px] font-black text-[#52796F] uppercase tracking-widest">Staff</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends}>
                                <defs>
                                    <linearGradient id="colorOrg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1B4332" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#1B4332" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDriver" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.05} />
                                        <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9ECEF" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#95A3A4"
                                    tick={{ fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(str) => str.split('-').slice(1).join('/')}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#95A3A4"
                                    tick={{ fontSize: 10, fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E9ECEF', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 700 }}
                                />
                                <Area type="monotone" dataKey="organizations" stroke="#1B4332" strokeWidth={4} fillOpacity={1} fill="url(#colorOrg)" />
                                <Area type="monotone" dataKey="drivers" stroke="#2D6A4F" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorDriver)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Event Matrix */}
                <div className="bg-white rounded-[40px] border border-[#E9ECEF] p-8 shadow-sm">
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-[#1B4332] flex items-center gap-3">
                            <Zap className="w-6 h-6 text-[#E07A5F]" />
                            Recent Activity
                        </h2>
                        <p className="text-[10px] text-[#74796D] font-bold uppercase tracking-[0.2em] mt-2 ml-9">Live updates from the system</p>
                    </div>

                    <div className="space-y-4">
                        {activities.map((log, i) => {
                            const Icon = log.icon === 'Building2' ? Building2 : log.icon === 'User' ? Users : Bus;
                            return (
                                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-[#F8F9FA] border border-[#E9ECEF] hover:bg-white transition-all group">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-[#E9ECEF] shadow-sm transform group-hover:rotate-12 transition-transform">
                                        <Icon className="w-5 h-5 text-[#2D6A4F]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-black text-[#1B4332] tracking-tight">{log.event}</p>
                                            <span className="text-[9px] font-black text-[#95A3A4] group-hover:text-emerald-500 transition-colors uppercase tracking-widest">
                                                {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="w-full bg-[#E9ECEF] h-1 rounded-full mt-2.5 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '100%' }}
                                                transition={{ duration: 2, delay: i * 0.1 }}
                                                className="h-full bg-gradient-to-r from-transparent to-[#D8F3DC]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {activities.length === 0 && (
                            <p className="text-center text-[#95A3A4] text-xs font-bold uppercase tracking-widest py-10">No recent activity detected</p>
                        )}
                    </div>

                    <button className="w-full mt-8 py-4 bg-[#F8F9FA] hover:bg-[#D8F3DC] border border-[#E9ECEF] rounded-2xl text-[10px] font-black text-[#1B4332] uppercase tracking-[0.2em] transition-all">
                        View Audit Logs
                    </button>
                </div>
            </div>

            {/* Daily Monitoring Matrix - Premium Replacement for Map */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[48px] border border-[#E9ECEF] p-8 lg:p-14 shadow-sm relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#D8F3DC]/10 blur-[130px] rounded-full -mr-64 -mt-64" />

                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row items-start justify-between gap-12">
                        <div className="max-w-xl">
                            <div className="flex items-center gap-3 px-4 py-2 bg-[#D8F3DC] w-fit rounded-full border border-[#2D6A4F]/10 mb-8">
                                <Activity className="w-3.5 h-3.5 text-[#2D6A4F] animate-pulse" />
                                <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-[0.2em]">Daily Operational Matrix</span>
                            </div>
                            <h2 className="text-5xl font-black text-[#1B4332] leading-[0.9] tracking-tighter mb-8 italic uppercase">
                                Real-Time <br /> System <br /> Pulse
                            </h2 >
                            <p className="text-[#52796F] text-lg font-medium mb-10">
                                Comprehensive monitoring of today's transit activity. Tracking live network health,
                                edge connectivity, and institutional node synchronization.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-3xl bg-[#F8F9FA] border border-[#E9ECEF] group hover:border-[#2D6A4F]/30 transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-black text-[#95A3A4] uppercase tracking-widest">Active Units</span>
                                    </div>
                                    <p className="text-3xl font-black text-[#1B4332]">{stats?.onlineBuses || 0}</p>
                                    <p className="text-[10px] text-[#2D6A4F] font-bold mt-1 uppercase tracking-tight">Currently Transmitting</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-[#F8F9FA] border border-[#E9ECEF] group hover:border-[#E07A5F]/30 transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-[#E07A5F]" />
                                        <span className="text-[10px] font-black text-[#95A3A4] uppercase tracking-widest">Offline Units</span>
                                    </div>
                                    <p className="text-3xl font-black text-[#1B4332]">{stats?.offlineBuses || 0}</p>
                                    <p className="text-[10px] text-[#E07A5F] font-bold mt-1 uppercase tracking-tight">Stationary / Parked</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 w-full lg:w-auto h-[400px] glass-card rounded-[40px] p-8 border-[#E9ECEF] flex flex-col justify-center items-center text-center relative overflow-hidden bg-[#1B4332]/5 group">
                            <div className="absolute inset-0 bg-[#2D6A4F]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-[#1B4332]/10 mb-8 mx-auto group-hover:rotate-12 transition-transform duration-500">
                                    <ShieldCheck className="w-12 h-12 text-[#2D6A4F]" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1B4332] uppercase italic tracking-tighter mb-4">Network Integrity Optimized</h3>
                                <p className="text-[#52796F] text-sm max-w-xs mx-auto leading-relaxed">
                                    Our edge telemetry network is currently operating at <span className="text-[#1B4332] font-black">99.9%</span> global uptime across all institutional zones.
                                </p>
                                <div className="mt-10 flex flex-col items-center gap-6">
                                    <div className="flex items-center justify-center gap-3 px-6 py-3 bg-white border border-[#E9ECEF] rounded-2xl w-fit mx-auto shadow-sm">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-[ping_2s_infinite]" />
                                        <span className="text-[10px] font-black text-[#1B4332] uppercase tracking-[0.2em]">Verified Root Auth</span>
                                    </div>
                                    <button
                                        onClick={() => navigate('/superadmin/map')}
                                        className="flex items-center gap-3 px-8 py-4 bg-[#1B4332] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#2D6A4F] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#1B4332]/20"
                                    >
                                        <Globe className="w-4 h-4 text-[#D8F3DC]" />
                                        Launch Global Map
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default MasterDashboard;
