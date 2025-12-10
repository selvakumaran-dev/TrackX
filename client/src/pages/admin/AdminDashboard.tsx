/**
 * Admin Dashboard - Clean & Professional
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Users, Wifi, WifiOff, MapPin, ArrowRight, RefreshCw, Activity } from 'lucide-react';
import api from '../../services/api';
import socketService from '../../services/socket';

function StatCard({ title, value, icon: Icon, color }) {
    const colors = {
        primary: 'from-primary-500 to-primary-600',
        secondary: 'from-secondary-500 to-secondary-600',
        accent: 'from-accent-500 to-accent-600',
        gray: 'from-dark-600 to-dark-700',
    };

    return (
        <div className="card">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-dark-400 text-sm">{title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
        </div>
    );
}

function AdminDashboard() {
    const [stats, setStats] = useState({ totalBuses: 0, totalDrivers: 0, activeDrivers: 0, onlineBuses: 0, offlineBuses: 0 });
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
        socketService.joinAdminDashboard(localStorage.getItem('accessToken'));

        const unsub = socketService.onBusUpdate((data) => {
            setBuses(prev => {
                const idx = prev.findIndex(b => b.busNumber === data.busNumber);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], ...data, isOnline: true, lastUpdate: data.updatedAt };
                    return updated;
                }
                return prev;
            });
        });
        return () => unsub();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="spinner w-6 h-6 border-2" /></div>;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-dark-400 text-sm mt-1">Real-time fleet overview</p>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="btn-outline py-2 px-4 text-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Buses" value={stats.totalBuses} icon={Bus} color="primary" />
                <StatCard title="Total Drivers" value={stats.totalDrivers} icon={Users} color="secondary" />
                <StatCard title="Active Drivers" value={stats.activeDrivers || 0} icon={Activity} color="accent" />
                <StatCard title="Online Buses" value={stats.onlineBuses} icon={Wifi} color="accent" />
                <StatCard title="Offline" value={stats.offlineBuses} icon={WifiOff} color="gray" />
            </div>

            {/* Bus Status Table */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Bus Status</h2>
                    <Link to="/admin/buses" className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                        View all <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-700">
                                <th className="text-left py-3 px-4 text-dark-400 font-medium text-xs uppercase tracking-wider">Bus</th>
                                <th className="text-left py-3 px-4 text-dark-400 font-medium text-xs uppercase tracking-wider">Status</th>
                                <th className="text-left py-3 px-4 text-dark-400 font-medium text-xs uppercase tracking-wider">Driver</th>
                                <th className="text-left py-3 px-4 text-dark-400 font-medium text-xs uppercase tracking-wider">Last Update</th>
                                <th className="text-left py-3 px-4 text-dark-400 font-medium text-xs uppercase tracking-wider">Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {buses.length > 0 ? buses.slice(0, 8).map((bus, i) => (
                                <motion.tr key={bus.id} className="border-b border-dark-700/50 hover:bg-white/5"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bus.isOnline ? 'bg-primary-500/20' : 'bg-dark-700'}`}>
                                                <Bus className={`w-4 h-4 ${bus.isOnline ? 'text-primary-400' : 'text-dark-500'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{bus.busNumber}</p>
                                                <p className="text-xs text-dark-500">{bus.busName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-1 rounded-full ${bus.isOnline ? 'bg-secondary-500/15 text-secondary-400' : 'bg-dark-700 text-dark-400'}`}>
                                            {bus.isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-dark-300">{bus.driver || <span className="text-dark-500">—</span>}</td>
                                    <td className="py-3 px-4 text-xs text-dark-400">{bus.lastUpdate ? new Date(bus.lastUpdate).toLocaleTimeString() : '—'}</td>
                                    <td className="py-3 px-4">
                                        {bus.lat && bus.lon ? (
                                            <Link to={`/track?bus=${bus.busNumber}`} className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> View
                                            </Link>
                                        ) : <span className="text-dark-500">—</span>}
                                    </td>
                                </motion.tr>
                            )) : (
                                <tr><td colSpan={5} className="py-8 text-center text-dark-500">No buses found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
                <Link to="/admin/buses" className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                            <Bus className="w-5 h-5 text-primary-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-white">Manage Buses</h3>
                            <p className="text-xs text-dark-500">Add, edit, or remove buses</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-dark-500" />
                    </div>
                </Link>
                <Link to="/admin/drivers" className="card-hover">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-secondary-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-white">Manage Drivers</h3>
                            <p className="text-xs text-dark-500">Add, edit, or remove drivers</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-dark-500" />
                    </div>
                </Link>
            </div>
        </div>
    );
}

export default AdminDashboard;
