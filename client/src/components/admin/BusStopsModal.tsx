/**
 * Bus Stops Manager Modal Component
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GripVertical, MapPin, Save, Map } from 'lucide-react';
import api from '../../services/api';
import LocationPickerModal from './LocationPickerModal';

function BusStopsModal({ isOpen, onClose, bus, onSaved }) {
    const [stops, setStops] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [editingStopIndex, setEditingStopIndex] = useState(null);

    useEffect(() => {
        if (bus?.stops) {
            setStops(bus.stops.map((s, i) => ({
                id: s.id,
                name: s.name,
                latitude: s.latitude,
                longitude: s.longitude,
                order: s.order || i + 1,
            })));
        } else {
            setStops([]);
        }
    }, [bus]);

    const addStop = () => {
        const newIndex = stops.length;
        setStops([...stops, {
            id: `new-${Date.now()}`,
            name: '',
            latitude: '',
            longitude: '',
            order: stops.length + 1,
        }]);
        // Open map picker immediately for new stop
        setEditingStopIndex(newIndex);
        setShowLocationPicker(true);
    };

    const removeStop = (index) => {
        const newStops = stops.filter((_, i) => i !== index);
        // Reorder
        setStops(newStops.map((s, i) => ({ ...s, order: i + 1 })));
    };

    const updateStop = (index, field, value) => {
        const newStops = [...stops];
        newStops[index] = {
            ...newStops[index],
            [field]: field === 'latitude' || field === 'longitude' ? parseFloat(value) || '' : value,
        };
        setStops(newStops);
    };

    const openLocationPicker = (index) => {
        setEditingStopIndex(index);
        setShowLocationPicker(true);
    };

    const handleLocationSelect = (lat, lng) => {
        if (editingStopIndex !== null) {
            const newStops = [...stops];
            newStops[editingStopIndex] = {
                ...newStops[editingStopIndex],
                latitude: lat,
                longitude: lng,
            };
            setStops(newStops);
        }
        setShowLocationPicker(false);
        setEditingStopIndex(null);
    };

    const handleSave = async () => {
        // Validate
        for (const stop of stops) {
            if (!stop.name.trim()) {
                setError('All stops must have a name');
                return;
            }
            if (!stop.latitude || !stop.longitude) {
                setError('All stops must have valid coordinates');
                return;
            }
        }

        setSaving(true);
        setError('');

        try {
            const stopsData = stops.map((s, i) => ({
                name: s.name,
                latitude: parseFloat(s.latitude),
                longitude: parseFloat(s.longitude),
                order: i + 1,
            }));

            await api.put(`/admin/buses/${bus.id}/stops`, { stops: stopsData });
            onSaved();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save stops');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-dark-800 rounded-2xl border border-white/10 shadow-2xl flex flex-col"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Manage Stops</h2>
                                <p className="text-sm text-dark-400 mt-1">{bus?.busNumber} - {bus?.busName}</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                {stops.length === 0 ? (
                                    <div className="text-center py-8 text-dark-500">
                                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No stops added yet</p>
                                        <p className="text-sm mt-1">Click "Add Stop" to add route stops</p>
                                    </div>
                                ) : (
                                    stops.map((stop, index) => (
                                        <div key={stop.id} className="p-4 bg-dark-900 rounded-xl border border-white/5">
                                            <div className="flex items-start gap-3">
                                                <div className="flex items-center h-10 text-dark-500">
                                                    <GripVertical className="w-4 h-4" />
                                                    <span className="ml-1 text-sm font-medium w-4">{index + 1}</span>
                                                </div>

                                                <div className="flex-1 space-y-3">
                                                    {/* Stop Name */}
                                                    <div>
                                                        <label className="text-xs text-dark-500 mb-1 block">Stop Name *</label>
                                                        <input
                                                            type="text"
                                                            value={stop.name}
                                                            onChange={(e) => updateStop(index, 'name', e.target.value)}
                                                            placeholder="e.g., Main Gate, Library, Bus Stand"
                                                            className="input py-2 text-sm"
                                                        />
                                                    </div>

                                                    {/* Coordinates Row */}
                                                    <div className="flex items-end gap-2">
                                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs text-dark-500 mb-1 block">Latitude</label>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={stop.latitude}
                                                                    onChange={(e) => updateStop(index, 'latitude', e.target.value)}
                                                                    placeholder="12.9716"
                                                                    className="input py-2 text-sm font-mono"
                                                                    readOnly
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-dark-500 mb-1 block">Longitude</label>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={stop.longitude}
                                                                    onChange={(e) => updateStop(index, 'longitude', e.target.value)}
                                                                    placeholder="77.5946"
                                                                    className="input py-2 text-sm font-mono"
                                                                    readOnly
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => openLocationPicker(index)}
                                                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap h-[42px]"
                                                        >
                                                            <Map className="w-4 h-4" />
                                                            Pick on Map
                                                        </button>
                                                    </div>

                                                    {/* Location Status */}
                                                    {stop.latitude && stop.longitude && (
                                                        <div className="flex items-center gap-2 text-xs text-green-400">
                                                            <MapPin className="w-3 h-3" />
                                                            Location set: {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => removeStop(index)}
                                                    className="p-2 rounded-lg hover:bg-red-500/20 text-dark-500 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={addStop}
                                className="w-full mt-4 py-3 border-2 border-dashed border-dark-600 rounded-xl text-dark-400 hover:text-white hover:border-primary-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Stop
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 flex gap-3">
                            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                                {saving ? (
                                    <><div className="spinner" /> Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Save Stops</>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            {/* Location Picker Modal */}
            <LocationPickerModal
                isOpen={showLocationPicker}
                onClose={() => {
                    setShowLocationPicker(false);
                    setEditingStopIndex(null);
                }}
                onSelect={handleLocationSelect}
                initialLat={editingStopIndex !== null ? stops[editingStopIndex]?.latitude : null}
                initialLng={editingStopIndex !== null ? stops[editingStopIndex]?.longitude : null}
            />
        </>
    );
}

export default BusStopsModal;
