/**
 * Driver History - Ultra Mobile-First Premium Design
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, MapPin, Route, ChevronRight, Bus, Gauge,
    TrendingUp, Activity, Navigation2
} from 'lucide-react';
import api from '../../services/api';

interface HistoryEntry {
    id: string;
    latitude: number;
    longitude: number;
    speed?: number;
    accuracy?: number;
    timestamp: string;
    bus?: {
        busNumber: string;
        busName: string;
    };
}

interface TripSummary {
    date: string;
    startTime: string;
    endTime: string;
    distance: number;
    maxSpeed: number;
    avgSpeed: number;
    pointCount: number;
    busNumber: string;
    busName: string;
}

const DriverHistory: React.FC = () => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [trips, setTrips] = useState<TripSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState<TripSummary | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/driver/history', { params: { limit: 500 } });
                const data = res.data.data || [];
                setHistory(data);

                // Group into trips by date
                const tripMap = new Map<string, HistoryEntry[]>();
                data.forEach((entry: HistoryEntry) => {
                    const date = new Date(entry.timestamp).toLocaleDateString();
                    if (!tripMap.has(date)) tripMap.set(date, []);
                    tripMap.get(date)!.push(entry);
                });

                // Calculate trip summaries
                const summaries: TripSummary[] = [];
                tripMap.forEach((entries, date) => {
                    if (entries.length < 2) return;
                    const sorted = entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const speeds = sorted.map(e => e.speed || 0);

                    // Calculate distance
                    let distance = 0;
                    for (let i = 1; i < sorted.length; i++) {
                        const d = calcDist(sorted[i - 1].latitude, sorted[i - 1].longitude, sorted[i].latitude, sorted[i].longitude);
                        if (d < 5000) distance += d; // Ignore jumps > 5km
                    }

                    summaries.push({
                        date,
                        startTime: new Date(sorted[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        endTime: new Date(sorted[sorted.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        distance: Math.round(distance / 1000 * 10) / 10,
                        maxSpeed: Math.max(...speeds),
                        avgSpeed: Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length),
                        pointCount: sorted.length,
                        busNumber: sorted[0].bus?.busNumber || 'N/A',
                        busName: sorted[0].bus?.busName || 'Unknown',
                    });
                });

                setTrips(summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (e) {
                console.error('Failed to fetch history:', e);
            }
            setLoading(false);
        };
        fetchHistory();
    }, []);

    // Haversine
    const calcDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3, φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-slate-900 pb-28">
            <style>{`
        .touch-btn{min-height:56px}
        .safe-b{padding-bottom:max(112px,calc(112px + env(safe-area-inset-bottom)))}
      `}</style>

            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-4 pt-8 pb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Trip History</h1>
                <p className="text-indigo-200 text-sm">Your past trips and activity</p>
            </div>

            {/* Summary Stats */}
            {trips.length > 0 && (
                <div className="px-4 -mt-3 relative z-10">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800 rounded-2xl p-4 text-center">
                            <Route className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                            <p className="text-xl font-bold text-white">{trips.length}</p>
                            <p className="text-xs text-slate-500">Trips</p>
                        </div>
                        <div className="bg-slate-800 rounded-2xl p-4 text-center">
                            <Navigation2 className="w-5 h-5 text-teal-400 mx-auto mb-2" />
                            <p className="text-xl font-bold text-white">{trips.reduce((a, t) => a + t.distance, 0).toFixed(0)}</p>
                            <p className="text-xs text-slate-500">km Total</p>
                        </div>
                        <div className="bg-slate-800 rounded-2xl p-4 text-center">
                            <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                            <p className="text-xl font-bold text-white">{Math.max(...trips.map(t => t.maxSpeed), 0)}</p>
                            <p className="text-xs text-slate-500">Max km/h</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Trip List */}
            <div className="px-4 mt-6">
                <p className="text-xs text-slate-500 uppercase font-semibold px-2 mb-3">Recent Trips</p>

                {trips.length === 0 ? (
                    <div className="bg-slate-800 rounded-2xl p-8 text-center">
                        <Activity className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <h3 className="text-lg font-bold text-white mb-2">No Trips Yet</h3>
                        <p className="text-slate-400 text-sm">Start tracking to see your history</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {trips.map((trip, i) => (
                            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }} onClick={() => setSelectedTrip(selectedTrip?.date === trip.date ? null : trip)}
                                className="w-full bg-slate-800 rounded-2xl p-4 text-left active:bg-slate-700 touch-btn">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex flex-col items-center justify-center">
                                        <span className="text-lg font-bold text-indigo-400">{new Date(trip.date).getDate()}</span>
                                        <span className="text-[10px] text-indigo-400 uppercase">{new Date(trip.date).toLocaleString('default', { month: 'short' })}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{trip.busNumber} - {trip.busName}</p>
                                        <p className="text-sm text-slate-500">{trip.startTime} → {trip.endTime}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-white">{trip.distance} km</p>
                                        <p className="text-xs text-slate-500">{trip.pointCount} pts</p>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {selectedTrip?.date === trip.date && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                            className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-3 overflow-hidden">
                                            <div className="bg-slate-700/50 rounded-xl p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                                                    <span className="text-xs text-slate-500">Max Speed</span>
                                                </div>
                                                <p className="text-lg font-bold text-white">{trip.maxSpeed} km/h</p>
                                            </div>
                                            <div className="bg-slate-700/50 rounded-xl p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                                                    <span className="text-xs text-slate-500">Avg Speed</span>
                                                </div>
                                                <p className="text-lg font-bold text-white">{trip.avgSpeed} km/h</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverHistory;
