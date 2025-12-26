/**
 * Bus Stops Manager Modal Component
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GripVertical, MapPin, Save, Map, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import LocationPickerModal from './LocationPickerModal';

import ConfirmModal from '../common/ConfirmModal';

// Type definitions
interface BusStop {
    id: string;
    name: string;
    latitude: number | string;
    longitude: number | string;
    order: number;
}

interface BusData {
    id: string;
    busNumber: string;
    busName: string;
    stops?: BusStop[];
}

interface BusStopsModalProps {
    isOpen: boolean;
    onClose: () => void;
    bus: BusData | null;
    onSaved: () => void;
}

function BusStopsModal({ isOpen, onClose, bus, onSaved }: BusStopsModalProps) {
    const [stops, setStops] = useState<BusStop[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [indexToDelete, setIndexToDelete] = useState<number | null>(null);

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
        setEditingStopIndex(newIndex);
        setShowLocationPicker(true);
    };

    const confirmRemoveStop = (index: number) => {
        setIndexToDelete(index);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        if (indexToDelete !== null) {
            const newStops = stops.filter((_, i) => i !== indexToDelete);
            setStops(newStops.map((s, i) => ({ ...s, order: i + 1 })));
        }
        setShowDeleteConfirm(false);
        setIndexToDelete(null);
    };

    const updateStop = (index: number, field: keyof BusStop, value: string | number) => {
        const newStops = [...stops];
        newStops[index] = {
            ...newStops[index],
            [field]: field === 'latitude' || field === 'longitude' ? parseFloat(String(value)) || '' : value,
        };
        setStops(newStops);
    };

    const openLocationPicker = (index: number) => {
        setEditingStopIndex(index);
        setShowLocationPicker(true);
    };

    const handleLocationSelect = (lat: number, lng: number) => {
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
                latitude: parseFloat(String(s.latitude)),
                longitude: parseFloat(String(s.longitude)),
                order: i + 1,
            }));

            await api.put(`/admin/buses/${bus?.id}/stops`, { stops: stopsData });
            onSaved();
            onClose();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Failed to save stops');
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
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-[#FDFBF7] rounded-3xl border border-[#E9ECEF] shadow-2xl flex flex-col"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[#E9ECEF] bg-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#FFF1E6] flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-[#E07A5F]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[#1B4332]">Route Stops</h2>
                                    <p className="text-sm text-[#74796D] mt-0.5">{bus?.busNumber} - {bus?.busName}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-[#F8F9FA] text-[#74796D] hover:text-[#1B4332] transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {error && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-[#FFF1E6] rounded-2xl border border-[#E07A5F]/20 text-[#E07A5F] text-sm flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5" /> {error}
                                </motion.div>
                            )}

                            <div className="space-y-4">
                                {stops.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-[#E9ECEF]">
                                        <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Map className="w-8 h-8 text-[#95A3A4]" />
                                        </div>
                                        <p className="text-[#1B4332] font-bold">No stops yet</p>
                                        <p className="text-sm text-[#74796D] mt-1">Add stops to define the bus route</p>
                                    </div>
                                ) : (
                                    stops.map((stop, index) => (
                                        <div key={stop.id} className="p-5 bg-white rounded-2xl border border-[#E9ECEF] shadow-sm group hover:border-[#2D6A4F]/20 transition-all">
                                            <div className="flex items-start gap-4">
                                                <div className="flex flex-col items-center gap-2 mt-1">
                                                    <div className="w-7 h-7 bg-[#D8F3DC] rounded-full flex items-center justify-center text-[10px] font-black text-[#2D6A4F]">
                                                        {index + 1}
                                                    </div>
                                                    <div className="w-0.5 h-full bg-[#E9ECEF] rounded-full min-h-[40px] group-last:hidden" />
                                                </div>

                                                <div className="flex-1 space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-[#74796D] uppercase tracking-wider mb-1.5 block">Stop Name</label>
                                                        <input
                                                            type="text"
                                                            value={stop.name}
                                                            onChange={(e) => updateStop(index, 'name', e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] transition"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="flex-1 flex gap-2">
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-[#74796D] mb-1 block">LATITUDE</label>
                                                                <input
                                                                    type="text"
                                                                    value={stop.latitude || '—'}
                                                                    readOnly
                                                                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg text-xs font-mono text-[#52796F]"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-[#74796D] mb-1 block">LONGITUDE</label>
                                                                <input
                                                                    type="text"
                                                                    value={stop.longitude || '—'}
                                                                    readOnly
                                                                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E9ECEF] rounded-lg text-xs font-mono text-[#52796F]"
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => openLocationPicker(index)}
                                                            className="h-[42px] mt-auto px-4 bg-[#E8F4F8] text-[#457B9D] rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#D7E9F1] transition"
                                                        >
                                                            <Map className="w-4 h-4" /> Pick on Map
                                                        </button>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => confirmRemoveStop(index)}
                                                    className="p-2.5 rounded-xl hover:bg-[#FFF1E6] text-[#95A3A4] hover:text-[#E07A5F] transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={addStop}
                                className="w-full py-4 border-2 border-dashed border-[#E9ECEF] rounded-2xl text-[#74796D] font-bold hover:text-[#2D6A4F] hover:border-[#2D6A4F]/30 hover:bg-[#D8F3DC]/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" /> Add New Stop
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[#E9ECEF] bg-white flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3.5 bg-[#F8F9FA] text-[#74796D] font-bold rounded-2xl border-2 border-[#E9ECEF] hover:bg-[#E9ECEF] transition active:scale-95">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-3.5 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition active:scale-95 disabled:opacity-50">
                                {saving ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <Save className="w-5 h-5" /> Save Route
                                    </div>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            <LocationPickerModal
                isOpen={showLocationPicker}
                onClose={() => {
                    setShowLocationPicker(false);
                    setEditingStopIndex(null);
                }}
                onSelect={handleLocationSelect}
                initialLat={editingStopIndex !== null && stops[editingStopIndex]?.latitude ? Number(stops[editingStopIndex].latitude) : null}
                initialLng={editingStopIndex !== null && stops[editingStopIndex]?.longitude ? Number(stops[editingStopIndex].longitude) : null}
            />

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setIndexToDelete(null); }}
                onConfirm={handleConfirmDelete}
                title="Remove Stop"
                message="Are you sure you want to remove this stop from the route?"
                confirmText="Remove Stop"
                cancelText="Keep It"
                type="danger"
            />
        </>
    );
}

export default BusStopsModal;
