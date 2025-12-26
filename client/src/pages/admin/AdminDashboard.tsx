/**
 * Admin Dashboard - Human-Centered Design
 * Warm, calming color palette
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Users, Wifi, WifiOff, MapPin, ArrowRight, RefreshCw, Activity, LucideIcon, Building2, Copy, Check } from 'lucide-react';
import api from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import type { BusLocation } from '../../types';

interface Stats {
    totalBuses: number;
    totalDrivers: number;
    activeDrivers: number;
    onlineBuses: number;
    offlineBuses: number;
}

interface BusData {
    id: string;
    busNumber: string;
    busName: string;
    isOnline?: boolean;
    driver?: string;
    lastUpdate?: string;
    lat?: number;
    lon?: number;
}

interface StatCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    color: 'green' | 'blue' | 'coral' | 'gray';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
    const colors = {
        green: { bg: 'bg-[#D8F3DC]', icon: 'text-[#2D6A4F]', border: 'border-[#2D6A4F]/20' },
        blue: { bg: 'bg-[#E8F4F8]', icon: 'text-[#457B9D]', border: 'border-[#457B9D]/20' },
        coral: { bg: 'bg-[#FFF1E6]', icon: 'text-[#E07A5F]', border: 'border-[#E07A5F]/20' },
        gray: { bg: 'bg-[#F8F9FA]', icon: 'text-[#74796D]', border: 'border-[#E9ECEF]' },
    };
    const c = colors[color];

    return (
        <div className={`bg-white rounded-2xl p-5 border ${c.border} shadow-sm`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[#74796D] text-sm">{title}</p>
                    <p className="text-3xl font-bold text-[#1B4332] mt-1">{value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${c.icon}`} />
                </div>
            </div>
        </div>
    );
}

function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats>({ totalBuses: 0, totalDrivers: 0, activeDrivers: 0, onlineBuses: 0, offlineBuses: 0 });
    const [buses, setBuses] = useState<BusData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);
    const lastUpdateTimesRef = useRef<Map<string, number>>(new Map());

    const copyCode = () => {
        if (user?.organization?.code) {
            navigator.clipboard.writeText(user.organization.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const [statsRes, busesRes] = await Promise.all([
                api.get('/admin/dashboard'),
                api.get('/admin/dashboard/buses'),
            ]);
            setStats(statsRes.data.data);
            setBuses(busesRes.data.data || []);
        } catch (e) { console.error(e); }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchData();
        socketService.connect();
        const token = localStorage.getItem('accessToken');
        if (token) {
            socketService.joinAdminDashboard(token);
        }

        const unsub = socketService.onBusUpdate((data: BusLocation) => {
            const busId = data.busId || data.id;
            if (!busId) return;

            lastUpdateTimesRef.current.set(busId, Date.now());
            setBuses((prev: BusData[]) => {
                const idx = prev.findIndex((b: BusData) => b.id === busId);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = {
                        ...updated[idx],
                        isOnline: true,
                        lastUpdate: data.updatedAt,
                        lat: data.lat ?? undefined,
                        lon: data.lon ?? undefined,
                        driver: data.driver || updated[idx].driver
                    };
                    return updated;
                }
                return prev;
            });
        });
        return () => unsub();
    }, []);

    const OFFLINE_THRESHOLD_MS = 15000;
    useEffect(() => {
        const checkOffline = () => {
            const now = Date.now();
            setBuses(prev => prev.map(bus => {
                if (!bus.isOnline) return bus;
                const lastUpdate = lastUpdateTimesRef.current.get(bus.id);
                if (lastUpdate && now - lastUpdate > OFFLINE_THRESHOLD_MS) {
                    return { ...bus, isOnline: false };
                }
                return bus;
            }));
        };
        const interval = setInterval(checkOffline, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Organization Welcome Banner */}
            {user?.organization && (
                <div className="bg-gradient-to-r from-[#D8F3DC] to-[#E8F4F8] rounded-2xl p-6 border border-[#2D6A4F]/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center shadow-lg">
                                <Building2 className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[#1B4332]">{user.organization.name}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm text-[#52796F]">Organization Code:</span>
                                    <span className="text-sm font-mono font-bold text-[#2D6A4F] bg-white px-2 py-0.5 rounded">{user.organization.code}</span>
                                    <button onClick={copyCode} className="p-1.5 hover:bg-white/50 rounded-lg transition" title="Copy code">
                                        {copied ? <Check className="w-4 h-4 text-[#2D6A4F]" /> : <Copy className="w-4 h-4 text-[#52796F]" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#1B4332]">Dashboard</h1>
                    <p className="text-[#74796D] text-sm mt-1">Real-time fleet overview</p>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E9ECEF] rounded-xl text-sm font-medium text-[#1B4332] hover:bg-[#F8F9FA] transition disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard title="Total Buses" value={stats.totalBuses} icon={Bus} color="green" />
                <StatCard title="Total Drivers" value={stats.totalDrivers} icon={Users} color="blue" />
                <StatCard title="Active Drivers" value={stats.activeDrivers || 0} icon={Activity} color="coral" />
                <StatCard title="Online Buses" value={stats.onlineBuses} icon={Wifi} color="green" />
                <StatCard title="Offline" value={stats.offlineBuses} icon={WifiOff} color="gray" />
            </div>

            {/* Bus Status Card */}
            <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[#E9ECEF]">
                    <h2 className="text-lg font-semibold text-[#1B4332]">Bus Status</h2>
                    <Link to="/admin/buses" className="text-[#2D6A4F] hover:text-[#1B4332] text-sm font-medium flex items-center gap-1">
                        View all <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Desktop view */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#F8F9FA] border-b border-[#E9ECEF]">
                                <th className="text-left py-3 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">Bus</th>
                                <th className="text-left py-3 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">Status</th>
                                <th className="text-left py-3 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">Driver</th>
                                <th className="text-left py-3 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">Last Update</th>
                                <th className="text-left py-3 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {buses.length > 0 ? buses.slice(0, 8).map((bus, i) => (
                                <motion.tr key={bus.id} className="border-b border-[#E9ECEF] hover:bg-[#F8F9FA]"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                                    <td className="py-4 px-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bus.isOnline ? 'bg-[#D8F3DC]' : 'bg-[#F8F9FA]'}`}>
                                                <Bus className={`w-5 h-5 ${bus.isOnline ? 'text-[#2D6A4F]' : 'text-[#95A3A4]'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[#1B4332]">{bus.busNumber}</p>
                                                <p className="text-xs text-[#74796D]">{bus.busName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-5">
                                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${bus.isOnline
                                            ? 'bg-[#D8F3DC] text-[#2D6A4F]'
                                            : 'bg-[#F8F9FA] text-[#74796D]'}`}>
                                            {bus.isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-5 text-sm text-[#52796F]">{bus.driver || <span className="text-[#95A3A4]">—</span>}</td>
                                    <td className="py-4 px-5 text-xs text-[#74796D]">{bus.lastUpdate ? new Date(bus.lastUpdate).toLocaleTimeString() : '—'}</td>
                                    <td className="py-4 px-5">
                                        {bus.lat && bus.lon ? (
                                            <Link to={`/track?bus=${bus.busNumber}`} className="text-[#2D6A4F] hover:text-[#1B4332] text-sm font-medium flex items-center gap-1">
                                                <MapPin className="w-4 h-4" /> View
                                            </Link>
                                        ) : <span className="text-[#95A3A4]">—</span>}
                                    </td>
                                </motion.tr>
                            )) : (
                                <tr><td colSpan={5} className="py-12 text-center text-[#74796D]">No buses found. Add your first bus to get started.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile view */}
                <div className="md:hidden divide-y divide-[#E9ECEF]">
                    {buses.length > 0 ? buses.slice(0, 8).map((bus, i) => (
                        <motion.div
                            key={bus.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="p-4 active:bg-[#F8F9FA] transition-colors"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bus.isOnline ? 'bg-[#D8F3DC]' : 'bg-[#F8F9FA]'}`}>
                                        <Bus className={`w-5 h-5 ${bus.isOnline ? 'text-[#2D6A4F]' : 'text-[#95A3A4]'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[#1B4332]">{bus.busNumber}</p>
                                        <p className="text-xs text-[#74796D]">{bus.busName}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${bus.isOnline
                                    ? 'bg-[#D8F3DC] text-[#2D6A4F]'
                                    : 'bg-[#F8F9FA] text-[#74796D]'}`}>
                                    {bus.isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <p className="text-[10px] text-[#95A3A4] uppercase font-bold">Driver</p>
                                        <p className="text-xs text-[#52796F] font-medium">{bus.driver || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-[#95A3A4] uppercase font-bold">Last Update</p>
                                        <p className="text-xs text-[#74796D]">{bus.lastUpdate ? new Date(bus.lastUpdate).toLocaleTimeString() : '—'}</p>
                                    </div>
                                </div>
                                {bus.lat && bus.lon && (
                                    <Link to={`/track?bus=${bus.busNumber}`} className="px-3 py-1.5 bg-[#E8F4F8] text-[#457B9D] rounded-lg text-xs font-bold flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Map
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    )) : (
                        <div className="py-12 text-center text-[#74796D] text-sm">No buses found.</div>
                    )}
                </div>
            </div>


            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
                <Link to="/admin/buses" className="bg-white rounded-2xl p-5 border border-[#E9ECEF] hover:border-[#2D6A4F]/30 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#D8F3DC] flex items-center justify-center">
                            <Bus className="w-6 h-6 text-[#2D6A4F]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-[#1B4332]">Manage Buses</h3>
                            <p className="text-xs text-[#74796D]">Add, edit, or remove buses</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-[#95A3A4]" />
                    </div>
                </Link>
                <Link to="/admin/drivers" className="bg-white rounded-2xl p-5 border border-[#E9ECEF] hover:border-[#457B9D]/30 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#E8F4F8] flex items-center justify-center">
                            <Users className="w-6 h-6 text-[#457B9D]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-[#1B4332]">Manage Drivers</h3>
                            <p className="text-xs text-[#74796D]">Add, edit, or remove drivers</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-[#95A3A4]" />
                    </div>
                </Link>
            </div>
        </div>
    );
}

export default AdminDashboard;
