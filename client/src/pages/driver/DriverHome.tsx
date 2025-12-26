/**
 * Driver Home - Human-Centered Mobile-First Design
 * 
 * Design Philosophy:
 * - Warm, calming color palette
 * - Clear visual hierarchy
 * - Large touch targets
 * - Pleasant, refreshing feel
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Play, Square, Wifi, WifiOff, AlertCircle, Bus,
    Clock, Navigation, Signal, Target, Route, CheckCircle,
    Navigation2, Activity, Compass, TrendingUp
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { BusStop } from '../../types';

// Stat Card Component
function StatCard({ icon: Icon, label, value, color, bg }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
    bg: string;
}) {
    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E9ECEF]">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                </div>
            </div>
            <p className="text-2xl font-bold text-[#1B4332]">{value}</p>
            <p className="text-xs text-[#74796D] uppercase tracking-wide">{label}</p>
        </div>
    );
}

interface AssignedBus {
    id: string;
    busNumber: string;
    busName: string;
    stops?: BusStop[];
    organization?: {
        code: string;
    };
}

const DriverHome: React.FC = () => {
    const { user } = useAuth();
    const [isTracking, setIsTracking] = useState(false);
    const [assignedBus, setAssignedBus] = useState<AssignedBus | null>(null);
    const [busStops, setBusStops] = useState<BusStop[]>([]);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'active' | 'weak' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [sendCount, setSendCount] = useState(0);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [passedStops, setPassedStops] = useState<Set<string>>(new Set());
    const [tripDistance, setTripDistance] = useState(0);
    const [tripStartTime, setTripStartTime] = useState<Date | null>(null);
    const [busLoading, setBusLoading] = useState(true);
    const watchIdRef = useRef<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
    const lastSendTimeRef = useRef<number>(0);
    const latestPosRef = useRef<GeolocationPosition | null>(null);

    // Fetch assigned bus
    useEffect(() => {
        const fetchBus = async () => {
            setBusLoading(true);
            try {
                const res = await api.get('/driver/bus');
                const bus = res.data.data;
                setAssignedBus(bus);
                if (bus?.id) {
                    try {
                        const params: { orgCode?: string } = {};
                        if (bus.organization?.code) params.orgCode = bus.organization.code;
                        const fullRes = await api.get(`/public/bus/${bus.busNumber}`, { params });
                        if (fullRes.data.data?.stops) setBusStops(fullRes.data.data.stops);
                    } catch (e) { console.log('No stops available', e); }
                }
            } catch (e) { console.log('No bus assigned'); }
            setBusLoading(false);
        };
        fetchBus();
    }, []);

    // Haversine distance
    const calcDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3, φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Check passed stops
    useEffect(() => {
        if (!isTracking || !currentLocation || !busStops.length || !accuracy || accuracy > 200) return;
        const newPassed = new Set(passedStops);
        busStops.forEach(stop => {
            const dist = calcDist(currentLocation.lat, currentLocation.lng, stop.latitude, stop.longitude);
            const detectionRadius = Math.max(50, accuracy + 50);
            if (dist < detectionRadius) newPassed.add(stop.id);
        });
        if (newPassed.size !== passedStops.size) setPassedStops(newPassed);
    }, [currentLocation, busStops, passedStops, accuracy, isTracking]);

    // Send location
    const sendLocation = useCallback(async (pos: GeolocationPosition, force: boolean = false) => {
        if (!assignedBus) return;

        // Rate limit: max once per 3 seconds unless forced
        const now = Date.now();
        if (!force && now - lastSendTimeRef.current < 3000) return;

        const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        setCurrentSpeed(speed);
        setAccuracy(Math.round(pos.coords.accuracy));

        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (lastPositionRef.current) {
            const dist = calcDist(lastPositionRef.current.lat, lastPositionRef.current.lng, newLoc.lat, newLoc.lng);
            if (dist < 1000) setTripDistance(prev => prev + dist);
        }
        lastPositionRef.current = newLoc;
        setCurrentLocation(newLoc);
        lastSendTimeRef.current = now;

        try {
            const locationData: { lat: number; lon: number; speed: number; accuracy?: number; heading?: number } = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                speed,
            };
            if (pos.coords.accuracy != null) locationData.accuracy = pos.coords.accuracy;
            if (pos.coords.heading != null) locationData.heading = pos.coords.heading;

            await api.post('/driver/location', locationData);
            setSendCount(prev => prev + 1);
            setGpsStatus(pos.coords.accuracy > 50 ? 'weak' : 'active');
            setError(null);
        } catch (e) {
            console.error('Failed to send location:', e);
            // Don't show error for every packet to avoid UI noise
        }
    }, [assignedBus]);

    // Start tracking
    const startTracking = () => {
        if (!assignedBus) { setError('No bus assigned'); return; }
        if (!navigator.geolocation) { setError('GPS not supported'); return; }

        setIsTracking(true);
        setGpsStatus('acquiring');
        setSendCount(0);
        setTripDistance(0);
        setTripStartTime(new Date());
        setPassedStops(new Set());
        setError(null);
        lastPositionRef.current = null;

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                latestPosRef.current = pos;
                sendLocation(pos);
            },
            (err) => {
                setGpsStatus('error');
                if (err.code === 1) setError('GPS permission denied');
                else if (err.code === 2) setError('GPS unavailable');
                else if (err.code === 3) setError('Acquiring signal...');
                else setError('GPS error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        // Immediate first position
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                latestPosRef.current = pos;
                sendLocation(pos, true);
            },
            () => { },
            { enableHighAccuracy: true, timeout: 5000 }
        );

        // Heartbeat interval (ensures live status even if stationary)
        intervalRef.current = setInterval(() => {
            if (latestPosRef.current) {
                sendLocation(latestPosRef.current);
            } else {
                // Try to get fix if we don't have one yet
                navigator.geolocation.getCurrentPosition(
                    (p) => { latestPosRef.current = p; sendLocation(p); },
                    () => { },
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            }
        }, 10000); // 10s heartbeat
    };

    // Stop tracking
    const stopTracking = async () => {
        setIsTracking(false);
        setGpsStatus('idle');
        if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        latestPosRef.current = null;

        try {
            await api.post('/driver/stop-tracking');
        } catch (e) {
            console.error('Failed to notify server of stop tracking', e);
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // Format duration
    const formatDuration = (start: Date | null) => {
        if (!start) return '0:00';
        const diff = Math.floor((Date.now() - start.getTime()) / 1000);
        const hrs = Math.floor(diff / 3600), mins = Math.floor((diff % 3600) / 60), secs = diff % 60;
        return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Timer tick
    const [, tick] = useState(0);
    useEffect(() => {
        if (isTracking && tripStartTime) {
            const t = setInterval(() => tick(n => n + 1), 1000);
            return () => clearInterval(t);
        }
    }, [isTracking, tripStartTime]);

    const nextStop = busStops.find(s => !passedStops.has(s.id));

    if (busLoading) {
        return (
            <div className="min-h-[100dvh] bg-[#FDFBF7] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#FDFBF7] pb-24">
            {/* Decorative Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#D8F3DC] rounded-full blur-3xl opacity-30" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#E8F4F8] rounded-full blur-3xl opacity-40" />
            </div>

            {/* Header */}
            <div className="relative z-10 bg-white border-b border-[#E9ECEF] px-5 pt-6 pb-6">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-[#74796D] text-sm">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</p>
                        <h1 className="text-xl font-bold text-[#1B4332]">{user?.name || 'Driver'}</h1>
                    </div>

                    {/* GPS Status Badge */}
                    <div className={`px-4 py-2 rounded-full flex items-center gap-2 border ${gpsStatus === 'active' ? 'bg-[#D8F3DC] border-[#40916C]/30 text-[#2D6A4F]' :
                        gpsStatus === 'weak' ? 'bg-[#FFF1E6] border-[#E07A5F]/30 text-[#E07A5F]' :
                            gpsStatus === 'acquiring' ? 'bg-[#E8F4F8] border-[#457B9D]/30 text-[#457B9D]' :
                                gpsStatus === 'error' ? 'bg-red-50 border-red-200 text-red-600' :
                                    'bg-[#F8F9FA] border-[#E9ECEF] text-[#74796D]'
                        }`}>
                        {gpsStatus === 'active' ? <Wifi className="w-4 h-4" /> :
                            gpsStatus === 'weak' ? <Signal className="w-4 h-4" /> :
                                gpsStatus === 'acquiring' ? <Compass className="w-4 h-4 animate-spin" /> :
                                    gpsStatus === 'error' ? <AlertCircle className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        <span className="text-xs font-semibold uppercase">
                            {gpsStatus === 'active' ? 'Live' : gpsStatus === 'weak' ? 'Weak' :
                                gpsStatus === 'acquiring' ? 'GPS' : gpsStatus === 'error' ? 'Error' : 'Off'}
                        </span>
                    </div>
                </div>

                {/* Bus Info Card */}
                {assignedBus ? (
                    <div className="bg-gradient-to-r from-[#2D6A4F] to-[#40916C] rounded-2xl p-5 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                                <Bus className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold">{assignedBus.busNumber}</h2>
                                <p className="text-white/80">{assignedBus.busName}</p>
                            </div>
                            {isTracking && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    <span className="text-xs font-medium">LIVE</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-[#E9ECEF] rounded-2xl p-8 text-center">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-[#95A3A4]" />
                        <h3 className="text-lg font-bold text-[#1B4332] mb-1">No Bus Assigned</h3>
                        <p className="text-sm text-[#74796D]">Contact your administrator</p>
                    </div>
                )}
            </div>

            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="relative z-10 mx-5 mt-4 flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100"
                    >
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-600">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="relative z-10 px-5 pt-6 space-y-5">
                {/* Speed Display - when tracking */}
                <AnimatePresence>
                    {isTracking && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-8 text-center shadow-sm border border-[#E9ECEF]"
                        >
                            <p className="text-[#74796D] text-sm uppercase tracking-wide mb-2">Current Speed</p>
                            <div className="flex items-end justify-center gap-1">
                                <span className={`text-6xl font-bold ${currentSpeed < 20 ? 'text-[#2D6A4F]' :
                                    currentSpeed < 40 ? 'text-[#E07A5F]' : 'text-red-500'
                                    }`}>
                                    {currentSpeed}
                                </span>
                                <span className="text-2xl text-[#74796D] mb-2">km/h</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Start/Stop Button */}
                {assignedBus && (
                    <motion.button
                        onClick={isTracking ? stopTracking : startTracking}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all ${isTracking
                            ? 'bg-[#E07A5F] text-white shadow-[#E07A5F]/25'
                            : 'bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white shadow-[#2D6A4F]/25'
                            }`}
                    >
                        {isTracking ? (
                            <>
                                <Square className="w-6 h-6" />
                                Stop Tracking
                            </>
                        ) : (
                            <>
                                <Play className="w-6 h-6" />
                                Start Trip
                            </>
                        )}
                    </motion.button>
                )}

                {/* Live Stats Grid */}
                <AnimatePresence>
                    {isTracking && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="grid grid-cols-2 gap-3"
                        >
                            <StatCard icon={Clock} label="Duration" value={formatDuration(tripStartTime)} color="#2D6A4F" bg="#D8F3DC" />
                            <StatCard icon={TrendingUp} label="Distance" value={`${(tripDistance / 1000).toFixed(1)} km`} color="#457B9D" bg="#E8F4F8" />
                            <StatCard icon={Activity} label="Updates" value={sendCount} color="#E07A5F" bg="#FFF1E6" />
                            <StatCard icon={Target} label="Accuracy" value={accuracy ? `±${accuracy}m` : '--'} color="#8B5CF6" bg="#F3E8FF" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Next Stop Card */}
                {isTracking && nextStop && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#FFF1E6] border border-[#E07A5F]/20 rounded-2xl p-5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-[#E07A5F] to-[#F4A261] rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                {nextStop.order}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-[#E07A5F] font-semibold uppercase mb-1">Next Stop</p>
                                <p className="text-lg font-bold text-[#1B4332]">{nextStop.name}</p>
                            </div>
                            <Navigation2 className="w-6 h-6 text-[#E07A5F]" />
                        </div>
                    </motion.div>
                )}

                {/* Route Progress */}
                {busStops.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E9ECEF]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[#1B4332] flex items-center gap-2">
                                <Route className="w-4 h-4 text-[#2D6A4F]" />
                                Route Progress
                            </h3>
                            <span className="text-xs text-white bg-[#2D6A4F] px-3 py-1 rounded-full font-semibold">
                                {passedStops.size} / {busStops.length}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-[#E9ECEF] rounded-full overflow-hidden mb-4">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#2D6A4F] to-[#40916C]"
                                initial={{ width: 0 }}
                                animate={{ width: `${busStops.length > 0 ? (passedStops.size / busStops.length) * 100 : 0}%` }}
                            />
                        </div>

                        {/* Stops List */}
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {busStops.map(stop => {
                                const isPassed = passedStops.has(stop.id);
                                const isNext = nextStop?.id === stop.id;
                                return (
                                    <div
                                        key={stop.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isPassed ? 'bg-[#D8F3DC]' :
                                            isNext ? 'bg-[#FFF1E6] border border-[#E07A5F]/20' :
                                                'bg-[#F8F9FA]'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isPassed ? 'bg-[#2D6A4F] text-white' :
                                            isNext ? 'bg-[#E07A5F] text-white' :
                                                'bg-[#E9ECEF] text-[#74796D]'
                                            }`}>
                                            {isPassed ? <CheckCircle className="w-4 h-4" /> : stop.order}
                                        </div>
                                        <span className={`text-sm flex-1 ${isPassed ? 'text-[#2D6A4F] line-through' :
                                            isNext ? 'text-[#E07A5F] font-semibold' :
                                                'text-[#1B4332]'
                                            }`}>
                                            {stop.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverHome;
