/**
 * ============================================
 * Admin Buses Management Page
 * ============================================
 * CRUD operations for buses
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

// Modal Component
function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    className="relative w-full max-w-lg bg-dark-800 rounded-2xl border border-white/10 shadow-2xl"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                >
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <h2 className="text-xl font-semibold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
                        >
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
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [availableDrivers, setAvailableDrivers] = useState([]);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingBus, setEditingBus] = useState(null);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [generatedApiKey, setGeneratedApiKey] = useState('');
    const [copiedKey, setCopiedKey] = useState(false);
    const [showStopsModal, setShowStopsModal] = useState(false);
    const [selectedBusForStops, setSelectedBusForStops] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        busNumber: '',
        busName: '',
        gpsDeviceId: '',
        driverId: '',
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Fetch buses
    const fetchBuses = async (page = 1) => {
        setLoading(true);
        try {
            const response = await api.get('/admin/buses', {
                params: { page, limit: 10, search },
            });
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

    // Fetch all drivers for assignment dropdown
    const fetchAvailableDrivers = async (currentDriverId = null) => {
        try {
            // Get all drivers
            const response = await api.get('/admin/drivers', { params: { limit: 100 } });
            const allDrivers = response.data.data || [];

            // Filter to show: available drivers + current driver (if editing)
            const filtered = allDrivers.filter(d =>
                !d.bus || d.id === currentDriverId
            );
            setAvailableDrivers(filtered);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    useEffect(() => {
        fetchBuses();
    }, [search]);

    useEffect(() => {
        fetchAvailableDrivers();
    }, []);

    // Open add modal
    const openAddModal = () => {
        setEditingBus(null);
        setFormData({ busNumber: '', busName: '', gpsDeviceId: '', driverId: '' });
        setFormError('');
        setShowModal(true);
        fetchAvailableDrivers(null);
    };

    // Open edit modal
    const openEditModal = (bus) => {
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

    // Handle form submit
    const handleSubmit = async (e) => {
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
        } catch (error) {
            setFormError(error.response?.data?.error || 'Failed to save bus');
        } finally {
            setSaving(false);
        }
    };

    // Delete bus
    const handleDelete = async (bus) => {
        if (!confirm(`Are you sure you want to delete ${bus.busNumber}?`)) return;

        try {
            await api.delete(`/admin/buses/${bus.id}`);
            fetchBuses(pagination.page);
            fetchAvailableDrivers();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to delete bus');
        }
    };

    // Generate API key
    const handleGenerateApiKey = async (bus) => {
        try {
            const response = await api.post(`/admin/buses/${bus.id}/generate-api-key`);
            setGeneratedApiKey(response.data.data.apiKey);
            setShowApiKeyModal(true);
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to generate API key');
        }
    };

    // Copy API key
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
                    <h1 className="text-3xl font-display font-bold text-white">Buses</h1>
                    <p className="text-dark-400 mt-1">Manage your bus fleet</p>
                </div>
                <button onClick={openAddModal} className="btn-primary">
                    <Plus className="w-5 h-5" />
                    Add Bus
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search buses..."
                    className="input pl-12"
                />
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-4 px-4 text-dark-400 font-medium text-sm">Bus</th>
                                <th className="text-left py-4 px-4 text-dark-400 font-medium text-sm">Driver</th>
                                <th className="text-left py-4 px-4 text-dark-400 font-medium text-sm">GPS Device</th>
                                <th className="text-left py-4 px-4 text-dark-400 font-medium text-sm">Status</th>
                                <th className="text-right py-4 px-4 text-dark-400 font-medium text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center">
                                        <div className="spinner mx-auto" />
                                    </td>
                                </tr>
                            ) : buses.length > 0 ? (
                                buses.map((bus, index) => (
                                    <motion.tr
                                        key={bus.id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                                                    <Bus className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{bus.busNumber}</p>
                                                    <p className="text-sm text-dark-400">{bus.busName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-dark-300">
                                            {bus.driver?.name || <span className="text-dark-500">Unassigned</span>}
                                        </td>
                                        <td className="py-4 px-4 text-dark-400 text-sm">
                                            {bus.gpsDeviceId || <span className="text-dark-500">—</span>}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bus.isActive
                                                ? 'bg-secondary-500/20 text-secondary-400'
                                                : 'bg-dark-700 text-dark-400'
                                                }`}>
                                                {bus.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedBusForStops(bus);
                                                        setShowStopsModal(true);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-secondary-400 transition-colors"
                                                    title="Manage Stops"
                                                >
                                                    <MapPin className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleGenerateApiKey(bus)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-primary-400 transition-colors"
                                                    title="Generate API Key"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(bus)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(bus)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-red-400 transition-colors"
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
                                    <td colSpan={5} className="py-8 text-center text-dark-400">
                                        No buses found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-white/10">
                        <p className="text-sm text-dark-400">
                            Page {pagination.page} of {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchBuses(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => fetchBuses(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingBus ? 'Edit Bus' : 'Add New Bus'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="input-label">Bus Number *</label>
                        <input
                            type="text"
                            value={formData.busNumber}
                            onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                            placeholder="e.g., BUS-001"
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label className="input-label">Bus Name *</label>
                        <input
                            type="text"
                            value={formData.busName}
                            onChange={(e) => setFormData({ ...formData, busName: e.target.value })}
                            placeholder="e.g., Route A - Engineering Block"
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label className="input-label">GPS Device ID</label>
                        <input
                            type="text"
                            value={formData.gpsDeviceId}
                            onChange={(e) => setFormData({ ...formData, gpsDeviceId: e.target.value })}
                            placeholder="Optional"
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="input-label">Assign Driver</label>
                        <select
                            value={formData.driverId}
                            onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                            className="input"
                        >
                            <option value="">No driver assigned</option>
                            {availableDrivers.map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                    {driver.name} {driver.bus ? '(Currently assigned)' : ''}
                                </option>
                            ))}
                        </select>
                        {availableDrivers.length === 0 && (
                            <p className="text-xs text-dark-500 mt-1">No drivers available. Add drivers first.</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="btn-ghost flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex-1"
                        >
                            {saving ? 'Saving...' : editingBus ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* API Key Modal */}
            <Modal
                isOpen={showApiKeyModal}
                onClose={() => setShowApiKeyModal(false)}
                title="API Key Generated"
            >
                <div className="space-y-4">
                    <p className="text-dark-300">
                        Store this API key securely. It will not be shown again.
                    </p>

                    <div className="flex items-center gap-2 p-4 rounded-xl bg-dark-900 border border-white/10">
                        <code className="flex-1 text-sm text-primary-400 break-all">
                            {generatedApiKey}
                        </code>
                        <button
                            onClick={copyApiKey}
                            className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
                        >
                            {copiedKey ? (
                                <Check className="w-5 h-5 text-secondary-400" />
                            ) : (
                                <Copy className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    <p className="text-sm text-dark-400">
                        Use this key in the Authorization header:
                        <br />
                        <code className="text-primary-400">Authorization: Bearer {'{API_KEY}'}</code>
                    </p>

                    <button
                        onClick={() => setShowApiKeyModal(false)}
                        className="btn-primary w-full"
                    >
                        Done
                    </button>
                </div>
            </Modal>

            {/* Bus Stops Modal */}
            <BusStopsModal
                isOpen={showStopsModal}
                onClose={() => {
                    setShowStopsModal(false);
                    setSelectedBusForStops(null);
                }}
                bus={selectedBusForStops}
                onSaved={() => fetchBuses(pagination.page)}
            />
        </div>
    );
}

export default AdminBuses;
