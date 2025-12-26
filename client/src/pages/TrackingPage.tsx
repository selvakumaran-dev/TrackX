/**
 * Tracking Page - Human-Centered Design
 * 
 * Design Philosophy:
 * - Warm, calming color palette (sage green, cream, coral)
 * - Clean, spacious UI
 * - Excellent organization code integration
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
    Search, Bus, MapPin, Gauge, X, CheckCircle, Building2,
    AlertCircle, Star, Share2, Wifi, WifiOff, Target, Route,
    Locate, Navigation2, MapPinned, Flag, ArrowLeft, Clock
} from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socket';
import type { BusLocation, BusStop } from '../types';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TN_CENTER: [number, number] = [11.1271, 78.6569];
const STOP_REACHED_THRESHOLD = 100;

// Bus marker with warm colors
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

const userIcon = L.divIcon({
    className: 'user-marker',
    html: `<div class="user-icon"><div class="pulse"></div><div class="dot"></div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const createStopIcon = (status: 'reached' | 'current' | 'upcoming' | 'selected', order: number) => {
    const config: Record<string, { bg: string; border: string; text: string; pulse?: boolean }> = {
        reached: { bg: '#2D6A4F', border: '#1B4332', text: 'white' },
        current: { bg: '#E07A5F', border: '#C9634A', text: 'white', pulse: true },
        selected: { bg: '#457B9D', border: '#1D3557', text: 'white', pulse: true },
        upcoming: { bg: 'white', border: '#2D6A4F', text: '#2D6A4F' },
    };
    const c = config[status];
    const icon = status === 'reached' ? '✓' : order;
    return L.divIcon({
        className: `stop-${status}`,
        html: `<div style="width:28px;height:28px;background:${c.bg};border:2.5px solid ${c.border};border-radius:50%;display:flex;align-items:center;justify-content:center;color:${c.text};font-weight:700;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.15);${c.pulse ? 'animation:pulse 2s infinite;' : ''}">${icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
};

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, zoom, { duration: 0.8 }); }, [map, center, zoom]);
    return null;
}

function calcDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3, φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const HOUR_FACTORS: { [key: number]: number } = {
    0: 1.2, 1: 1.25, 2: 1.3, 3: 1.3, 4: 1.25, 5: 1.15,
    6: 0.85, 7: 0.65, 8: 0.55, 9: 0.7, 10: 0.85,
    11: 0.9, 12: 0.8, 13: 0.85, 14: 0.9,
    15: 0.75, 16: 0.6, 17: 0.5, 18: 0.55, 19: 0.7,
    20: 0.9, 21: 1.0, 22: 1.1, 23: 1.15,
};

const AVG_BUS_SPEED = 25; // Synchronized with backend BASE_SPEED

const calcETA = (dist: number, speed: number): number => {
    const hour = new Date().getHours();
    const trafficFactor = HOUR_FACTORS[hour] || 1.0;
    let effectiveSpeed = speed > 5 ? speed : AVG_BUS_SPEED;
    effectiveSpeed = effectiveSpeed * trafficFactor;
    effectiveSpeed = Math.max(effectiveSpeed, 10);
    const roadDistance = (dist / 1000) * 1.4;
    return Math.round((roadDistance / effectiveSpeed) * 60);
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
    const [query, setQuery] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('bus') || '';
    });
    const [suggestions, setSuggestions] = useState<Array<{ busNumber: string; busName: string }>>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [selectedBus, setSelectedBus] = useState<string | null>(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('bus');
    });
    const [bus, setBus] = useState<BusLocation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [myStop, setMyStop] = useState<BusStop | null>(null);
    const [favs, setFavs] = useState<string[]>([]);
    const [panelHeight, setPanelHeight] = useState<'mini' | 'half' | 'full'>('half');
    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [gettingLoc, setGettingLoc] = useState(false);

    const [reachedStops, setReachedStops] = useState<Set<string>>(new Set());
    const [journeyStops, setJourneyStops] = useState<StopWithStatus[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Track connectivity
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Organization state
    const [orgCode, setOrgCode] = useState<string | null>(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlOrg = urlParams.get('org');
        if (urlOrg) return urlOrg.toUpperCase();
        return localStorage.getItem('trackx_last_org');
    });
    const [orgName, setOrgName] = useState<string | null>(null);
    const [orgCity, setOrgCity] = useState<string | null>(null);
    const [orgInput, setOrgInput] = useState('');
    const [orgSearching, setOrgSearching] = useState(false);
    const [orgError, setOrgError] = useState('');


    const lastSocketUpdateRef = useRef<number>(Date.now());
    const OFFLINE_THRESHOLD_MS = 30000; // 30 seconds
    useEffect(() => {
        if (!bus || !bus.isOnline) return;
        const checkOffline = () => {
            const timeSinceLastUpdate = Date.now() - lastSocketUpdateRef.current;
            if (timeSinceLastUpdate > OFFLINE_THRESHOLD_MS) {
                setBus(prev => prev ? { ...prev, isOnline: false } : prev);
            }
        };
        const interval = setInterval(checkOffline, 3000);
        return () => clearInterval(interval);
    }, [bus?.isOnline]);

    const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number } }) => {
        const y = info.offset.y;
        if (y < -50) setPanelHeight('full');
        else if (y > 100) setPanelHeight('mini');
        else setPanelHeight('half');
    };

    const getMyLocation = () => {
        if (!navigator.geolocation) return;
        setGettingLoc(true);
        navigator.geolocation.getCurrentPosition(
            (p) => { setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setGettingLoc(false); },
            () => setGettingLoc(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Calculate journey progress
    useEffect(() => {
        if (!bus?.stops?.length) { setJourneyStops([]); return; }
        const sortedStops = [...bus.stops].sort((a, b) => a.order - b.order);
        if (!bus?.lat || !bus?.lon) {
            const journey: StopWithStatus[] = sortedStops.map((stop) => ({
                ...stop,
                status: myStop?.id === stop.id ? 'selected' : 'upcoming',
                distanceFromBus: 0,
                eta: 0,
            }));
            setJourneyStops(journey);
            return;
        }
        const stopsWithDistance = sortedStops.map(stop => ({
            ...stop,
            dist: calcDist(bus.lat!, bus.lon!, stop.latitude, stop.longitude)
        }));
        const newReached = new Set(reachedStops);
        let closestStopIndex = 0;
        let minDist = Infinity;
        stopsWithDistance.forEach((stop, idx) => {
            if (stop.dist < minDist) { minDist = stop.dist; closestStopIndex = idx; }
            if (stop.dist < STOP_REACHED_THRESHOLD) { newReached.add(stop.id); }
        });
        for (let i = 0; i < closestStopIndex; i++) { newReached.add(sortedStops[i].id); }
        if (newReached.size !== reachedStops.size) setReachedStops(newReached);
        const journey: StopWithStatus[] = stopsWithDistance.map((stop, idx) => {
            const isReached = newReached.has(stop.id);
            const isCurrent = idx === closestStopIndex && stop.dist < STOP_REACHED_THRESHOLD * 3;
            const isSelected = myStop?.id === stop.id;
            let status: StopWithStatus['status'];
            if (isSelected) status = 'selected';
            else if (isReached && !isCurrent) status = 'reached';
            else if (isCurrent || (idx === closestStopIndex)) status = 'current';
            else status = 'upcoming';
            return { id: stop.id, name: stop.name, latitude: stop.latitude, longitude: stop.longitude, order: stop.order, busId: stop.busId, status, distanceFromBus: stop.dist, eta: calcETA(stop.dist, bus.speed || 0) };
        });
        setJourneyStops(journey);
    }, [bus, myStop, reachedStops]);

    const reachedCount = journeyStops.filter(s => s.status === 'reached').length;
    const currentStop = journeyStops.find(s => s.status === 'current');
    const nextUpcoming = journeyStops.find(s => s.status === 'upcoming');
    const toUserDist = userLoc && bus?.lat && bus?.lon ? calcDist(bus.lat, bus.lon, userLoc.lat, userLoc.lng) : null;
    const toUserETA = toUserDist ? calcETA(toUserDist, bus?.speed || 0) : null;

    useEffect(() => {
        const s = localStorage.getItem('trackx_favs');
        if (s) setFavs(JSON.parse(s));

        const b = searchParams.get('bus');
        const org = searchParams.get('org');

        if (b && b !== selectedBus) {
            setSelectedBus(b);
            setQuery(b);
        }

        const effectiveOrg = org?.toUpperCase() || orgCode;
        if (effectiveOrg) {
            setOrgCode(effectiveOrg);
            localStorage.setItem('trackx_last_org', effectiveOrg);
            api.get(`/organizations/lookup/${effectiveOrg}`).then(res => {
                if (res.data.success) {
                    setOrgName(res.data.data.name);
                    setOrgCity(res.data.data.city);
                } else {
                    setOrgCode(null);
                    setOrgName(null);
                    localStorage.removeItem('trackx_last_org');
                }
            }).catch(() => {
                setOrgCode(null);
                setOrgName(null);
                localStorage.removeItem('trackx_last_org');
            });
        }
    }, [searchParams]);

    useEffect(() => {
        if (query.length < 1) { setSuggestions([]); return; }
        const t = setTimeout(async () => {
            try {
                const params: { search: string; limit: number; orgCode?: string } = { search: query, limit: 6 };
                if (orgCode) params.orgCode = orgCode;
                const r = await api.get('/public/buses', { params });
                setSuggestions(r.data.data || []);
            } catch (e) { console.error(e); }
        }, 250);
        return () => clearTimeout(t);
    }, [query, orgCode]);

    const fetchBus = useCallback(async (num: string) => {
        setLoading(true); setError(null); setReachedStops(new Set());
        try {
            const params: { orgCode?: string } = {};
            if (orgCode) params.orgCode = orgCode;
            const r = await api.get(`/public/bus/${num}`, { params });
            const busData = r.data.data;
            if (busData?.updatedAt) {
                lastSocketUpdateRef.current = new Date(busData.updatedAt).getTime();
            }
            setBus(busData);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } };
            setError(err.response?.data?.error || 'Bus not found');
            setBus(null);
        }
        setLoading(false);
    }, [orgCode]);

    useEffect(() => {
        if (!selectedBus) return;
        fetchBus(selectedBus);
        socketService.connect();
    }, [selectedBus, fetchBus]);

    useEffect(() => {
        if (!bus?.busId) return;

        const unsub = socketService.onLocationUpdate((d) => {
            if (d.busId === bus.busId || (d.busNumber?.toUpperCase() === bus.busNumber.toUpperCase() && d.organizationId === bus.organizationId)) {
                if (d.lat && d.lon) {
                    lastSocketUpdateRef.current = Date.now();
                    // If we got coordinates, use the server's online status if provided, else assume live
                    const isNowOnline = d.isOnline !== undefined ? d.isOnline : true;
                    setBus(p => p ? { ...p, ...d, isOnline: isNowOnline } : { ...d, isOnline: isNowOnline } as BusLocation);
                } else if (d.isOnline !== undefined) {
                    setBus(p => p ? { ...p, isOnline: d.isOnline } : p);
                }
            }
        });

        socketService.subscribeToBus(bus.busId);
        return () => { unsub(); socketService.unsubscribeFromBus(bus.busId!); };
    }, [bus?.busId, bus?.busNumber, bus?.organizationId]);

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

    // Organization code handlers
    const handleOrgSearch = async () => {
        const code = orgInput.trim().toUpperCase();
        if (!code || code.length < 4) { setOrgError('Enter a valid code'); return; }
        setOrgSearching(true); setOrgError('');
        try {
            const res = await api.get(`/organizations/lookup/${code}`);
            if (res.data.success) {
                setOrgCode(code);
                localStorage.setItem('trackx_last_org', code);
                setOrgName(res.data.data.name);
                setOrgCity(res.data.data.city);
                setOrgInput('');
            }
        } catch { setOrgError('Organization not found'); }
        setOrgSearching(false);
    };

    const clearOrg = () => { setOrgCode(null); setOrgName(null); setOrgCity(null); localStorage.removeItem('trackx_last_org'); };

    const myStopData = journeyStops.find(s => s.id === myStop?.id);
    const panelHeights = { mini: 'calc(100% - 100px)', half: 'calc(100% - 50%)', full: '80px' };

    // Dynamic Route Coords: Connect bus position to upcoming stops
    const upcomingCoords: [number, number][] = journeyStops
        .filter(s => s.status !== 'reached')
        .map(s => [s.latitude, s.longitude]);

    const routeCoords: [number, number][] = bus?.lat && bus?.lon
        ? [[bus.lat, bus.lon], ...upcomingCoords]
        : journeyStops.map(s => [s.latitude, s.longitude]);

    return (
        <div className="h-[100dvh] w-full relative overflow-hidden bg-[#FDFBF7]">
            <style>{`
        .bus-icon{position:relative;display:flex;align-items:center;justify-content:center}
        .bus-icon.online .pulse-ring{position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(45,106,79,.25);animation:pulse-ring 2s infinite}
        .bus-icon .icon-body{width:40px;height:40px;background:linear-gradient(135deg,#2D6A4F,#40916C);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 16px rgba(45,106,79,.4);border:3px solid #fff;position:relative;z-index:2}
        .bus-icon .icon-body svg{width:20px;height:20px}
        .bus-icon.offline .icon-body{background:linear-gradient(135deg,#74796D,#95A3A4);box-shadow:0 2px 8px rgba(0,0,0,.2)}
        .bus-icon .speed{position:absolute;bottom:-6px;right:-6px;background:linear-gradient(135deg,#2D6A4F,#40916C);color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:8px;box-shadow:0 2px 6px rgba(45,106,79,.4);z-index:3}
        .user-icon{position:relative;display:flex;align-items:center;justify-content:center}
        .user-icon .pulse{position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(69,123,157,.3);animation:pulse-ring 2s infinite}
        .user-icon .dot{width:14px;height:14px;background:linear-gradient(135deg,#457B9D,#1D3557);border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(69,123,157,.5);z-index:2}
        @keyframes pulse-ring{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.4);opacity:0}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        .glass{background:rgba(255,255,255,.95);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(0,0,0,.06);box-shadow:0 4px 24px rgba(0,0,0,.08)}
        .touch-btn{min-height:48px;min-width:48px}
      `}</style>

            {/* Map */}
            <MapContainer center={TN_CENTER} zoom={8} className="h-full w-full z-0" zoomControl={false} attributionControl={false}>
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                {routeCoords.length > 1 && (
                    <Polyline positions={routeCoords} pathOptions={{ color: '#2D6A4F', weight: 4, opacity: 0.6, dashArray: '10, 10' }} />
                )}
                {bus?.lat && bus?.lon ? (
                    <MapController center={[bus.lat, bus.lon]} zoom={16} />
                ) : journeyStops.length > 0 ? (
                    <MapController center={[journeyStops[0].latitude, journeyStops[0].longitude]} zoom={14} />
                ) : null}
                {bus?.lat && bus?.lon && (
                    <>
                        {bus.accuracy && <Circle center={[bus.lat, bus.lon]} radius={bus.accuracy} pathOptions={{ fillColor: '#2D6A4F', fillOpacity: 0.08, color: '#2D6A4F', weight: 1 }} />}
                        <Marker position={[bus.lat, bus.lon]} icon={createBusIcon(bus.isOnline, bus.speed || 0)}>
                            <Popup><div className="text-center"><strong>{bus.busNumber}</strong><br /><span className="text-gray-500">{bus.busName}</span></div></Popup>
                        </Marker>
                    </>
                )}
                {journeyStops.map(s => (
                    <Marker key={s.id} position={[s.latitude, s.longitude]} icon={createStopIcon(s.status, s.order)}
                        eventHandlers={{ click: () => s.status !== 'reached' && setMyStop(s) }} />
                ))}
                {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon} />}
            </MapContainer>

            {/* Organization Banner - Mobile Optimized */}
            {orgName && (
                <div className="absolute top-0 left-0 right-0 z-[1001] bg-gradient-to-r from-[#2D6A4F] to-[#40916C] safe-t">
                    <div className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Building2 className="w-4 h-4 text-white/80 flex-shrink-0" />
                            <span className="text-white font-medium text-sm truncate">{orgName}{orgCity ? `, ${orgCity}` : ''}</span>
                        </div>
                        <button onClick={clearOrg} className="text-white/70 hover:text-white text-xs flex-shrink-0 ml-2 px-2 py-1 rounded-lg active:bg-white/10">
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Modern Header - Mobile First - Only shows when org is set */}
            {orgCode && (
                <div className={`absolute left-0 right-0 z-[1000] px-3 py-2 ${orgName ? 'top-9' : 'top-0 safe-t pt-3'}`}>
                    <div className="flex items-center gap-2">
                        {/* Back Button - Compact */}
                        <Link to="/" className="glass rounded-xl shadow-lg w-11 h-11 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform">
                            <ArrowLeft className="w-5 h-5 text-[#1B4332]" />
                        </Link>

                        {/* Search Bar - Flexible */}
                        <div className="flex-1 min-w-0 relative">
                            <AnimatePresence>
                                {!isOnline && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute -top-8 left-0 right-0 flex justify-center"
                                    >
                                        <div className="bg-[#E07A5F] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
                                            <WifiOff className="w-3 h-3" />
                                            Working Offline
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence mode="wait">
                                {showSearch ? (
                                    <motion.div
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.95, opacity: 0 }}
                                        className="glass rounded-xl shadow-lg"
                                    >
                                        <div className="flex items-center px-3 py-2.5">
                                            <Search className="w-4 h-4 text-[#74796D] mr-2 flex-shrink-0" />
                                            <input
                                                autoFocus
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                className="flex-1 bg-transparent text-[#1B4332] outline-none text-sm min-w-0"
                                                placeholder="e.g. SRM-TN"
                                            />
                                            <button
                                                onClick={() => { setShowSearch(false); setQuery(''); }}
                                                className="w-8 h-8 flex items-center justify-center -mr-1 rounded-lg active:bg-[#E9ECEF]"
                                            >
                                                <X className="w-4 h-4 text-[#74796D]" />
                                            </button>
                                        </div>
                                        {suggestions.length > 0 && (
                                            <div className="border-t border-[#E9ECEF] max-h-52 overflow-auto">
                                                {suggestions.map(s => (
                                                    <button
                                                        key={s.busNumber}
                                                        onClick={() => selectBus(s.busNumber)}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F8F9FA] active:bg-[#E9ECEF]"
                                                    >
                                                        <div className="w-9 h-9 rounded-lg bg-[#D8F3DC] flex items-center justify-center flex-shrink-0">
                                                            <Bus className="w-4 h-4 text-[#2D6A4F]" />
                                                        </div>
                                                        <div className="flex-1 text-left min-w-0">
                                                            <p className="text-[#1B4332] font-medium text-sm">{s.busNumber}</p>
                                                            <p className="text-xs text-[#74796D] truncate">{s.busName}</p>
                                                        </div>
                                                        {favs.includes(s.busNumber) && <Star className="w-3.5 h-3.5 text-[#E07A5F] fill-[#E07A5F] flex-shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.button
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        onClick={() => setShowSearch(true)}
                                        className="glass rounded-xl shadow-lg w-full flex items-center gap-2 px-3 py-2.5 active:scale-[0.98] transition-transform"
                                    >
                                        <Search className="w-4 h-4 text-[#74796D] flex-shrink-0" />
                                        <span className="text-[#74796D] text-sm flex-1 text-left truncate">
                                            {selectedBus || 'Search bus...'}
                                        </span>
                                        {selectedBus && <Bus className="w-4 h-4 text-[#2D6A4F] flex-shrink-0" />}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* My Location */}
                        <button
                            onClick={getMyLocation}
                            disabled={gettingLoc}
                            className="glass rounded-xl shadow-lg w-11 h-11 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 flex-shrink-0"
                        >
                            {gettingLoc ? (
                                <div className="w-4 h-4 border-2 border-[#457B9D] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Locate className="w-5 h-5 text-[#457B9D]" />
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Minimal Header - When no org is set (just back button) */}
            {!orgCode && (
                <div className="absolute left-0 right-0 z-[1000] px-3 py-2 top-0 safe-t pt-3">
                    <Link to="/" className="glass rounded-xl shadow-lg w-11 h-11 flex items-center justify-center active:scale-95 transition-transform">
                        <ArrowLeft className="w-5 h-5 text-[#1B4332]" />
                    </Link>
                </div>
            )}


            {/* Bottom Sheet */}
            <AnimatePresence>
                {selectedBus && bus && (
                    <motion.div initial={{ y: '100%' }} animate={{ y: panelHeights[panelHeight] }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }} drag="y" dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.1} onDragEnd={handleDrag} className="absolute bottom-0 left-0 right-0 z-[1000] glass rounded-t-3xl shadow-2xl"
                        style={{ height: 'calc(100dvh - 60px)' }}>
                        <div className="flex justify-center py-3 cursor-grab"><div className="w-10 h-1.5 bg-[#E9ECEF] rounded-full" /></div>

                        <div className="px-5 pb-4 h-full overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bus.isOnline ? 'bg-gradient-to-br from-[#2D6A4F] to-[#40916C]' : 'bg-[#74796D]'}`}>
                                        <Bus className="w-7 h-7 text-white" />
                                    </div>
                                    <div><h2 className="text-xl font-bold text-[#1B4332]">{bus.busNumber}</h2><p className="text-sm text-[#74796D]">{bus.busName}</p></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => toggleFav(selectedBus)} className={`touch-btn rounded-xl p-3 ${favs.includes(selectedBus) ? 'bg-[#FFF1E6]' : 'bg-[#F8F9FA]'}`}>
                                        <Star className={`w-5 h-5 ${favs.includes(selectedBus) ? 'text-[#E07A5F] fill-[#E07A5F]' : 'text-[#74796D]'}`} />
                                    </button>
                                    <button onClick={share} className="touch-btn rounded-xl bg-[#F8F9FA] p-3"><Share2 className="w-5 h-5 text-[#74796D]" /></button>
                                </div>
                            </div>

                            {/* Stats Pills */}
                            <div className="flex items-center gap-2 mb-3 flex-shrink-0 flex-wrap">
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${bus.isOnline ? 'bg-[#D8F3DC]' : 'bg-[#F8F9FA]'}`}>
                                    {bus.isOnline ? <Wifi className="w-3 h-3 text-[#2D6A4F]" /> : <WifiOff className="w-3 h-3 text-[#74796D]" />}
                                    <span className={`text-xs font-semibold ${bus.isOnline ? 'text-[#2D6A4F]' : 'text-[#74796D]'}`}>{bus.isOnline ? 'Live' : 'Offline'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E8F4F8]">
                                    <Gauge className="w-3 h-3 text-[#457B9D]" />
                                    <span className="text-xs font-semibold text-[#457B9D]">{bus.speed || 0} km/h</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D8F3DC]">
                                    <CheckCircle className="w-3 h-3 text-[#2D6A4F]" />
                                    <span className="text-xs font-semibold text-[#2D6A4F]">{reachedCount}/{journeyStops.length} stops</span>
                                </div>
                                {toUserDist !== null && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E8F4F8] border border-[#457B9D]/20">
                                        <MapPin className="w-3 h-3 text-[#457B9D]" />
                                        <span className="text-xs font-semibold text-[#457B9D]">{fmtDist(toUserDist)} to you</span>
                                    </div>
                                )}
                            </div>

                            {/* Offline Notice */}
                            {!bus.isOnline && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-[#FFF1E6] border border-[#E07A5F]/20 flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-[#E07A5F]/20 flex items-center justify-center"><WifiOff className="w-4 h-4 text-[#E07A5F]" /></div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-[#E07A5F]">Bus Not Tracking</p>
                                        <p className="text-[10px] text-[#E07A5F]/70">ETA unavailable</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* My Stop Selection */}
                            {myStopData && myStopData.status !== 'reached' && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between bg-[#E8F4F8] rounded-xl px-4 py-3 mb-3 flex-shrink-0 border-l-4 border-[#457B9D]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#457B9D] rounded-lg flex items-center justify-center"><Target className="w-5 h-5 text-white" /></div>
                                        <div>
                                            <p className="text-xs font-medium text-[#1B4332]">{myStopData.name.length > 20 ? myStopData.name.slice(0, 20) + '...' : myStopData.name}</p>
                                            <p className="text-[10px] text-[#74796D]">{fmtDist(myStopData.distanceFromBus)}</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-[#457B9D]">{fmtETA(myStopData.eta)}</span>
                                </motion.div>
                            )}

                            {/* Journey Progress */}
                            {journeyStops.length > 0 && (
                                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                        <h3 className="text-sm font-semibold text-[#1B4332] flex items-center gap-2"><Route className="w-4 h-4 text-[#2D6A4F]" />Route</h3>
                                    </div>
                                    <div className="h-2 bg-[#E9ECEF] rounded-full overflow-hidden mb-4 flex-shrink-0">
                                        <motion.div className="h-full bg-gradient-to-r from-[#2D6A4F] to-[#40916C]"
                                            initial={{ width: 0 }} animate={{ width: `${journeyStops.length > 0 ? ((reachedCount + (currentStop ? 0.5 : 0)) / journeyStops.length) * 100 : 0}%` }} />
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-1 pb-4">
                                        {journeyStops.map((stop, idx) => (
                                            <motion.button key={stop.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }} onClick={() => stop.status !== 'reached' && setMyStop(stop)}
                                                disabled={stop.status === 'reached'}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${stop.status === 'selected' ? 'bg-[#E8F4F8] border border-[#457B9D]/30' :
                                                    stop.status === 'reached' ? 'bg-[#D8F3DC]' :
                                                        stop.status === 'current' ? 'bg-[#FFF1E6] border border-[#E07A5F]/20' : 'bg-[#F8F9FA]'
                                                    }`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 relative ${stop.status === 'selected' ? 'bg-[#457B9D] text-white' :
                                                    stop.status === 'reached' ? 'bg-[#2D6A4F] text-white' :
                                                        stop.status === 'current' ? 'bg-[#E07A5F] text-white' : 'bg-[#E9ECEF] text-[#74796D]'
                                                    }`}>
                                                    {stop.status === 'reached' ? <CheckCircle className="w-4 h-4" /> : stop.order}
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className={`text-sm font-medium truncate ${stop.status === 'selected' ? 'text-[#457B9D]' :
                                                        stop.status === 'reached' ? 'text-[#2D6A4F]' :
                                                            stop.status === 'current' ? 'text-[#E07A5F]' : 'text-[#1B4332]'
                                                        }`}>{stop.name}</p>
                                                    <p className="text-[11px] text-[#74796D]">
                                                        {stop.status === 'reached' ? '✓ Reached' : stop.status === 'current' ? '● At stop now' : stop.distanceFromBus > 0 ? `${fmtDist(stop.distanceFromBus)} away` : 'Waiting'}
                                                    </p>
                                                </div>
                                                {stop.status !== 'reached' && (
                                                    <span className={`text-sm font-bold ${stop.status === 'selected' ? 'text-[#457B9D]' :
                                                        stop.status === 'current' ? 'text-[#E07A5F]' : 'text-[#2D6A4F]'
                                                        }`}>{stop.status === 'current' ? 'Now' : stop.eta > 0 ? fmtETA(stop.eta) : '--'}</span>
                                                )}
                                            </motion.button>
                                        ))}
                                        <div className="flex items-center gap-3 p-3 opacity-50">
                                            <div className="w-8 h-8 rounded-full bg-[#E9ECEF] flex items-center justify-center"><Flag className="w-4 h-4 text-[#74796D]" /></div>
                                            <span className="text-sm text-[#74796D]">End of Route</span>
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[2000] bg-[#FDFBF7]/90 backdrop-blur flex items-center justify-center">
                        <div className="text-center"><div className="w-12 h-12 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-[#1B4332] font-medium">Finding bus...</p></div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
                {error && !loading && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-24 left-3 right-3 z-[1001]">
                        <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-[#E07A5F]/30">
                            <AlertCircle className="w-6 h-6 text-[#E07A5F] flex-shrink-0" /><p className="text-[#E07A5F] flex-1">{error}</p>
                            <button onClick={() => setError(null)} className="touch-btn -mr-2"><X className="w-5 h-5 text-[#74796D]" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State - Org Code Required */}
            {!loading && (!orgCode || !orgName) && (
                <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none px-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center bg-white rounded-3xl p-8 shadow-xl pointer-events-auto max-w-sm w-full">
                        <div className="w-20 h-20 mx-auto mb-6 bg-[#D8F3DC] rounded-full flex items-center justify-center">
                            <Building2 className="w-10 h-10 text-[#2D6A4F]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#1B4332] mb-2 text-center uppercase tracking-tighter">Enter Your Institute Code</h2>
                        <p className="text-[#74796D] max-w-xs mx-auto mb-6">Ask your transport office for the code</p>

                        <input
                            type="text"
                            value={orgInput}
                            onChange={(e) => { setOrgInput(e.target.value.toUpperCase()); setOrgError(''); }}
                            className="w-full px-4 py-4 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] text-center text-xl font-mono tracking-widest focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition mb-3"
                            maxLength={12}
                        />

                        {orgError && <p className="text-sm text-[#E07A5F] text-center mb-3">{orgError}</p>}

                        <button
                            onClick={handleOrgSearch}
                            disabled={orgSearching || !orgInput.trim()}
                            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#2D6A4F] to-[#40916C] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {orgSearching ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Find My Institute
                                </>
                            )}
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Empty State - Org Set, No Bus Selected */}
            {!selectedBus && !loading && orgCode && orgName && (
                <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none px-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center bg-white rounded-3xl p-8 shadow-xl pointer-events-auto max-w-sm w-full">
                        <div className="w-20 h-20 mx-auto mb-6 bg-[#D8F3DC] rounded-full flex items-center justify-center">
                            <MapPinned className="w-10 h-10 text-[#2D6A4F]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#1B4332] mb-2">Search Your Bus</h2>
                        <p className="text-[#74796D] max-w-xs mx-auto mb-6">
                            {orgName ? `Showing buses for ${orgName}${orgCity ? `, ${orgCity}` : ''}` : 'Find and track your bus'}
                        </p>

                        <button onClick={() => setShowSearch(true)} className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#2D6A4F] to-[#40916C] flex items-center justify-center gap-2">
                            <Search className="w-5 h-5" />
                            Search Bus Number
                        </button>

                        {favs.length > 0 && (
                            <div className="mt-6">
                                <p className="text-xs text-[#74796D] mb-3 uppercase tracking-wide">Your Favorites</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {favs.map(f => (
                                        <button key={f} onClick={() => selectBus(f)} className="px-4 py-2.5 bg-[#FFF1E6] rounded-full text-sm text-[#1B4332] flex items-center gap-2 active:scale-95 border border-[#E07A5F]/20">
                                            <Star className="w-3.5 h-3.5 text-[#E07A5F] fill-[#E07A5F]" />{f}
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
