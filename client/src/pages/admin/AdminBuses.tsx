/**
 * Admin Buses Management Page
 * Human-Centered Design
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bus,
    Plus,
    Search,
    Edit2,
    Trash2,
    Key,
    Copy,
    Check,
    X,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    MapPin,
} from 'lucide-react';
import api from '../../services/api';
import BusStopsModal from '../../components/admin/BusStopsModal';
import ConfirmModal from '../../components/common/ConfirmModal';

interface Driver {
    id: string;
    name: string;
    email: string;
    phone?: string;
    bus?: BusData | null;
}

interface BusData {
    id: string;
    busNumber: string;
    busName: string;
    gpsDeviceId?: string;
    isActive: boolean;
    driver?: Driver | null;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                >
                    <div className="flex items-center justify-between p-6 border-b border-[#E9ECEF] sticky top-0 bg-white z-10">
                        <h2 className="text-xl font-bold text-[#1B4332]">{title}</h2>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F8F9FA] text-[#74796D] hover:text-[#1B4332] transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6">{children}</div>
                </motion.div>

            </motion.div>
        </AnimatePresence>
    );
}

function AdminBuses() {
    const [buses, setBuses] = useState<BusData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [editingBus, setEditingBus] = useState<BusData | null>(null);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [generatedApiKey, setGeneratedApiKey] = useState('');
    const [copiedKey, setCopiedKey] = useState(false);
    const [showStopsModal, setShowStopsModal] = useState(false);
    const [selectedBusForStops, setSelectedBusForStops] = useState<BusData | null>(null);

    const [formData, setFormData] = useState({
        busNumber: '',
        busName: '',
        gpsDeviceId: '',
        driverId: '',
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [busToDelete, setBusToDelete] = useState<BusData | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const fetchBuses = async (page = 1) => {
        setLoading(true);
        try {
            const response = await api.get('/admin/buses', { params: { page, limit: 10, search } });
            setBuses(response.data.data || []);
            setPagination({
                page: response.data.pagination.page,
                totalPages: response.data.pagination.totalPages,
            });
        } catch (error) {
            console.error('Error fetching buses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableDrivers = async (currentDriverId: string | null | undefined = null) => {
        try {
            const response = await api.get('/admin/drivers', { params: { limit: 100 } });
            const allDrivers = response.data.data || [];
            const filtered = allDrivers.filter((d: Driver) => !d.bus || d.id === currentDriverId);
            setAvailableDrivers(filtered);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    useEffect(() => { fetchBuses(); }, [search]);
    useEffect(() => { fetchAvailableDrivers(); }, []);

    const openAddModal = () => {
        setEditingBus(null);
        setFormData({ busNumber: '', busName: '', gpsDeviceId: '', driverId: '' });
        setFormError('');
        setShowModal(true);
        fetchAvailableDrivers(null);
    };

    const openEditModal = (bus: BusData) => {
        setEditingBus(bus);
        setFormData({
            busNumber: bus.busNumber,
            busName: bus.busName,
            gpsDeviceId: bus.gpsDeviceId || '',
            driverId: bus.driver?.id || '',
        });
        setFormError('');
        setShowModal(true);
        fetchAvailableDrivers(bus.driver?.id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');

        try {
            const data = {
                ...formData,
                driverId: formData.driverId || null,
                gpsDeviceId: formData.gpsDeviceId || null,
            };

            if (editingBus) {
                await api.put(`/admin/buses/${editingBus.id}`, data);
            } else {
                await api.post('/admin/buses', data);
            }

            setShowModal(false);
            fetchBuses(pagination.page);
            fetchAvailableDrivers();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            setFormError(err.response?.data?.error || 'Failed to save bus');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!busToDelete) return;
        try {
            await api.delete(`/admin/buses/${busToDelete.id}`);
            fetchBuses(pagination.page);
            fetchAvailableDrivers();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            setAlertConfig({
                isOpen: true,
                title: 'Delete Failed',
                message: err.response?.data?.error || 'Failed to delete bus',
                type: 'danger'
            });
        } finally {
            setBusToDelete(null);
            setShowDeleteConfirm(false);
        }
    };

    const handleDeleteClick = (bus: BusData) => {
        setBusToDelete(bus);
        setShowDeleteConfirm(true);
    };

    const handleGenerateApiKey = async (bus: BusData) => {
        try {
            const response = await api.post(`/admin/buses/${bus.id}/generate-api-key`);
            setGeneratedApiKey(response.data.data.apiKey);
            setShowApiKeyModal(true);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            setAlertConfig({
                isOpen: true,
                title: 'Generation Failed',
                message: err.response?.data?.error || 'Failed to generate API key',
                type: 'danger'
            });
        }
    };

    const copyApiKey = () => {
        navigator.clipboard.writeText(generatedApiKey);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1B4332]">Buses</h1>
                    <p className="text-[#74796D] text-sm mt-1">Manage your bus fleet</p>
                </div>
                <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                    <Plus className="w-5 h-5" />
                    Add Bus
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] transition"
                />
            </div>

            {/* Content Area */}
            {/* Desktop Table - Hidden on Mobile */}
            <div className="hidden lg:block bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#F8F9FA] border-b border-[#E9ECEF]">
                                <th className="text-left py-4 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">Bus</th>
                                <th className="text-left py-4 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">Driver</th>
                                <th className="text-left py-4 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">GPS Device</th>
                                <th className="text-left py-4 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">Status</th>
                                <th className="text-right py-4 px-5 text-[#74796D] font-medium text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="w-8 h-8 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : buses.length > 0 ? (
                                buses.map((bus, index) => (
                                    <motion.tr
                                        key={bus.id}
                                        className="border-b border-[#E9ECEF] hover:bg-[#F8F9FA] transition-colors"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center">
                                                    <Bus className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[#1B4332]">{bus.busNumber}</p>
                                                    <p className="text-sm text-[#74796D]">{bus.busName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 text-[#52796F]">
                                            {bus.driver?.name || <span className="text-[#95A3A4]">Unassigned</span>}
                                        </td>
                                        <td className="py-4 px-5 text-[#74796D] text-sm">
                                            {bus.gpsDeviceId || <span className="text-[#95A3A4]">—</span>}
                                        </td>
                                        <td className="py-4 px-5">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${bus.isActive
                                                ? 'bg-[#D8F3DC] text-[#2D6A4F]'
                                                : 'bg-[#F8F9FA] text-[#74796D]'
                                                }`}>
                                                {bus.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => { setSelectedBusForStops(bus); setShowStopsModal(true); }}
                                                    className="p-2 rounded-lg hover:bg-[#E8F4F8] text-[#74796D] hover:text-[#457B9D] transition-colors"
                                                    title="Manage Stops"
                                                >
                                                    <MapPin className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleGenerateApiKey(bus)}
                                                    className="p-2 rounded-lg hover:bg-[#D8F3DC] text-[#74796D] hover:text-[#2D6A4F] transition-colors"
                                                    title="Generate API Key"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(bus)}
                                                    className="p-2 rounded-lg hover:bg-[#F8F9FA] text-[#74796D] hover:text-[#1B4332] transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(bus)}
                                                    className="p-2 rounded-lg hover:bg-[#FFF1E6] text-[#74796D] hover:text-[#E07A5F] transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-[#74796D]">
                                        No buses found. Add your first bus to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards - Shown only on small screens */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="w-8 h-8 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : buses.length > 0 ? (
                    buses.map((bus, index) => (
                        <motion.div
                            key={bus.id}
                            className="bg-white rounded-[24px] p-5 border border-[#E9ECEF] shadow-sm hover:shadow-md transition-all space-y-4"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center text-white shadow-sm">
                                        <Bus className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#1B4332] text-lg">{bus.busNumber}</p>
                                        <p className="text-xs text-[#74796D]">{bus.busName}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${bus.isActive ? 'bg-[#D8F3DC] text-[#2D6A4F]' : 'bg-[#F8F9FA] text-[#74796D]'}`}>
                                    {bus.isActive ? 'Active' : 'Offline'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-[#F8F9FA] p-3 rounded-2xl border border-[#E9ECEF]">
                                    <p className="text-[9px] font-black text-[#95A3A4] uppercase tracking-widest mb-1">Driver</p>
                                    <p className="text-xs font-bold text-[#1B4332] truncate">{bus.driver?.name || 'Unassigned'}</p>
                                </div>
                                <div className="bg-[#F8F9FA] p-3 rounded-2xl border border-[#E9ECEF]">
                                    <p className="text-[9px] font-black text-[#95A3A4] uppercase tracking-widest mb-1">Device ID</p>
                                    <p className="text-xs font-bold text-[#1B4332] truncate">{bus.gpsDeviceId || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-[#F8F9FA]">
                                <button onClick={() => { setSelectedBusForStops(bus); setShowStopsModal(true); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#E8F4F8] text-[#457B9D] rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                    <MapPin className="w-3.5 h-3.5" /> Stops
                                </button>
                                <button onClick={() => openEditModal(bus)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#F8F9FA] text-[#1B4332] rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button onClick={() => handleDeleteClick(bus)} className="w-12 h-12 flex items-center justify-center bg-[#FFF1E6] text-[#E07A5F] rounded-xl active:scale-95 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="py-12 text-center text-[#74796D] bg-white rounded-2xl border border-dashed border-[#E9ECEF]">
                        No buses available
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E9ECEF]">
                    <p className="text-sm text-[#74796D]">Page {pagination.page} of {pagination.totalPages}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchBuses(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-2 rounded-lg hover:bg-[#F8F9FA] disabled:opacity-50 disabled:cursor-not-allowed text-[#74796D] transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => fetchBuses(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className="p-2 rounded-lg hover:bg-[#F8F9FA] disabled:opacity-50 disabled:cursor-not-allowed text-[#74796D] transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingBus ? 'Edit Bus' : 'Add New Bus'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[#1B4332] mb-2">Bus Number *</label>
                        <input
                            type="text"
                            value={formData.busNumber}
                            onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1B4332] mb-2">Bus Name *</label>
                        <input
                            type="text"
                            value={formData.busName}
                            onChange={(e) => setFormData({ ...formData, busName: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1B4332] mb-2">GPS Device ID</label>
                        <input
                            type="text"
                            value={formData.gpsDeviceId}
                            onChange={(e) => setFormData({ ...formData, gpsDeviceId: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1B4332] mb-2">Assign Driver</label>
                        <select
                            value={formData.driverId}
                            onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                        >
                            <option value="">No driver assigned</option>
                            {availableDrivers.map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                    {driver.name} {driver.bus ? '(Currently assigned)' : ''}
                                </option>
                            ))}
                        </select>
                        {availableDrivers.length === 0 && (
                            <p className="text-xs text-[#95A3A4] mt-1">No drivers available. Add drivers first.</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 px-4 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] font-medium hover:bg-[#E9ECEF] transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 px-4 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white font-semibold rounded-xl shadow-lg disabled:opacity-50">
                            {saving ? 'Saving...' : editingBus ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* API Key Modal */}
            <Modal isOpen={showApiKeyModal} onClose={() => setShowApiKeyModal(false)} title="API Key Generated">
                <div className="space-y-4">
                    <p className="text-[#52796F]">Store this API key securely. It will not be shown again.</p>

                    <div className="flex items-center gap-2 p-4 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF]">
                        <code className="flex-1 text-sm text-[#2D6A4F] break-all font-mono">{generatedApiKey}</code>
                        <button onClick={copyApiKey} className="p-2 rounded-lg hover:bg-white text-[#74796D] hover:text-[#1B4332] transition-colors">
                            {copiedKey ? <Check className="w-5 h-5 text-[#2D6A4F]" /> : <Copy className="w-5 h-5" />}
                        </button>
                    </div>

                    <p className="text-sm text-[#74796D]">
                        Use this key in the Authorization header:<br />
                        <code className="text-[#2D6A4F]">Authorization: Bearer {'{API_KEY}'}</code>
                    </p>

                    <button onClick={() => setShowApiKeyModal(false)} className="w-full py-3 px-4 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white font-semibold rounded-xl">
                        Done
                    </button>
                </div>
            </Modal>

            {/* Bus Stops Modal */}
            <BusStopsModal
                isOpen={showStopsModal}
                onClose={() => { setShowStopsModal(false); setSelectedBusForStops(null); }}
                bus={selectedBusForStops}
                onSaved={() => fetchBuses(pagination.page)}
            />
            {/* Confirmation Modals */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setBusToDelete(null); }}
                onConfirm={handleConfirmDelete}
                title="Delete Bus"
                message={`Are you sure you want to delete bus ${busToDelete?.busNumber}? All tracking history for this bus will be permanently removed.`}
                confirmText="Delete Bus"
                cancelText="Keep Bus"
                type="danger"
            />

            <ConfirmModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                onConfirm={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                title={alertConfig.title}
                message={alertConfig.message}
                confirmText="Okay"
                type={alertConfig.type}
            />
        </div>
    );
}

export default AdminBuses;
