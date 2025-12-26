/**
 * Master Global Map - Human-Centered Command Center
 * High-level monitoring of all institutional fleets across the platform
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import {
    Activity,
    MapPin,
    Building2,
    Bus,
    Navigation2,
    Shield,
    X,
    Maximize2,
    Minimize2,
    Clock,
    Globe,
    Zap,
    Users,
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import socketService from '../../services/socket';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TN_CENTER: [number, number] = [11.1271, 78.6569];

// Premium Bus Icon for Global View
const createGlobalBusIcon = (color: string, isOnline: boolean) => L.divIcon({
    className: 'global-bus-marker',
    html: `
    <div class="global-icon ${isOnline ? 'online' : 'offline'}" style="--org-color: ${color}">
      <div class="icon-pulse"></div>
      <div class="icon-body">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
          <circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>
        </svg>
      </div>
    </div>
  `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom, { duration: 1.5 });
    }, [map, center, zoom]);
    return null;
}

interface LiveBus {
    busId: string;
    busNumber: string;
    busName: string;
    lat: number;
    lon: number;
    speed: number;
    isOnline: boolean;
    organizationId: string;
    organizationName: string;
    color: string;
    updatedAt: string;
}

const MasterGlobalMap = () => {
    const [buses, setBuses] = useState<LiveBus[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBus, setSelectedBus] = useState<LiveBus | null>(null);
    const [stats, setStats] = useState({ online: 0, total: 0 });
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const fetchMapData = async () => {
        try {
            const res = await api.get('/superadmin/live-map');
            const data = res.data.data || [];
            setBuses(data);
            setStats({
                online: data.filter((b: any) => b.isOnline).length,
                total: data.length
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMapData();
        const interval = setInterval(fetchMapData, 30000); // 30s polling for non-socket updates

        socketService.connect();
        const unsub = socketService.onLocationUpdate((d) => {
            setBuses(prev => prev.map(bus => {
                if (bus.busId === d.busId || (bus.busNumber === d.busNumber && bus.organizationId === d.organizationId)) {
                    return { ...bus, ...d, isOnline: true };
                }
                return bus;
            }));
        });

        return () => {
            clearInterval(interval);
            unsub();
        };
    }, []);

    const focusBus = (bus: LiveBus) => {
        setSelectedBus(bus);
    };

    return (
        <div className="h-[calc(100vh-140px)] w-full relative rounded-[40px] overflow-hidden border border-[#E9ECEF] bg-white shadow-2xl">
            <style>{`
                .global-icon { position: relative; display: flex; align-items: center; justify-content: center; }
                .global-icon.online .icon-pulse { position: absolute; width: 40px; height: 40px; border-radius: 50%; background: var(--org-color); opacity: 0.2; animation: global-pulse 2s infinite; }
                .global-icon .icon-body { width: 32px; height: 32px; background: var(--org-color); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; border: 2px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; z-index: 2; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .global-icon:hover .icon-body { transform: scale(1.2) rotate(12deg); z-index: 10; }
                .global-icon .icon-body svg { width: 16px; height: 16px; }
                .global-icon.offline .icon-body { background: #95A3A4 !important; opacity: 0.6; }
                @keyframes global-pulse { 0% { transform: scale(0.6); opacity: 0.4; } 100% { transform: scale(1.8); opacity: 0; } }
                
                .leaflet-container { background: #f8f9fa !important; border-radius: 40px; }
                .custom-popup .leaflet-popup-content-wrapper { border-radius: 20px; padding: 0; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .custom-popup .leaflet-popup-content { margin: 0; width: 240px !important; }
                .custom-popup .leaflet-popup-tip { display: none; }
            `}</style>

            {/* Map Container */}
            <MapContainer
                center={TN_CENTER}
                zoom={7}
                className="h-full w-full z-0"
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                <ZoomControl position="bottomright" />

                {selectedBus?.lat && selectedBus?.lon && (
                    <MapController center={[selectedBus.lat, selectedBus.lon]} zoom={15} />
                )}

                {buses.map(bus => (
                    <Marker
                        key={`${bus.organizationId}-${bus.busNumber}`}
                        position={[bus.lat, bus.lon]}
                        icon={createGlobalBusIcon(bus.color, bus.isOnline)}
                        eventHandlers={{ click: () => focusBus(bus) }}
                    >
                        <Popup className="custom-popup">
                            <div className="overflow-hidden">
                                <div className="h-2" style={{ backgroundColor: bus.color }} />
                                <div className="p-4 bg-white">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: bus.color }}>
                                            <Bus className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-[#1B4332] tracking-tight">{bus.busNumber}</h4>
                                            <p className="text-[10px] font-black text-[#E07A5F] uppercase tracking-widest">{bus.organizationName}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 border-t border-[#F8F9FA] pt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-[#95A3A4] uppercase">Status</span>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${bus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-[#E07A5F]'}`} />
                                                <span className={`text-[10px] font-black uppercase ${bus.isOnline ? 'text-emerald-600' : 'text-[#E07A5F]'}`}>
                                                    {bus.isOnline ? 'Active' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-[#95A3A4] uppercase">Velocity</span>
                                            <span className="text-[10px] font-black text-[#1B4332] uppercase">{bus.speed} KM/H</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-[#95A3A4] uppercase">Last Sync</span>
                                            <span className="text-[10px] font-black text-[#1B4332] uppercase">
                                                {new Date(bus.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className="w-full mt-4 py-2 bg-[#F8F9FA] hover:bg-[#D8F3DC] text-[#1B4332] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        onClick={() => window.open(`/track?bus=${bus.busNumber}&org=${bus.organizationId}`, '_blank')}
                                    >
                                        Public View
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Overlay UI - Header */}
            <div className="absolute top-8 left-8 right-8 z-[1000] flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-white/90 backdrop-blur-2xl border border-[#E9ECEF] rounded-[24px] px-6 py-4 shadow-xl flex items-center gap-5"
                    >
                        <div className="w-12 h-12 bg-[#1B4332] rounded-2xl flex items-center justify-center shadow-lg">
                            <Globe className="w-6 h-6 text-[#D8F3DC] animate-spin-slow" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-[#1B4332] tracking-tighter uppercase leading-none">Global Transit Matrix</h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-[#2D6A4F] uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {stats.online} Live Units
                                </span>
                                <div className="w-1 h-1 rounded-full bg-[#E9ECEF]" />
                                <span className="text-[10px] font-black text-[#95A3A4] uppercase tracking-widest">
                                    {stats.total} Total Registered
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="flex flex-col gap-3 pointer-events-auto items-end">
                    <button
                        onClick={() => fetchMapData()}
                        className="p-4 bg-white/90 backdrop-blur-xl border border-[#E9ECEF] rounded-2xl text-[#1B4332] shadow-lg hover:scale-110 active:scale-95 transition-all group"
                    >
                        <RefreshCw className="w-5 h-5 group-active:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Sidebar Toggle */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute left-8 bottom-8 z-[1000] px-6 py-3 bg-[#1B4332] text-white rounded-2xl shadow-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                {sidebarOpen ? 'Hide Legend' : 'Audit Fleet'}
            </button>

            {/* Fleet Audit Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        className="absolute left-8 top-32 bottom-24 w-80 z-[999] bg-white/95 backdrop-blur-2xl border border-[#E9ECEF] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
                    >
                        <div className="p-6 border-b border-[#F8F9FA] bg-[#FDFBF7]">
                            <h3 className="text-xs font-black text-[#1B4332] uppercase tracking-[0.2em] mb-1">Fleet Directory</h3>
                            <p className="text-[10px] font-bold text-[#74796D] uppercase tracking-widest">Real-time status by node</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {buses.length > 0 ? buses.sort((a, b) => Number(b.isOnline) - Number(a.isOnline)).map((bus, i) => (
                                <button
                                    key={`${bus.organizationId}-${bus.busNumber}`}
                                    onClick={() => focusBus(bus)}
                                    className={`w-full p-4 rounded-2xl border transition-all text-left group relative overflow-hidden ${selectedBus?.busId === bus.busId ? 'bg-[#1B4332] border-[#1B4332] shadow-lg' : 'bg-white border-[#E9ECEF] hover:border-[#2D6A4F]/30 hover:bg-[#F8F9FA]'}`}
                                >
                                    {selectedBus?.busId === bus.busId && (
                                        <motion.div
                                            layoutId="hover-bg"
                                            className="absolute inset-0 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] opacity-10"
                                        />
                                    )}
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${bus.isOnline ? 'shadow-md shadow-[var(--org-color)]/20' : 'opacity-40 grayscale'}`} style={{ backgroundColor: bus.color, ['--org-color' as any]: bus.color }}>
                                            <Bus className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className={`text-sm font-black truncate tracking-tight ${selectedBus?.busId === bus.busId ? 'text-white' : 'text-[#1B4332]'}`}>
                                                    {bus.busNumber}
                                                </span>
                                                <div className={`w-1.5 h-1.5 rounded-full ${bus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-[#E07A5F]'}`} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[10px] font-bold truncate uppercase tracking-tight ${selectedBus?.busId === bus.busId ? 'text-[#D8F3DC]' : 'text-[#74796D]'}`}>
                                                    {bus.organizationName.split(' ')[0]}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase ${selectedBus?.busId === bus.busId ? 'text-[#D8F3DC]/60' : 'text-[#95A3A4]'}`}>
                                                    {bus.speed} KM/H
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            )) : (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-12 h-12 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto">
                                        <Zap className="w-6 h-6 text-[#D8F3DC]" />
                                    </div>
                                    <p className="text-[10px] font-black text-[#95A3A4] uppercase tracking-widest px-10">Scanning for active fleet signals...</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-[#1B4332] border-t border-white/10">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">Global Integrity</span>
                                <span className="text-[10px] text-[#D8F3DC] font-black uppercase tracking-widest">99.9%</span>
                            </div>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '99.9%' }}
                                    className="h-full bg-emerald-400 shadow-[0_0_8px_#34d399]"
                                />
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Map Interaction Legend */}
            <div className="absolute right-8 top-32 z-[1000] flex flex-col gap-3">
                <div className="bg-white/90 backdrop-blur-xl border border-[#E9ECEF] rounded-2xl p-4 shadow-xl pointer-events-auto">
                    <p className="text-[9px] font-black text-[#95A3A4] uppercase tracking-[0.2em] mb-3 text-center">Protocol</p>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[9px] font-black text-[#1B4332] uppercase tracking-widest">Unit Live</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#E07A5F]" />
                            <span className="text-[9px] font-black text-[#1B4332] uppercase tracking-widest">Unit Idle</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-0.5 bg-[#457B9D] opacity-40" />
                            <span className="text-[9px] font-black text-[#1B4332] uppercase tracking-widest">Data Link</span>
                        </div>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 z-[2000] bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 border-4 border-[#D8F3DC] rounded-full" />
                            <div className="absolute inset-0 border-t-4 border-[#1B4332] rounded-full animate-spin" />
                            <Globe className="absolute inset-0 m-auto w-8 h-8 text-[#1B4332] animate-pulse" />
                        </div>
                        <p className="text-xs font-black text-[#1B4332] uppercase tracking-[0.3em]">Establishing Global Uplink...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterGlobalMap;
