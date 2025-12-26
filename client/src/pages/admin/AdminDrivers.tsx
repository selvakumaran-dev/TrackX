/**
 * Admin Drivers Management Page
 * Human-Centered Design
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
import ConfirmModal from '../../components/common/ConfirmModal';

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

const getPhotoUrl = (photoUrl: string | null | undefined): string | null => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
    return `${apiUrl}${photoUrl}`;
};

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

function AdminDrivers() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [availableBuses, setAvailableBuses] = useState<BusData[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        busId: '',
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const fetchDrivers = async (page = 1) => {
        setLoading(true);
        try {
            const response = await api.get('/admin/drivers', { params: { page, limit: 10, search } });
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

    const fetchAvailableBuses = async (currentDriverId: string | null | undefined = null) => {
        try {
            const response = await api.get('/admin/buses', { params: { limit: 100 } });
            const allBuses = response.data.data || [];
            const available = allBuses.filter((bus: BusData & { driver?: { id: string } }) =>
                !bus.driver || bus.driver.id === currentDriverId
            );
            setAvailableBuses(available);
        } catch (error) {
            console.error('Error fetching buses:', error);
        }
    };

    useEffect(() => { fetchDrivers(); }, [search]);

    const openAddModal = () => {
        setEditingDriver(null);
        setFormData({ name: '', email: '', password: '', phone: '', busId: '' });
        setFormError('');
        setShowModal(true);
        fetchAvailableBuses(null);
    };

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
        fetchAvailableBuses(driver.id);
    };

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

            if (formData.password) {
                data.password = formData.password;
            }

            if (editingDriver) {
                await api.put(`/admin/drivers/${editingDriver.id}`, data);
            } else {
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

    const handleConfirmDelete = async () => {
        if (!driverToDelete) return;
        try {
            await api.delete(`/admin/drivers/${driverToDelete.id}`);
            fetchDrivers(pagination.page);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            setAlertConfig({
                isOpen: true,
                title: 'Delete Failed',
                message: err.response?.data?.error || 'Failed to delete driver',
                type: 'danger'
            });
        } finally {
            setDriverToDelete(null);
            setShowDeleteConfirm(false);
        }
    };

    const handleDeleteClick = (driver: Driver) => {
        setDriverToDelete(driver);
        setShowDeleteConfirm(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1B4332]">Drivers</h1>
                    <p className="text-[#74796D] text-sm mt-1">Manage your driver fleet</p>
                </div>
                <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#457B9D] to-[#1D3557] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                    <Plus className="w-5 h-5" />
                    Add Driver
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition"
                />
            </div>

            {/* Grid View */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-[#457B9D] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : drivers.length > 0 ? (
                    drivers.map((driver, index) => (
                        <motion.div
                            key={driver.id}
                            className="bg-white rounded-2xl p-5 border border-[#E9ECEF] hover:border-[#457B9D]/30 hover:shadow-lg transition-all"
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
                                            className="w-12 h-12 rounded-full object-cover border-2 border-[#E9ECEF]"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#457B9D] to-[#1D3557] flex items-center justify-center">
                                            <User className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-[#1B4332]">{driver.name}</h3>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${driver.isActive
                                            ? 'bg-[#D8F3DC] text-[#2D6A4F]'
                                            : 'bg-[#F8F9FA] text-[#74796D]'
                                            }`}>
                                            {driver.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openEditModal(driver)}
                                        className="p-2 rounded-lg hover:bg-[#F8F9FA] text-[#74796D] hover:text-[#1B4332] transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(driver)}
                                        className="p-2 rounded-lg hover:bg-[#FFF1E6] text-[#74796D] hover:text-[#E07A5F] transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-[#74796D]">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{driver.email}</span>
                                </div>
                                {driver.phone && (
                                    <div className="flex items-center gap-2 text-sm text-[#74796D]">
                                        <Phone className="w-4 h-4" />
                                        <span>{driver.phone}</span>
                                    </div>
                                )}
                                {driver.bus ? (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-5 h-5 rounded bg-[#D8F3DC] flex items-center justify-center">
                                            <Bus className="w-3 h-3 text-[#2D6A4F]" />
                                        </div>
                                        <span className="text-[#2D6A4F] font-medium">{driver.bus.busNumber}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-[#95A3A4]">
                                        <Bus className="w-4 h-4" />
                                        <span>No bus assigned</span>
                                    </div>
                                )}
                            </div>

                            {driver.lastLoginAt && (
                                <p className="mt-4 pt-4 border-t border-[#E9ECEF] text-xs text-[#95A3A4]">
                                    Last login: {new Date(driver.lastLoginAt).toLocaleDateString()}
                                </p>
                            )}
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-[#74796D]">
                        No drivers found. Add your first driver to get started.
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-[#74796D]">Page {pagination.page} of {pagination.totalPages}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchDrivers(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="flex items-center gap-1 px-4 py-2 bg-white border border-[#E9ECEF] rounded-lg text-[#74796D] hover:bg-[#F8F9FA] disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>
                        <button
                            onClick={() => fetchDrivers(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className="flex items-center gap-1 px-4 py-2 bg-white border border-[#E9ECEF] rounded-lg text-[#74796D] hover:bg-[#F8F9FA] disabled:opacity-50"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingDriver ? 'Edit Driver' : 'Add New Driver'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[#1B4332] mb-2">Full Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] focus:bg-white transition"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1B4332] mb-2">Email Address *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] focus:bg-white transition"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1B4332] mb-2">
                            Password {editingDriver ? '(leave blank to keep current)' : '*'}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] focus:bg-white transition"
                            required={!editingDriver}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1B4332] mb-2">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] focus:bg-white transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1B4332] mb-2">Assign Bus</label>
                        <select
                            value={formData.busId}
                            onChange={(e) => setFormData({ ...formData, busId: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] focus:bg-white transition"
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
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 px-4 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] font-medium hover:bg-[#E9ECEF] transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 px-4 bg-gradient-to-r from-[#457B9D] to-[#1D3557] text-white font-semibold rounded-xl shadow-lg disabled:opacity-50">
                            {saving ? 'Saving...' : editingDriver ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDriverToDelete(null); }}
                onConfirm={handleConfirmDelete}
                title="Delete Driver"
                message={`Are you sure you want to delete ${driverToDelete?.name}? This action cannot be undone.`}
                confirmText="Delete Driver"
                cancelText="Keep Driver"
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

export default AdminDrivers;
