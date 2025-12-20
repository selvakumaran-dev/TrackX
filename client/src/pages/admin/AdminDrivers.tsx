/**
 * ============================================
 * Admin Drivers Management Page
 * ============================================
 * CRUD operations for drivers
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Plus,
    Search,
    Edit2,
    Trash2,
    User,
    Mail,
    Phone,
    X,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Bus,
} from 'lucide-react';
import api from '../../services/api';
import { apiUrl, isDev } from '../../config/env';

// Type definitions
interface BusData {
    id: string;
    busNumber: string;
    busName: string;
}

interface Driver {
    id: string;
    name: string;
    email: string;
    phone?: string;
    photoUrl?: string;
    isActive: boolean;
    busId?: string;
    bus?: BusData | null;
    lastLoginAt?: string;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

// Helper to get full photo URL
// In development, uploads are served from the backend server (port 3001)
// In production, they're served from the API_URL
const getPhotoUrl = (photoUrl: string | null | undefined): string | null => {
    if (!photoUrl) return null;
    // If already absolute URL, return as-is
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
    // In development, use localhost:3001 for uploads (bypasses Vite proxy issues)
    // In production, use the configured API URL
    const baseUrl = isDev ? 'http://localhost:3001' : apiUrl;
    return `${baseUrl}${photoUrl}`;
};

// Modal Component
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
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    className="relative w-full max-w-lg bg-dark-800 rounded-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                >
                    <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-dark-800 z-10">
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

function AdminDrivers() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [availableBuses, setAvailableBuses] = useState<BusData[]>([]);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        busId: '',
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Fetch drivers
    const fetchDrivers = async (page = 1) => {
        setLoading(true);
        try {
            const response = await api.get('/admin/drivers', {
                params: { page, limit: 10, search },
            });
            setDrivers(response.data.data || []);
            setPagination({
                page: response.data.pagination.page,
                totalPages: response.data.pagination.totalPages,
            });
        } catch (error) {
            console.error('Error fetching drivers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch available buses
    const fetchAvailableBuses = async (currentDriverId: string | null | undefined = null) => {
        try {
            const response = await api.get('/admin/buses', { params: { limit: 100 } });
            const allBuses = response.data.data || [];
            // Show buses that either have no driver, or have this driver assigned
            const available = allBuses.filter((bus: BusData & { driver?: { id: string } }) =>
                !bus.driver || bus.driver.id === currentDriverId
            );
            setAvailableBuses(available);
        } catch (error) {
            console.error('Error fetching buses:', error);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, [search]);

    // Open add modal
    const openAddModal = () => {
        setEditingDriver(null);
        setFormData({ name: '', email: '', password: '', phone: '', busId: '' });
        setFormError('');
        setShowModal(true);
        fetchAvailableBuses(null);
    };

    // Open edit modal
    const openEditModal = (driver: Driver) => {
        setEditingDriver(driver);
        setFormData({
            name: driver.name,
            email: driver.email,
            password: '',
            phone: driver.phone || '',
            busId: driver.busId || driver.bus?.id || '',
        });
        setFormError('');
        setShowModal(true);
        // Pass current driver's ID so their assigned bus remains in the list
        fetchAvailableBuses(driver.id);
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');

        try {
            const data: { name: string; email: string; phone: string | null; busId: string | null; password?: string } = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone || null,
                busId: formData.busId || null,
            };

            // Only include password if provided
            if (formData.password) {
                data.password = formData.password;
            }

            if (editingDriver) {
                await api.put(`/admin/drivers/${editingDriver.id}`, data);
            } else {
                // Password required for new driver
                if (!formData.password) {
                    setFormError('Password is required for new driver');
                    setSaving(false);
                    return;
                }
                data.password = formData.password;
                await api.post('/admin/drivers', data);
            }

            setShowModal(false);
            fetchDrivers(pagination.page);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            setFormError(err.response?.data?.error || 'Failed to save driver');
        } finally {
            setSaving(false);
        }
    };

    // Delete driver
    const handleDelete = async (driver: Driver) => {
        if (!confirm(`Are you sure you want to delete ${driver.name}?`)) return;

        try {
            await api.delete(`/admin/drivers/${driver.id}`);
            fetchDrivers(pagination.page);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            alert(err.response?.data?.error || 'Failed to delete driver');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Drivers</h1>
                    <p className="text-dark-400 mt-1">Manage your driver fleet</p>
                </div>
                <button onClick={openAddModal} className="btn-primary">
                    <Plus className="w-5 h-5" />
                    Add Driver
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input pl-12"
                />
            </div>

            {/* Grid View */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="spinner w-8 h-8 border-4" />
                    </div>
                ) : drivers.length > 0 ? (
                    drivers.map((driver, index) => (
                        <motion.div
                            key={driver.id}
                            className="card-hover"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {getPhotoUrl(driver.photoUrl) ? (
                                        <img
                                            src={getPhotoUrl(driver.photoUrl)!}
                                            alt={driver.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-700 flex items-center justify-center">
                                            <User className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-white">{driver.name}</h3>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${driver.isActive
                                            ? 'bg-secondary-500/20 text-secondary-400'
                                            : 'bg-dark-700 text-dark-400'
                                            }`}>
                                            {driver.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openEditModal(driver)}
                                        className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(driver)}
                                        className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-dark-400">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{driver.email}</span>
                                </div>
                                {driver.phone && (
                                    <div className="flex items-center gap-2 text-sm text-dark-400">
                                        <Phone className="w-4 h-4" />
                                        <span>{driver.phone}</span>
                                    </div>
                                )}
                                {driver.bus ? (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-4 h-4 rounded bg-primary-500/20 flex items-center justify-center">
                                            <Bus className="w-3 h-3 text-primary-400" />
                                        </div>
                                        <span className="text-primary-400">{driver.bus.busNumber}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-dark-500">
                                        <Bus className="w-4 h-4" />
                                        <span>No bus assigned</span>
                                    </div>
                                )}
                            </div>

                            {driver.lastLoginAt && (
                                <p className="mt-4 pt-4 border-t border-white/5 text-xs text-dark-500">
                                    Last login: {new Date(driver.lastLoginAt).toLocaleDateString()}
                                </p>
                            )}
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-dark-400">
                        No drivers found
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-dark-400">
                        Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchDrivers(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="btn-ghost disabled:opacity-50"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Previous
                        </button>
                        <button
                            onClick={() => fetchDrivers(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className="btn-ghost disabled:opacity-50"
                        >
                            Next
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingDriver ? 'Edit Driver' : 'Add New Driver'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="input-label">Full Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label className="input-label">Email Address *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label className="input-label">
                            Password {editingDriver ? '(leave blank to keep current)' : '*'}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input"
                            required={!editingDriver}
                        />
                    </div>

                    <div>
                        <label className="input-label">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="input-label">Assign Bus</label>
                        <select
                            value={formData.busId}
                            onChange={(e) => setFormData({ ...formData, busId: e.target.value })}
                            className="input"
                        >
                            <option value="">No bus assigned</option>
                            {availableBuses.map((bus) => (
                                <option key={bus.id} value={bus.id}>
                                    {bus.busNumber} - {bus.busName}
                                </option>
                            ))}
                        </select>
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
                            {saving ? 'Saving...' : editingDriver ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default AdminDrivers;
