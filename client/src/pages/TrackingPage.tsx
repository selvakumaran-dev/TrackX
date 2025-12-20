/**
 * Tracking Page - Ultra Premium with Journey Progress
 * Shows bus route: Reached stops → Current location → Upcoming stops
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
    Search, Bus, MapPin, Gauge, Navigation, X, CheckCircle,
    AlertCircle, Star, Share2, Wifi, WifiOff, Target, Route, Timer,
    Sparkles, Locate, Navigation2, MapPinned, Circle as CircleIcon,
    ArrowDown, Flag
} from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socket';
import type { BusLocation, BusStop } from '../types';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TN_CENTER: [number, number] = [11.1271, 78.6569]; // Tamil Nadu center
const STOP_REACHED_THRESHOLD = 100; // meters

// Bus marker
const createBusIcon = (isOnline: boolean, speed: number) => L.divIcon({
    className: 'bus-marker',
    html: `
    <div class="bus-icon ${isOnline ? 'online' : 'offline'}">
      <div class="pulse-ring"></div>
      <div class="icon-body">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
          <circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>
        </svg>
      </div>
      ${speed > 0 ? `<span class="speed">${speed}</span>` : ''}
    </div>
  `,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
});

// User marker
const userIcon = L.divIcon({
    className: 'user-marker',
    html: `<div class="user-icon"><div class="pulse"></div><div class="dot"></div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

// Stop marker based on journey status
const createStopIcon = (status: 'reached' | 'current' | 'upcoming' | 'selected', order: number) => {
    const config: Record<string, { bg: string; border: string; text: string; pulse?: boolean }> = {
        reached: { bg: '#22c55e', border: '#16a34a', text: 'white' },
        current: { bg: '#f59e0b', border: '#d97706', text: 'white', pulse: true },
        selected: { bg: '#ec4899', border: '#db2777', text: 'white', pulse: true },
        upcoming: { bg: 'white', border: '#6366f1', text: '#6366f1' },
    };
    const c = config[status];
    const icon = status === 'reached' ? '✓' : order;
    return L.divIcon({
        className: `stop-${status}`,
        html: `<div style="width:28px;height:28px;background:${c.bg};border:2.5px solid ${c.border};border-radius:50%;display:flex;align-items:center;justify-content:center;color:${c.text};font-weight:700;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.2);${c.pulse ? 'animation:pulse 2s infinite;' : ''}">${icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
};

// Map controller
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, zoom, { duration: 0.8 }); }, [map, center, zoom]);
    return null;
}

// Haversine distance
function calcDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3, φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Smart ETA calculation with traffic patterns
const HOUR_FACTORS: { [key: number]: number } = {
    0: 1.2, 1: 1.25, 2: 1.3, 3: 1.3, 4: 1.25, 5: 1.15,
    6: 0.85, 7: 0.65, 8: 0.55, 9: 0.7, 10: 0.85,
    11: 0.9, 12: 0.8, 13: 0.85, 14: 0.9,
    15: 0.75, 16: 0.6, 17: 0.5, 18: 0.55, 19: 0.7,
    20: 0.9, 21: 1.0, 22: 1.1, 23: 1.15,
};

const AVG_BUS_SPEED = 35; // Base average speed km/h

const calcETA = (dist: number, speed: number): number => {
    const hour = new Date().getHours();
    const trafficFactor = HOUR_FACTORS[hour] || 1.0;

    // Use actual speed if moving, otherwise use adjusted base speed
    let effectiveSpeed = speed > 5 ? speed : AVG_BUS_SPEED;
    effectiveSpeed = effectiveSpeed * trafficFactor;

    // Ensure minimum speed of 10 km/h
    effectiveSpeed = Math.max(effectiveSpeed, 10);

    // Road distance is ~1.4x direct distance
    const roadDistance = (dist / 1000) * 1.4;

    return Math.round((roadDistance / effectiveSpeed) * 60);
};

const getTrafficCondition = (): { label: string; color: string } => {
    const hour = new Date().getHours();
    const factor = HOUR_FACTORS[hour] || 1.0;
    if (factor >= 1.0) return { label: 'Light', color: 'text-green-400' };
    if (factor >= 0.7) return { label: 'Moderate', color: 'text-yellow-400' };
    if (factor >= 0.5) return { label: 'Heavy', color: 'text-orange-400' };
    return { label: 'Very Heavy', color: 'text-red-400' };
};

const fmtETA = (min: number): string => {
    if (min < 1) return 'Arriving';
    if (min < 60) return `${min} min`;
    const hrs = Math.floor(min / 60);
    const mins = min % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};
const fmtDist = (m: number): string => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

interface StopWithStatus extends BusStop {
    status: 'reached' | 'current' | 'upcoming' | 'selected';
    distanceFromBus: number;
    eta: number;
}

const TrackingPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Array<{ busNumber: string; busName: string }>>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [selectedBus, setSelectedBus] = useState<string | null>(null);
    const [bus, setBus] = useState<BusLocation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [myStop, setMyStop] = useState<BusStop | null>(null);
    const [favs, setFavs] = useState<string[]>([]);
    const [panelHeight, setPanelHeight] = useState<'mini' | 'half' | 'full'>('half');
    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [gettingLoc, setGettingLoc] = useState(false);

    // Journey tracking state
    const [reachedStops, setReachedStops] = useState<Set<string>>(new Set());
    const [journeyStops, setJourneyStops] = useState<StopWithStatus[]>([]);

    // Track last socket update time using ref (doesn't trigger re-renders)
    const lastSocketUpdateRef = useRef<number>(Date.now());

    // Smart offline detection - only marks offline, never overrides socket updates
    const OFFLINE_THRESHOLD_MS = 15000; // 15 seconds
    useEffect(() => {
        if (!bus || !bus.isOnline) return;

        const checkOffline = () => {
            const timeSinceLastUpdate = Date.now() - lastSocketUpdateRef.current;
            if (timeSinceLastUpdate > OFFLINE_THRESHOLD_MS) {
                setBus(prev => prev ? { ...prev, isOnline: false } : prev);
            }
        };

        // Check every 3 seconds
        const interval = setInterval(checkOffline, 3000);
        return () => clearInterval(interval);
    }, [bus?.isOnline]);

    // Handle panel drag
    const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number } }) => {
        const y = info.offset.y;
        if (y < -50) setPanelHeight('full');
        else if (y > 100) setPanelHeight('mini');
        else setPanelHeight('half');
    };

    // Get user location
    const getMyLocation = () => {
        if (!navigator.geolocation) return;
        setGettingLoc(true);
        navigator.geolocation.getCurrentPosition(
            (p) => { setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setGettingLoc(false); },
            () => setGettingLoc(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Calculate journey progress - which stops are reached
    useEffect(() => {
        // No stops available
        if (!bus?.stops?.length) {
            setJourneyStops([]);
            return;
        }

        const sortedStops = [...bus.stops].sort((a, b) => a.order - b.order);

        // If bus has no location, show all stops as upcoming
        if (!bus?.lat || !bus?.lon) {
            const journey: StopWithStatus[] = sortedStops.map((stop) => {
                const isSelected = myStop?.id === stop.id;
                return {
                    ...stop,
                    status: isSelected ? 'selected' : 'upcoming',
                    distanceFromBus: 0,
                    eta: 0,
                };
            });
            setJourneyStops(journey);
            return;
        }

        // Pre-calculate all distances once to avoid redundant calculations
        const stopsWithDistance = sortedStops.map(stop => ({
            ...stop,
            dist: calcDist(bus.lat!, bus.lon!, stop.latitude, stop.longitude)
        }));

        const newReached = new Set(reachedStops);

        // Find which stop bus is closest to
        let closestStopIndex = 0;
        let minDist = Infinity;
        stopsWithDistance.forEach((stop, idx) => {
            if (stop.dist < minDist) {
                minDist = stop.dist;
                closestStopIndex = idx;
            }
            // If bus is very close to a stop, mark it as reached
            if (stop.dist < STOP_REACHED_THRESHOLD) {
                newReached.add(stop.id);
            }
        });

        // Mark all stops before the closest one as reached
        for (let i = 0; i < closestStopIndex; i++) {
            newReached.add(sortedStops[i].id);
        }

        // Update reached stops if changed
        if (newReached.size !== reachedStops.size) {
            setReachedStops(newReached);
        }

        // Build journey stops with status - reuse pre-calculated distances
        const journey: StopWithStatus[] = stopsWithDistance.map((stop, idx) => {
            const isReached = newReached.has(stop.id);
            const isCurrent = idx === closestStopIndex && stop.dist < STOP_REACHED_THRESHOLD * 3;
            const isSelected = myStop?.id === stop.id;

            let status: StopWithStatus['status'];
            if (isSelected) status = 'selected';
            else if (isReached && !isCurrent) status = 'reached';
            else if (isCurrent || (idx === closestStopIndex)) status = 'current';
            else status = 'upcoming';

            return {
                id: stop.id,
                name: stop.name,
                latitude: stop.latitude,
                longitude: stop.longitude,
                order: stop.order,
                busId: stop.busId,
                status,
                distanceFromBus: stop.dist,
                eta: calcETA(stop.dist, bus.speed || 0),
            };
        });

        setJourneyStops(journey);
    }, [bus, myStop, reachedStops]);

    // Get stats
    const reachedCount = journeyStops.filter(s => s.status === 'reached').length;
    const currentStop = journeyStops.find(s => s.status === 'current');
    const nextUpcoming = journeyStops.find(s => s.status === 'upcoming');
    const toUserDist = userLoc && bus?.lat && bus?.lon ? calcDist(bus.lat, bus.lon, userLoc.lat, userLoc.lng) : null;
    const toUserETA = toUserDist ? calcETA(toUserDist, bus?.speed || 0) : null;

    // Load favorites
    useEffect(() => {
        const s = localStorage.getItem('trackx_favs');
        if (s) setFavs(JSON.parse(s));
    }, []);

    // URL params
    useEffect(() => {
        const b = searchParams.get('bus');
        if (b) { setSelectedBus(b); setQuery(b); }
    }, [searchParams]);

    // Search suggestions
    useEffect(() => {
        if (query.length < 1) { setSuggestions([]); return; }
        const t = setTimeout(async () => {
            try {
                const r = await api.get('/public/buses', { params: { search: query, limit: 6 } });
                setSuggestions(r.data.data || []);
            } catch (e) { console.error(e); }
        }, 250);
        return () => clearTimeout(t);
    }, [query]);

    // Fetch bus
    const fetchBus = useCallback(async (num: string) => {
        setLoading(true); setError(null); setReachedStops(new Set());
        try {
            const r = await api.get(`/public/bus/${num}`);
            setBus(r.data.data);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } };
            setError(err.response?.data?.error || 'Bus not found');
            setBus(null);
        }
        setLoading(false);
    }, []);

    // Socket connection
    useEffect(() => {
        if (!selectedBus) return;
        fetchBus(selectedBus);
        socketService.connect();
        socketService.subscribeToBus(selectedBus);
        // When receiving socket updates, update ref timer and set isOnline: true
        const unsub = socketService.onLocationUpdate((d) => {
            // Case-insensitive comparison (server normalizes to uppercase)
            if (d.busNumber?.toUpperCase() === selectedBus.toUpperCase()) {
                // Only process if the update has actual GPS coordinates
                if (d.lat && d.lon) {
                    lastSocketUpdateRef.current = Date.now(); // Reset offline timer
                    setBus(p => p ? { ...p, ...d, isOnline: true } : { ...d, isOnline: true });
                } else if (d.isOnline === false) {
                    // Server explicitly says bus is offline
                    setBus(p => p ? { ...p, ...d } : d);
                }
            }
        });

        return () => {
            unsub();
            socketService.unsubscribeFromBus(selectedBus);
        };
    }, [selectedBus, fetchBus]);

    const selectBus = (num: string) => { setSelectedBus(num); setQuery(num); setShowSearch(false); setReachedStops(new Set()); };
    const toggleFav = (num: string) => {
        const u = favs.includes(num) ? favs.filter(f => f !== num) : [...favs, num];
        setFavs(u); localStorage.setItem('trackx_favs', JSON.stringify(u));
    };
    const share = async () => {
        if (!selectedBus) return;
        const url = `${location.origin}/track?bus=${selectedBus}`;
        navigator.share ? await navigator.share({ title: `Bus ${selectedBus}`, url }) : navigator.clipboard.writeText(url);
    };

    const myStopData = journeyStops.find(s => s.id === myStop?.id);
    const panelHeights = { mini: 'calc(100% - 100px)', half: 'calc(100% - 50%)', full: '80px' };

    // Route polyline coordinates
    const routeCoords: [number, number][] = journeyStops.map(s => [s.latitude, s.longitude]);

    return (
        <div className="h-[100dvh] w-full relative overflow-hidden bg-slate-900">
            <style>{`
        .bus-icon{position:relative;display:flex;align-items:center;justify-content:center}
        .bus-icon.online .pulse-ring{position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(99,102,241,.25);animation:pulse-ring 2s infinite}
        .bus-icon .icon-body{width:40px;height:40px;background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 16px rgba(99,102,241,.4);border:3px solid #fff;position:relative;z-index:2}
        .bus-icon .icon-body svg{width:20px;height:20px}
        .bus-icon.offline .icon-body{background:linear-gradient(135deg,#64748b,#475569);box-shadow:0 2px 8px rgba(0,0,0,.3)}
        .bus-icon .speed{position:absolute;bottom:-6px;right:-6px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:8px;box-shadow:0 2px 6px rgba(34,197,94,.4);z-index:3}
        .user-icon{position:relative;display:flex;align-items:center;justify-content:center}
        .user-icon .pulse{position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(59,130,246,.3);animation:pulse-ring 2s infinite}
        .user-icon .dot{width:14px;height:14px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,.5);z-index:2}
        @keyframes pulse-ring{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.4);opacity:0}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        .glass{background:rgba(15,23,42,.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.08)}
        .touch-btn{min-height:48px;min-width:48px}
        .journey-line{position:relative}
        .journey-line::before{content:'';position:absolute;left:14px;top:28px;bottom:28px;width:3px;background:linear-gradient(to bottom,#22c55e,#6366f1)}
      `}</style>

            {/* Map */}
            <MapContainer center={TN_CENTER} zoom={8} className="h-full w-full z-0" zoomControl={false} attributionControl={false}>
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

                {/* Route line - show even without bus location */}
                {routeCoords.length > 1 && (
                    <Polyline positions={routeCoords} pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.6, dashArray: '10, 10' }} />
                )}

                {/* Map controller - center on bus if online, or first stop if offline */}
                {bus?.lat && bus?.lon ? (
                    <MapController center={[bus.lat, bus.lon]} zoom={16} />
                ) : journeyStops.length > 0 ? (
                    <MapController center={[journeyStops[0].latitude, journeyStops[0].longitude]} zoom={14} />
                ) : null}

                {/* Bus marker - only if has location */}
                {bus?.lat && bus?.lon && (
                    <>
                        {bus.accuracy && <Circle center={[bus.lat, bus.lon]} radius={bus.accuracy} pathOptions={{ fillColor: '#6366f1', fillOpacity: 0.08, color: '#6366f1', weight: 1 }} />}
                        <Marker position={[bus.lat, bus.lon]} icon={createBusIcon(bus.isOnline, bus.speed || 0)}>
                            <Popup><div className="text-center"><strong>{bus.busNumber}</strong><br /><span className="text-gray-500">{bus.busName}</span></div></Popup>
                        </Marker>
                    </>
                )}

                {/* Stop markers - always show if we have stops */}
                {journeyStops.map(s => (
                    <Marker key={s.id} position={[s.latitude, s.longitude]} icon={createStopIcon(s.status, s.order)}
                        eventHandlers={{ click: () => s.status !== 'reached' && setMyStop(s) }} />
                ))}

                {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon} />}
            </MapContainer>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-[1000] p-3">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <AnimatePresence mode="wait">
                            {showSearch ? (
                                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass rounded-2xl shadow-xl">
                                    <div className="flex items-center px-4 py-3">
                                        <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
                                        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Bus number..."
                                            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-base" />
                                        <button onClick={() => { setShowSearch(false); setQuery(''); }} className="touch-btn -mr-2"><X className="w-5 h-5 text-slate-400" /></button>
                                    </div>
                                    {suggestions.length > 0 && (
                                        <div className="border-t border-white/5 max-h-60 overflow-auto">
                                            {suggestions.map(s => (
                                                <button key={s.busNumber} onClick={() => selectBus(s.busNumber)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center"><Bus className="w-5 h-5 text-indigo-400" /></div>
                                                    <div className="flex-1 text-left"><p className="text-white font-medium">{s.busNumber}</p><p className="text-xs text-slate-500">{s.busName}</p></div>
                                                    {favs.includes(s.busNumber) && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.button initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={() => setShowSearch(true)} className="glass rounded-2xl shadow-xl w-full flex items-center gap-3 px-4 py-3">
                                    <Search className="w-5 h-5 text-slate-400" />
                                    <span className="text-slate-400 text-base flex-1 text-left">{selectedBus || 'Search bus...'}</span>
                                    {selectedBus && <Bus className="w-5 h-5 text-indigo-400" />}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                    <button onClick={getMyLocation} disabled={gettingLoc} className="glass rounded-2xl shadow-xl touch-btn px-4">
                        {gettingLoc ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Locate className="w-5 h-5 text-blue-400" />}
                    </button>
                </div>
            </div>

            {/* User Location ETA */}
            <AnimatePresence>
                {userLoc && bus && toUserETA !== null && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="absolute top-20 left-3 right-3 z-[999] glass rounded-2xl p-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center"><Navigation2 className="w-6 h-6 text-white" /></div>
                                <div><p className="text-xs text-blue-400 font-semibold uppercase">Bus to You</p><p className="text-2xl font-bold text-white">{fmtETA(toUserETA)}</p></div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-semibold text-slate-300">{fmtDist(toUserDist!)}</p>
                                <button onClick={() => setUserLoc(null)} className="text-xs text-slate-500 hover:text-white">Clear</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Sheet */}
            <AnimatePresence>
                {selectedBus && bus && (
                    <motion.div initial={{ y: '100%' }} animate={{ y: panelHeights[panelHeight] }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }} drag="y" dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.1} onDragEnd={handleDrag} className="absolute bottom-0 left-0 right-0 z-[1000] glass rounded-t-3xl shadow-2xl"
                        style={{ height: 'calc(100dvh - 60px)' }}>
                        <div className="flex justify-center py-3 cursor-grab"><div className="w-10 h-1.5 bg-slate-600 rounded-full" /></div>

                        <div className="px-4 pb-4 h-full overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bus.isOnline ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' : 'bg-slate-700'}`}>
                                        <Bus className="w-7 h-7 text-white" />
                                    </div>
                                    <div><h2 className="text-xl font-bold text-white">{bus.busNumber}</h2><p className="text-sm text-slate-400">{bus.busName}</p></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => toggleFav(selectedBus)} className={`touch-btn rounded-xl ${favs.includes(selectedBus) ? 'bg-amber-500/20' : 'bg-slate-800'}`}>
                                        <Star className={`w-5 h-5 ${favs.includes(selectedBus) ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                                    </button>
                                    <button onClick={share} className="touch-btn rounded-xl bg-slate-800"><Share2 className="w-5 h-5 text-slate-400" /></button>
                                </div>
                            </div>

                            {/* Stats - Horizontal Compact Pills */}
                            <div className="flex items-center gap-2 mb-3 flex-shrink-0 flex-wrap">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${bus.isOnline ? 'bg-emerald-500/15' : 'bg-slate-800/80'}`}>
                                    {bus.isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-slate-500" />}
                                    <span className={`text-xs font-semibold ${bus.isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {bus.isOnline ? 'Live' : 'Offline'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-indigo-500/15">
                                    <Gauge className="w-3 h-3 text-indigo-400" />
                                    <span className="text-xs font-semibold text-indigo-400">{bus.speed || 0} km/h</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-teal-500/15">
                                    <CheckCircle className="w-3 h-3 text-teal-400" />
                                    <span className="text-xs font-semibold text-teal-400">{reachedCount}/{journeyStops.length} stops</span>
                                </div>
                            </div>

                            {/* Traffic Condition - Minimal Inline */}
                            {bus.isOnline && (
                                <div className="flex items-center gap-3 mb-3 flex-shrink-0">
                                    <div className="flex items-center gap-1.5 bg-slate-800/40 rounded-full px-2.5 py-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${getTrafficCondition().color.replace('text-', 'bg-')} animate-pulse`} />
                                        <span className="text-[10px] text-slate-400">Traffic</span>
                                        <span className={`text-[10px] font-semibold ${getTrafficCondition().color}`}>{getTrafficCondition().label}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-600">• Smart ETA active</span>
                                </div>
                            )}

                            {/* Offline Notice - Show when bus not sending GPS */}
                            {!bus.isOnline && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0"
                                >
                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <WifiOff className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-amber-400">Bus Not Tracking</p>
                                        <p className="text-[10px] text-amber-400/70">ETA unavailable until driver starts tracking</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* My Stop Selection - Compact */}
                            {myStopData && myStopData.status !== 'reached' && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent rounded-xl px-3 py-2.5 mb-3 flex-shrink-0 border-l-2 border-pink-400">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/20">
                                            <Target className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-white flex items-center gap-1">
                                                <Sparkles className="w-2.5 h-2.5 text-pink-400" />
                                                {myStopData.name.length > 18 ? myStopData.name.slice(0, 18) + '...' : myStopData.name}
                                            </p>
                                            <p className="text-[10px] text-slate-500">{fmtDist(myStopData.distanceFromBus)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                                            {fmtETA(myStopData.eta)}
                                        </span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                                    </div>
                                </motion.div>
                            )}

                            {/* ETA to Your Location - Compact Gen-Z Style */}
                            {userLoc && bus?.lat && bus?.lon ? (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent rounded-xl px-3 py-2.5 mb-3 flex-shrink-0 border-l-2 border-blue-400">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <Navigation2 className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-white">Bus to You</p>
                                            <p className="text-[10px] text-slate-500">{toUserDist ? fmtDist(toUserDist) : '--'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                            {toUserETA !== null ? fmtETA(toUserETA) : '--'}
                                        </span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    </div>
                                </motion.div>
                            ) : bus?.lat && bus?.lon && (
                                <button onClick={getMyLocation} disabled={gettingLoc}
                                    className="group w-full flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/80 rounded-xl px-3 py-2 mb-3 flex-shrink-0 transition-all duration-200 active:scale-[0.98]">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${gettingLoc ? 'bg-blue-500/20' : 'bg-slate-700/80 group-hover:bg-gradient-to-br group-hover:from-blue-500/20 group-hover:to-cyan-500/20'}`}>
                                            {gettingLoc ? (
                                                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Locate className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                                            {gettingLoc ? 'Getting location...' : 'Tap for ETA to you'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-slate-600 group-hover:text-slate-500">📍</span>
                                    </div>
                                </button>
                            )}
                            {journeyStops.length > 0 && (
                                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Route className="w-4 h-4 text-indigo-400" />Journey Progress</h3>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4 flex-shrink-0">
                                        <motion.div className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-500"
                                            initial={{ width: 0 }} animate={{ width: `${journeyStops.length > 0 ? ((reachedCount + (currentStop ? 0.5 : 0)) / journeyStops.length) * 100 : 0}%` }} />
                                    </div>

                                    {/* Stops List */}
                                    <div className="flex-1 overflow-y-auto space-y-1 pb-4">
                                        {journeyStops.map((stop, idx) => (
                                            <motion.button key={stop.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }} onClick={() => stop.status !== 'reached' && setMyStop(stop)}
                                                disabled={stop.status === 'reached'}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${stop.status === 'selected' ? 'bg-pink-500/15 border border-pink-500/30' :
                                                    stop.status === 'reached' ? 'bg-emerald-500/5' :
                                                        stop.status === 'current' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/60 active:bg-slate-700'
                                                    }`}>

                                                {/* Stop indicator with connection line */}
                                                <div className="relative">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 relative ${stop.status === 'selected' ? 'bg-pink-500 text-white' :
                                                        stop.status === 'reached' ? 'bg-emerald-500 text-white' :
                                                            stop.status === 'current' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'
                                                        }`}>
                                                        {stop.status === 'reached' ? <CheckCircle className="w-4 h-4" /> : stop.order}
                                                    </div>
                                                    {/* Connection line */}
                                                    {idx < journeyStops.length - 1 && (
                                                        <div className={`absolute top-8 left-1/2 w-0.5 h-5 -translate-x-1/2 ${stop.status === 'reached' ? 'bg-emerald-500' : 'bg-slate-700'
                                                            }`} />
                                                    )}
                                                </div>

                                                {/* Stop info */}
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className={`text-sm font-medium truncate ${stop.status === 'selected' ? 'text-pink-400' :
                                                        stop.status === 'reached' ? 'text-emerald-400' :
                                                            stop.status === 'current' ? 'text-amber-400' : 'text-white'
                                                        }`}>{stop.name}</p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {stop.status === 'reached' ? '✓ Reached' :
                                                            stop.status === 'current' ? '● At stop now' :
                                                                stop.distanceFromBus > 0 ? `${fmtDist(stop.distanceFromBus)} away` : 'Waiting for bus'}
                                                    </p>
                                                </div>

                                                {/* ETA */}
                                                {stop.status !== 'reached' && (
                                                    <div className="text-right">
                                                        <span className={`text-sm font-bold ${stop.status === 'selected' ? 'text-pink-400' :
                                                            stop.status === 'current' ? 'text-amber-400' : 'text-indigo-400'
                                                            }`}>{stop.status === 'current' ? 'Now' : stop.eta > 0 ? fmtETA(stop.eta) : '--'}</span>
                                                    </div>
                                                )}
                                            </motion.button>
                                        ))}

                                        {/* End of route */}
                                        <div className="flex items-center gap-3 p-3 opacity-50">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                                                <Flag className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <span className="text-sm text-slate-500">End of Route</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading */}
            <AnimatePresence>
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[2000] bg-slate-900/90 backdrop-blur flex items-center justify-center">
                        <div className="text-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-white font-medium">Finding bus...</p></div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
                {error && !loading && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-24 left-3 right-3 z-[1001]">
                        <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-red-500/30">
                            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" /><p className="text-red-400 flex-1">{error}</p>
                            <button onClick={() => setError(null)} className="touch-btn -mr-2"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {!selectedBus && !loading && (
                <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none px-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 bg-indigo-500/20 rounded-full flex items-center justify-center">
                            <MapPinned className="w-12 h-12 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Track Your Bus</h2>
                        <p className="text-slate-400 max-w-xs mx-auto mb-6">See live location and which stops are reached</p>
                        {favs.length > 0 && (
                            <div className="pointer-events-auto">
                                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">Favorites</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {favs.map(f => (
                                        <button key={f} onClick={() => selectBus(f)} className="px-4 py-2.5 glass rounded-full text-sm text-white flex items-center gap-2 active:scale-95">
                                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default TrackingPage;
