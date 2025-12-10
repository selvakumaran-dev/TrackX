/**
 * Driver Home - Ultra Mobile-First Premium Design
 * 100% of drivers use mobile for GPS tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Play, Square, Wifi, WifiOff, AlertCircle, Bus,
    Gauge, Clock, Navigation, Signal, Target, Zap, Route, CheckCircle,
    Navigation2, Timer, Activity
} from 'lucide-react';
import api from '../../services/api';
import type { BusStop } from '../../types';

// Speed Gauge Component - Mobile Optimized
function SpeedGauge({ speed, maxSpeed = 80 }: { speed: number; maxSpeed?: number }) {
    const percentage = Math.min((speed / maxSpeed) * 100, 100);
    const rotation = (percentage / 100) * 180 - 90;

    return (
        <div className="relative w-36 h-24 mx-auto">
            <svg className="w-full h-full" viewBox="0 0 144 72">
                <path d="M 12 72 A 60 60 0 0 1 132 72" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
                <path d="M 12 72 A 60 60 0 0 1 132 72" fill="none" stroke="url(#speedGrad)" strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${percentage * 1.88} 188`} />
                <defs>
                    <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute bottom-0 left-1/2 w-1 h-12 bg-white rounded-full origin-bottom transition-transform duration-300"
                style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }} />
            <div className="absolute bottom-0 left-1/2 w-3 h-3 -translate-x-1/2 translate-y-1/2 bg-white rounded-full shadow" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-center">
                <span className="text-3xl font-bold text-white">{speed}</span>
                <span className="text-sm text-slate-400 ml-1">km/h</span>
            </div>
        </div>
    );
}

interface AssignedBus {
    id: string;
    busNumber: string;
    busName: string;
    stops?: BusStop[];
}

const DriverHome: React.FC = () => {
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
                        const fullRes = await api.get(`/public/bus/${bus.busNumber}`);
                        if (fullRes.data.data?.stops) setBusStops(fullRes.data.data.stops);
                    } catch (e) { console.log('No stops available'); }
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

    // Check passed stops - only when tracking and GPS accuracy is good
    useEffect(() => {
        // Skip if not tracking or poor accuracy (> 200m)
        if (!isTracking || !currentLocation || !busStops.length || !accuracy || accuracy > 200) return;

        const newPassed = new Set(passedStops);
        busStops.forEach(stop => {
            const dist = calcDist(currentLocation.lat, currentLocation.lng, stop.latitude, stop.longitude);
            // Only mark as passed if within accuracy-adjusted radius
            const detectionRadius = Math.max(50, accuracy + 50); // At least 50m + accuracy buffer
            if (dist < detectionRadius) newPassed.add(stop.id);
        });
        if (newPassed.size !== passedStops.size) setPassedStops(newPassed);
    }, [currentLocation, busStops, passedStops, accuracy, isTracking]);

    // Send location
    const sendLocation = useCallback(async (pos: GeolocationPosition) => {
        if (!assignedBus) return;
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
            setError('Failed to send location');
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
                setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setCurrentSpeed(pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0);
                setAccuracy(Math.round(pos.coords.accuracy));
                setGpsStatus(pos.coords.accuracy > 50 ? 'weak' : 'active');
                setError(null); // Clear any previous error
            },
            (err) => {
                setGpsStatus('error');
                // User-friendly error messages
                if (err.code === 1) {
                    setError('GPS permission denied. Please allow location access.');
                } else if (err.code === 2) {
                    setError('GPS unavailable. Try going outdoors.');
                } else if (err.code === 3) {
                    setError('GPS is acquiring signal...');
                } else {
                    setError('GPS error. Please try again.');
                }
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
        );

        // Send location immediately on start
        navigator.geolocation.getCurrentPosition(
            sendLocation,
            (err) => console.log('Initial location error:', err.message),
            { enableHighAccuracy: true, timeout: 15000 }
        );

        // Then continue sending every 5 seconds
        intervalRef.current = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                sendLocation,
                () => { /* Silently ignore interval errors - watch handles UI updates */ },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }, 5000);
    };

    // Stop tracking
    const stopTracking = () => {
        setIsTracking(false);
        setGpsStatus('idle');
        if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
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
            <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-slate-900 pb-24 safe-b">
            <style>{`
        .safe-b{padding-bottom:max(96px,calc(96px + env(safe-area-inset-bottom)))}
        .touch-btn{min-height:56px;min-width:56px}
      `}</style>

            {/* Header with Bus Info */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-4 pt-6 pb-8 rounded-b-3xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                            <Bus className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">{assignedBus?.busNumber || 'No Bus'}</h1>
                            <p className="text-sm text-white/70">{assignedBus?.busName || 'Not assigned'}</p>
                        </div>
                    </div>

                    {/* GPS Status */}
                    <div className={`px-3 py-2 rounded-full flex items-center gap-2 ${gpsStatus === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                        gpsStatus === 'weak' ? 'bg-amber-500/20 text-amber-300' :
                            gpsStatus === 'acquiring' ? 'bg-blue-500/20 text-blue-300' :
                                gpsStatus === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/50'
                        }`}>
                        {gpsStatus === 'active' ? <Wifi className="w-4 h-4" /> :
                            gpsStatus === 'weak' ? <Signal className="w-4 h-4" /> :
                                gpsStatus === 'acquiring' ? <Navigation className="w-4 h-4 animate-pulse" /> :
                                    gpsStatus === 'error' ? <AlertCircle className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        <span className="text-xs font-semibold">
                            {gpsStatus === 'active' ? 'LIVE' : gpsStatus === 'weak' ? 'WEAK' :
                                gpsStatus === 'acquiring' ? '...' : gpsStatus === 'error' ? 'ERR' : 'OFF'}
                        </span>
                    </div>
                </div>

                {/* Speed Gauge - Only when tracking */}
                <AnimatePresence>
                    {isTracking && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-slate-900/40 backdrop-blur rounded-2xl p-6 pt-4">
                            <SpeedGauge speed={currentSpeed} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="mx-4 mt-4 flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <span className="text-sm text-red-400">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="px-4 -mt-4 relative z-10 space-y-4">

                {/* Start/Stop Button - Large Touch Target */}
                {assignedBus ? (
                    <motion.button onClick={isTracking ? stopTracking : startTracking} whileTap={{ scale: 0.98 }}
                        className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl touch-btn ${isTracking ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30'
                            }`}>
                        {isTracking ? <><Square className="w-6 h-6" /> Stop Tracking</> : <><Play className="w-6 h-6" /> Start Trip</>}
                    </motion.button>
                ) : (
                    <div className="bg-slate-800 rounded-2xl p-8 text-center">
                        <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <h3 className="text-lg font-bold text-white mb-2">No Bus Assigned</h3>
                        <p className="text-slate-400 text-sm">Contact your administrator</p>
                    </div>
                )}

                {/* Live Stats - Mobile Grid */}
                <AnimatePresence>
                    {isTracking && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                            className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-indigo-400" />
                                    <span className="text-xs text-slate-500 uppercase">Time</span>
                                </div>
                                <p className="text-2xl font-bold text-white font-mono">{formatDuration(tripStartTime)}</p>
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Route className="w-4 h-4 text-teal-400" />
                                    <span className="text-xs text-slate-500 uppercase">Distance</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{(tripDistance / 1000).toFixed(1)} km</p>
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    <span className="text-xs text-slate-500 uppercase">Updates</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{sendCount}</p>
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-4 h-4 text-pink-400" />
                                    <span className="text-xs text-slate-500 uppercase">Accuracy</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{accuracy ? `±${accuracy}m` : '--'}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Next Stop */}
                {isTracking && nextStop && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-2xl p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xl">{nextStop.order}</div>
                            <div className="flex-1">
                                <p className="text-xs text-amber-400 font-semibold uppercase">Next Stop</p>
                                <p className="text-lg font-bold text-white">{nextStop.name}</p>
                            </div>
                            <Navigation2 className="w-6 h-6 text-amber-400" />
                        </div>
                    </motion.div>
                )}

                {/* Route Progress */}
                {busStops.length > 0 && (
                    <div className="bg-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Route className="w-4 h-4 text-indigo-400" /> Route
                            </h3>
                            <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full font-semibold">
                                {passedStops.size}/{busStops.length}
                            </span>
                        </div>

                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                            <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500" initial={{ width: 0 }}
                                animate={{ width: `${busStops.length > 0 ? (passedStops.size / busStops.length) * 100 : 0}%` }} />
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto">
                            {busStops.map(stop => {
                                const isPassed = passedStops.has(stop.id);
                                const isNext = nextStop?.id === stop.id;
                                return (
                                    <div key={stop.id} className={`flex items-center gap-3 p-3 rounded-xl ${isPassed ? 'bg-emerald-500/10' : isNext ? 'bg-amber-500/10' : 'bg-slate-700/50'
                                        }`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isPassed ? 'bg-emerald-500 text-white' : isNext ? 'bg-amber-500 text-white' : 'bg-slate-600 text-slate-300'
                                            }`}>{isPassed ? <CheckCircle className="w-4 h-4" /> : stop.order}</div>
                                        <span className={`text-sm flex-1 ${isPassed ? 'text-emerald-400 line-through' : isNext ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}>
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
