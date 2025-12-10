/**
 * Driver Profile - Ultra Mobile-First Premium Design
 * With working Edit Profile, Photo Upload, and Change Password
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Bus, LogOut, Clock,
    ChevronRight, Camera, Bell, Lock, HelpCircle, X, Save, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface DriverData {
    name: string;
    email: string;
    phone?: string;
    photoUrl?: string;
    bus?: {
        busNumber: string;
        busName: string;
    };
    createdAt?: string;
}

const DriverProfile: React.FC = () => {
    const { logout } = useAuth();
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form states
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Photo upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/driver/profile');
                setDriver(res.data.data);
                setEditName(res.data.data.name || '');
                setEditPhone(res.data.data.phone || '');
            } catch (e) {
                console.error('Failed to fetch profile:', e);
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await logout();
        }
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image must be less than 5MB' });
            return;
        }

        setUploadingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('photo', file);

            const res = await api.post('/driver/profile/photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setDriver(prev => prev ? { ...prev, photoUrl: res.data.data.photoUrl } : null);
            setMessage({ type: 'success', text: 'Photo updated!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to upload photo' });
        }
        setUploadingPhoto(false);
    };

    const handleEditProfile = async () => {
        if (!editName.trim()) {
            setMessage({ type: 'error', text: 'Name is required' });
            return;
        }

        setSaving(true);
        try {
            const res = await api.put('/driver/profile', {
                name: editName.trim(),
                phone: editPhone.trim() || undefined,
            });

            setDriver(prev => prev ? { ...prev, name: res.data.data.name, phone: res.data.data.phone } : null);
            setShowEditModal(false);
            setMessage({ type: 'success', text: 'Profile updated!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile' });
        }
        setSaving(false);
    };

    const handleChangePassword = async () => {
        if (!currentPassword) {
            setMessage({ type: 'error', text: 'Current password is required' });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setSaving(true);
        try {
            await api.put('/driver/profile', {
                currentPassword,
                newPassword,
            });

            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setMessage({ type: 'success', text: 'Password changed!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' });
        }
        setSaving(false);
    };

    // Auto-hide messages
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-slate-900 pb-28">
            <style>{`
        .touch-btn{min-height:56px}
        .safe-b{padding-bottom:max(112px,calc(112px + env(safe-area-inset-bottom)))}
      `}</style>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
            />

            {/* Toast Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl shadow-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                    >
                        <Check className="w-5 h-5 text-white" />
                        <span className="text-white font-medium">{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-4 pt-8 pb-20 text-center">
                <div className="relative inline-block mb-4">
                    <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto overflow-hidden border-4 border-white/30">
                        {uploadingPhoto ? (
                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : driver?.photoUrl ? (
                            <img src={driver.photoUrl} alt={driver.name} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-14 h-14 text-white" />
                        )}
                    </div>
                    <button
                        onClick={handlePhotoClick}
                        disabled={uploadingPhoto}
                        className="absolute bottom-0 right-0 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center border-4 border-indigo-700 active:scale-95 transition-transform"
                    >
                        <Camera className="w-4 h-4 text-white" />
                    </button>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">{driver?.name || 'Driver'}</h1>
                <p className="text-indigo-200 text-sm">{driver?.email}</p>
            </div>

            {/* Bus Card - Overlapping */}
            {driver?.bus && (
                <div className="px-4 -mt-10 relative z-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                                <Bus className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 uppercase font-medium">Assigned Bus</p>
                                <p className="text-xl font-bold text-white">{driver.bus.busNumber}</p>
                                <p className="text-sm text-slate-400">{driver.bus.busName}</p>
                            </div>
                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Menu Items */}
            <div className="px-4 mt-6 space-y-3">
                <p className="text-xs text-slate-500 uppercase font-semibold px-2 mb-2">Account</p>

                <button
                    onClick={() => setShowEditModal(true)}
                    className="w-full bg-slate-800 rounded-2xl p-4 flex items-center gap-4 active:bg-slate-700 touch-btn"
                >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-medium">Edit Profile</p>
                        <p className="text-xs text-slate-500">Update your information</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>

                <div className="w-full bg-slate-800 rounded-2xl p-4 flex items-center gap-4 touch-btn">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-medium">Phone Number</p>
                        <p className="text-xs text-slate-500">{driver?.phone || 'Not set'}</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full bg-slate-800 rounded-2xl p-4 flex items-center gap-4 active:bg-slate-700 touch-btn"
                >
                    <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <Lock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-medium">Change Password</p>
                        <p className="text-xs text-slate-500">Update your password</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>

                <p className="text-xs text-slate-500 uppercase font-semibold px-2 mt-6 mb-2">Preferences</p>

                <button className="w-full bg-slate-800 rounded-2xl p-4 flex items-center gap-4 active:bg-slate-700 touch-btn">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-medium">Notifications</p>
                        <p className="text-xs text-slate-500">Manage alerts</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>

                <button className="w-full bg-slate-800 rounded-2xl p-4 flex items-center gap-4 active:bg-slate-700 touch-btn">
                    <div className="w-12 h-12 bg-slate-500/20 rounded-xl flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-white font-medium">Help & Support</p>
                        <p className="text-xs text-slate-500">Get assistance</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>

                {/* Logout Button */}
                <motion.button onClick={handleLogout} whileTap={{ scale: 0.98 }}
                    className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 mt-6 touch-btn">
                    <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <LogOut className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-red-400 font-medium">Logout</p>
                </motion.button>

                {/* App Version */}
                <p className="text-center text-slate-600 text-xs mt-6">TrackX Driver v1.0.0</p>
            </div>

            {/* Edit Profile Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-slate-800 rounded-3xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                                <button onClick={() => setShowEditModal(false)} className="p-2 rounded-full bg-slate-700">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 mb-1 block">Name</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 mb-1 block">Phone</label>
                                    <input
                                        type="tel"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                        placeholder="Your phone number"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleEditProfile}
                                disabled={saving}
                                className="w-full mt-6 bg-indigo-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Change Password Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowPasswordModal(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-slate-800 rounded-3xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Change Password</h2>
                                <button onClick={() => setShowPasswordModal(false)} className="p-2 rounded-full bg-slate-700">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 mb-1 block">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 mb-1 block">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 mb-1 block">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleChangePassword}
                                disabled={saving}
                                className="w-full mt-6 bg-amber-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Lock className="w-5 h-5" />
                                        Change Password
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DriverProfile;
