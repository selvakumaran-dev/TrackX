/**
 * Location Picker Modal - Professional UI with inline feedback
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { X, MapPin, Check, Search, Loader2, AlertCircle, Navigation } from 'lucide-react';
import L, { LatLngExpression } from 'leaflet';

// Map tile
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

// Tamil Nadu center
const TN_CENTER: [number, number] = [11.1271, 78.6569];

// Marker icon
const markerIcon = L.divIcon({
    className: 'location-picker-marker',
    html: `<div style="
    width: 40px; height: 40px; 
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-radius: 50% 50% 50% 0; 
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
    border: 3px solid white;
  ">
    <div style="transform: rotate(45deg); color: white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
  </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
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
            setSearchError('Geolocation is not supported by your browser. Please select on map.');
        }
    };

    // Improved search using Nominatim with Tamil Nadu focus
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchResults([]);
        setSearchError('');

        try {
            // Add "Tamil Nadu India" for better local results
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
                // Try without Tamil Nadu if no results
                const response2 = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=8&addressdetails=1`
                );
                const data2: NominatimResult[] = await response2.json();
                if (data2 && data2.length > 0) {
                    setSearchResults(data2.map((item: NominatimResult) => ({
                        lat: parseFloat(item.lat),
                        lng: parseFloat(item.lon),
                        name: item.display_name,
                        type: item.type,
                        shortName: item.name || item.display_name.split(',')[0],
                    })));
                    setShowResults(true);
                } else {
                    setSearchError(`No results for "${searchQuery}". Try a different name or click on the map.`);
                }
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchError('Search failed. Please select location on the map instead.');
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
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    className="relative w-full max-w-4xl h-[85vh] bg-dark-800 rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-dark-900">
                        <div>
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-red-400" />
                                Select Stop Location
                            </h2>
                            <p className="text-xs text-dark-400 mt-0.5">Search, use GPS, or click on the map</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="p-4 bg-dark-900 border-b border-white/10">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setSearchError(''); }}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Type location name... (e.g., Ariyalur Bus Stand)"
                                    className="w-full pl-10 pr-4 py-3 text-sm bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={searching || !searchQuery.trim()}
                                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium flex items-center gap-2 min-w-[110px] justify-center transition-colors"
                            >
                                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                {searching ? 'Finding...' : 'Search'}
                            </button>
                            <button
                                onClick={handleUseCurrentLocation}
                                disabled={gettingLocation}
                                className="px-4 py-3 bg-secondary-600 hover:bg-secondary-700 disabled:bg-dark-600 text-white rounded-xl text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors"
                            >
                                {gettingLocation ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Navigation className="w-4 h-4" />
                                )}
                                {gettingLocation ? 'Getting...' : 'My Location'}
                            </button>
                        </div>

                        {/* Search Error - Inline */}
                        <AnimatePresence>
                            {searchError && (
                                <motion.div
                                    className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-amber-400">{searchError}</p>
                                        <p className="text-xs text-amber-400/70 mt-1">💡 Tip: Click directly on the map to place a marker at any location</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                            {showResults && searchResults.length > 0 && (
                                <motion.div
                                    className="mt-3 bg-dark-700 border border-dark-600 rounded-xl overflow-hidden max-h-56 overflow-y-auto shadow-lg"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <div className="px-3 py-2 bg-dark-600 text-xs text-dark-300 font-medium sticky top-0 flex items-center gap-2">
                                        <Check className="w-3 h-3" />
                                        Found {searchResults.length} locations - Click to select:
                                    </div>
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={index}
                                            onClick={() => selectSearchResult(result)}
                                            className="w-full px-4 py-3 hover:bg-primary-500/20 text-left border-b border-dark-600/50 last:border-0 transition-colors group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                                                    <MapPin className="w-4 h-4 text-red-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate group-hover:text-primary-300">{result.shortName}</p>
                                                    <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">{result.name}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Map */}
                    <div className="flex-1 relative">
                        <MapContainer
                            center={selectedLat && selectedLng ? [selectedLat, selectedLng] : TN_CENTER}
                            zoom={selectedLat ? 15 : 7}
                            className="h-full w-full"
                            zoomControl={true}
                        >
                            <TileLayer
                                url={TILE_URL}
                                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            />
                            <MapClickHandler onLocationSelect={handleLocationSelect} />
                            {selectedLat && selectedLng && (
                                <>
                                    <FlyToLocation position={[selectedLat, selectedLng]} />
                                    <Marker position={[selectedLat, selectedLng]} icon={markerIcon} />
                                </>
                            )}
                        </MapContainer>

                        {/* Instructions overlay */}
                        {!selectedLat && !showResults && !searchError && (
                            <motion.div
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-dark-900/95 backdrop-blur-sm px-5 py-3 rounded-xl text-sm text-white shadow-xl border border-white/10"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-primary-400" />
                                    </div>
                                    <p>Click anywhere on the map to select location</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Selected location indicator on map */}
                        {selectedLat && selectedLng && (
                            <motion.div
                                className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-sm px-4 py-2 rounded-xl text-sm text-white shadow-lg"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    <span>Location selected!</span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10 bg-dark-900">
                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                {selectedLat && selectedLng ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 text-green-400">
                                            <Check className="w-4 h-4" />
                                            <span>Location Ready</span>
                                        </div>
                                        <code className="px-3 py-1.5 bg-dark-700 rounded-lg text-primary-400 text-xs font-mono">
                                            {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
                                        </code>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-dark-400">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>No location selected yet</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={onClose} className="btn-ghost px-5">Cancel</button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedLat || !selectedLng}
                                    className="btn-primary px-5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Check className="w-4 h-4" />
                                    Use This Location
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
