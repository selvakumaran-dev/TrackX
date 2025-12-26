/**
 * Location Picker Modal - Professional UI with inline feedback
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { X, MapPin, Check, Search, Loader2, AlertCircle, Navigation } from 'lucide-react';
import L, { LatLngExpression } from 'leaflet';

// Map tile - Using a cleaner voyager style
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

// Tamil Nadu center
const TN_CENTER: [number, number] = [11.1271, 78.6569];

// Premium Marker icon
const markerIcon = L.divIcon({
    className: 'location-picker-marker',
    html: `
    <div style="position:relative; width:48px; height:48px;">
        <div style="position:absolute; inset:0; background:rgba(45,106,79,0.2); border-radius:50%; animation:pulse-ring 2s infinite;"></div>
        <div style="position:absolute; inset:8px; background:linear-gradient(135deg, #2D6A4F, #40916C); border:3px solid white; border-radius:50%; box-shadow:0 4px 15px rgba(45,106,79,0.4); display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="width:16px; height:16px;">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
        </div>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
});

// Type definitions
interface SearchResult {
    lat: number;
    lng: number;
    name: string;
    type: string;
    shortName: string;
}

interface MapClickHandlerProps {
    onLocationSelect: (lat: number, lng: number) => void;
}

interface FlyToLocationProps {
    position: [number, number] | null;
}

interface LocationPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (lat: number, lng: number) => void;
    initialLat: number | null;
    initialLng: number | null;
}

interface NominatimResult {
    lat: string;
    lon: string;
    display_name: string;
    type: string;
    name?: string;
}

function MapClickHandler({ onLocationSelect }: MapClickHandlerProps) {
    useMapEvents({
        click: (e) => {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function FlyToLocation({ position }: FlyToLocationProps) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 16, { duration: 0.5 });
        }
    }, [map, position]);
    return null;
}

function LocationPickerModal({ isOpen, onClose, onSelect, initialLat, initialLng }: LocationPickerModalProps) {
    const [selectedLat, setSelectedLat] = useState<number | null>(initialLat || null);
    const [selectedLng, setSelectedLng] = useState<number | null>(initialLng || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedLat(initialLat || null);
            setSelectedLng(initialLng || null);
            setSearchResults([]);
            setShowResults(false);
            setSearchError('');
        }
    }, [isOpen, initialLat, initialLng]);

    const handleLocationSelect = (lat: number, lng: number) => {
        setSelectedLat(lat);
        setSelectedLng(lng);
        setShowResults(false);
        setSearchError('');
    };

    const handleConfirm = () => {
        if (selectedLat && selectedLng) {
            onSelect(selectedLat, selectedLng);
            onClose();
        }
    };

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            setGettingLocation(true);
            setSearchError('');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setSelectedLat(position.coords.latitude);
                    setSelectedLng(position.coords.longitude);
                    setShowResults(false);
                    setGettingLocation(false);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setSearchError('Could not get your location. Please allow location access or select on map.');
                    setGettingLocation(false);
                }
            );
        } else {
            setSearchError('Geolocation is not supported by your browser.');
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchResults([]);
        setSearchError('');

        try {
            const query = `${searchQuery}, Tamil Nadu, India`;
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`
            );
            const data: NominatimResult[] = await response.json();

            if (data && data.length > 0) {
                setSearchResults(data.map((item: NominatimResult) => ({
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                    name: item.display_name,
                    type: item.type,
                    shortName: item.name || item.display_name.split(',')[0],
                })));
                setShowResults(true);
            } else {
                setSearchError(`No results for "${searchQuery}".`);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchError('Search failed. Please try again or click map.');
        }
        setSearching(false);
    };

    const selectSearchResult = (result: SearchResult) => {
        setSelectedLat(result.lat);
        setSelectedLng(result.lng);
        setShowResults(false);
        setSearchQuery(result.shortName);
        setSearchError('');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    className="relative w-full max-w-4xl h-[85vh] bg-[#FDFBF7] rounded-3xl border border-[#E9ECEF] shadow-2xl flex flex-col overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-[#E9ECEF] bg-white">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#D8F3DC] flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-[#2D6A4F]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[#1B4332]">Pick Location</h2>
                                <p className="text-xs text-[#74796D] mt-0.5">Find and set a bus stop</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-[#F8F9FA] text-[#74796D] hover:text-[#1B4332] transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Search & Actions */}
                    <div className="p-5 bg-white border-b border-[#E9ECEF] space-y-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setSearchError(''); }}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl text-[#1B4332] placeholder-[#95A3A4] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSearch}
                                    disabled={searching || !searchQuery.trim()}
                                    className="px-6 py-3.5 bg-[#2D6A4F] text-white rounded-2xl font-bold flex items-center gap-2 transition hover:bg-[#1B4332] disabled:opacity-50"
                                >
                                    {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                    Search
                                </button>
                                <button
                                    onClick={handleUseCurrentLocation}
                                    disabled={gettingLocation}
                                    className="px-6 py-3.5 bg-[#E8F4F8] text-[#457B9D] rounded-2xl font-bold flex items-center gap-2 transition hover:bg-[#D7E9F1] disabled:opacity-50"
                                >
                                    {gettingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                                    <span className="hidden sm:inline">My Location</span>
                                </button>
                            </div>
                        </div>

                        {/* Search Results / Error */}
                        <AnimatePresence>
                            {(searchError || (showResults && searchResults.length > 0)) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    {searchError ? (
                                        <div className="p-4 bg-[#FFF1E6] rounded-2xl border border-[#E07A5F]/20 flex items-center gap-3 text-[#E07A5F] text-sm">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            {searchError}
                                        </div>
                                    ) : (
                                        <div className="bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] overflow-hidden">
                                            <div className="px-4 py-2 bg-[#E9ECEF] text-[10px] font-bold text-[#74796D] uppercase tracking-wider">
                                                Search Results
                                            </div>
                                            <div className="max-h-56 overflow-y-auto">
                                                {searchResults.map((result, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => selectSearchResult(result)}
                                                        className="w-full p-4 text-left border-b border-[#E9ECEF] hover:bg-white transition flex items-center gap-4 group"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-[#FFF1E6] flex items-center justify-center group-hover:bg-[#E07A5F]/10 transition">
                                                            <MapPin className="w-5 h-5 text-[#E07A5F]" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-[#1B4332] truncate">{result.shortName}</p>
                                                            <p className="text-xs text-[#74796D] truncate">{result.name}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Map */}
                    <div className="flex-1 relative bg-[#E9ECEF]">
                        <MapContainer
                            center={selectedLat && selectedLng ? [selectedLat, selectedLng] : TN_CENTER}
                            zoom={selectedLat ? 16 : 7}
                            className="h-full w-full"
                        >
                            <TileLayer url={TILE_URL} attribution='&copy; CARTO' />
                            <MapClickHandler onLocationSelect={handleLocationSelect} />
                            {selectedLat && selectedLng && (
                                <>
                                    <FlyToLocation position={[selectedLat, selectedLng]} />
                                    <Marker position={[selectedLat, selectedLng]} icon={markerIcon} />
                                </>
                            )}
                        </MapContainer>

                        {/* Status Overlays */}
                        <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
                            {selectedLat && selectedLng ? (
                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                                    className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-[#2D6A4F]/20 flex items-center gap-2 pointer-events-auto">
                                    <div className="w-7 h-7 bg-[#D8F3DC] rounded-full flex items-center justify-center">
                                        <Check className="w-4 h-4 text-[#2D6A4F]" />
                                    </div>
                                    <span className="text-sm font-bold text-[#1B4332]">Stop Picked</span>
                                </motion.div>
                            ) : (
                                <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-[#E9ECEF] flex items-center gap-2">
                                    <div className="w-7 h-7 bg-[#FFF1E6] rounded-full flex items-center justify-center animate-pulse">
                                        <MapPin className="w-4 h-4 text-[#E07A5F]" />
                                    </div>
                                    <span className="text-sm font-medium text-[#74796D]">Tap map to pick stop</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-[#E9ECEF] bg-white">
                        <div className="flex items-center justify-between gap-4">
                            <div className="hidden sm:block">
                                {selectedLat && selectedLng && (
                                    <code className="text-[10px] font-mono bg-[#F8F9FA] px-3 py-1.5 rounded-lg border border-[#E9ECEF] text-[#74796D]">
                                        {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
                                    </code>
                                )}
                            </div>
                            <div className="flex flex-1 sm:flex-none gap-3">
                                <button onClick={onClose} className="flex-1 sm:px-8 py-3.5 bg-[#F8F9FA] text-[#74796D] font-bold rounded-2xl border-2 border-[#E9ECEF] hover:bg-[#E9ECEF] transition active:scale-95">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedLat || !selectedLng}
                                    className="flex-1 sm:px-8 py-3.5 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition active:scale-95 disabled:opacity-50"
                                >
                                    Confirm Stop Location
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default LocationPickerModal;
