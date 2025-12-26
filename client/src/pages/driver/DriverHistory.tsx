/**
 * Driver History - Human-Centered Premium Design
 * Warm colors and pleasant typography
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, MapPin, Route, ChevronRight, Bus, Gauge,
    TrendingUp, Activity, Navigation2, CheckCircle
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
    busId?: string;
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

                // Calculate summary stats
                const summaries: TripSummary[] = [];
                tripMap.forEach((entries, date) => {
                    if (entries.length < 2) return;
                    const sorted = entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const speeds = sorted.map(e => e.speed || 0);

                    // Calc distance
                    const calcDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                        const R = 6371e3, φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
                        const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
                        const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
                        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    };

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

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-[#FDFBF7] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#FDFBF7] pb-28">
            {/* Header */}
            <div className="bg-white border-b border-[#E9ECEF] px-5 pt-8 pb-6 shadow-sm">
                <h1 className="text-2xl font-bold text-[#1B4332] mb-1">Trip History</h1>
                <p className="text-[#74796D] text-sm">Your past trips and activity</p>
            </div>

            {/* Summary Stats */}
            {trips.length > 0 && (
                <div className="px-5 mt-6">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-2xl p-4 text-center border border-[#E9ECEF] shadow-sm">
                            <div className="w-8 h-8 rounded-lg bg-[#D8F3DC] flex items-center justify-center mx-auto mb-2">
                                <Route className="w-4 h-4 text-[#2D6A4F]" />
                            </div>
                            <p className="text-xl font-bold text-[#1B4332]">{trips.length}</p>
                            <p className="text-xs text-[#74796D] uppercase font-bold">Trips</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 text-center border border-[#E9ECEF] shadow-sm">
                            <div className="w-8 h-8 rounded-lg bg-[#E8F4F8] flex items-center justify-center mx-auto mb-2">
                                <Navigation2 className="w-4 h-4 text-[#457B9D]" />
                            </div>
                            <p className="text-xl font-bold text-[#1B4332]">{trips.reduce((a, t) => a + t.distance, 0).toFixed(0)}</p>
                            <p className="text-xs text-[#74796D] uppercase font-bold">km Total</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 text-center border border-[#E9ECEF] shadow-sm">
                            <div className="w-8 h-8 rounded-lg bg-[#FFF1E6] flex items-center justify-center mx-auto mb-2">
                                <TrendingUp className="w-4 h-4 text-[#E07A5F]" />
                            </div>
                            <p className="text-xl font-bold text-[#1B4332]">{Math.max(...trips.map(t => t.maxSpeed), 0)}</p>
                            <p className="text-xs text-[#74796D] uppercase font-bold">Max km/h</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Trip List */}
            <div className="px-5 mt-6">
                <p className="text-xs text-[#74796D] uppercase font-bold px-2 mb-3">Recent Trips</p>

                {trips.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-[#E9ECEF]">
                        <Activity className="w-12 h-12 mx-auto mb-4 text-[#95A3A4]" />
                        <h3 className="text-lg font-bold text-[#1B4332] mb-1">No Trips Yet</h3>
                        <p className="text-[#74796D] text-sm">Start tracking to see your history</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {trips.map((trip, i) => (
                            <motion.button
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => setSelectedTrip(selectedTrip?.date === trip.date ? null : trip)}
                                className={`w-full bg-white rounded-2xl p-5 text-left border transition-all shadow-sm
                                    ${selectedTrip?.date === trip.date ? 'border-[#2D6A4F] ring-1 ring-[#2D6A4F]/10' : 'border-[#E9ECEF] hover:border-[#2D6A4F]/30'}
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-[#D8F3DC] rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                                        <span className="text-lg font-bold text-[#2D6A4F]">{new Date(trip.date).getDate()}</span>
                                        <span className="text-[10px] text-[#2D6A4F] uppercase font-bold">{new Date(trip.date).toLocaleString('default', { month: 'short' })}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[#1B4332] font-semibold truncate">{trip.busNumber}</p>
                                        <p className="text-xs text-[#74796D] truncate">{trip.busName}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-[#52796F] bg-[#F8F9FA] px-2 py-0.5 rounded-full border border-[#E9ECEF]">
                                                {trip.startTime} - {trip.endTime}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-lg font-bold text-[#1B4332]">{trip.distance}<span className="text-sm font-normal text-[#74796D] ml-1">km</span></p>
                                        <div className="flex items-center justify-end gap-1 text-xs text-[#74796D]">
                                            <CheckCircle className="w-3 h-3 text-[#2D6A4F]" />
                                            Completed
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {selectedTrip?.date === trip.date && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mt-4 pt-4 border-t border-[#E9ECEF] grid grid-cols-2 gap-3 overflow-hidden"
                                        >
                                            <div className="bg-[#FFF1E6] rounded-xl p-3 border border-[#E07A5F]/10">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Gauge className="w-3.5 h-3.5 text-[#E07A5F]" />
                                                    <span className="text-xs text-[#74796D] font-medium">Max Speed</span>
                                                </div>
                                                <p className="text-lg font-bold text-[#1B4332]">{trip.maxSpeed} <span className="text-sm font-normal text-[#74796D]">km/h</span></p>
                                            </div>
                                            <div className="bg-[#E8F4F8] rounded-xl p-3 border border-[#457B9D]/10">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <TrendingUp className="w-3.5 h-3.5 text-[#457B9D]" />
                                                    <span className="text-xs text-[#74796D] font-medium">Avg Speed</span>
                                                </div>
                                                <p className="text-lg font-bold text-[#1B4332]">{trip.avgSpeed} <span className="text-sm font-normal text-[#74796D]">km/h</span></p>
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
