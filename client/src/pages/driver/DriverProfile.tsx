/**
 * Driver Profile - Human-Centered Design
 * Warm, calming color palette
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Bus, LogOut, Clock,
    ChevronRight, Camera, Bell, Lock, HelpCircle, X, Save, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { apiUrl, isDev } from '../../config/env';
import ImageCropper from '../../components/ImageCropper';
import ConfirmModal from '../../components/common/ConfirmModal';

const getPhotoUrl = (photoUrl: string | null | undefined): string | null => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
    return `${apiUrl}${photoUrl}`;
};

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

    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string>('');

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
        await logout();
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image must be less than 5MB' });
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImage(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setUploadingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('photo', croppedBlob, 'profile.jpg');

            const res = await api.post('/driver/profile/photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setDriver(prev => prev ? { ...prev, photoUrl: res.data.data.photoUrl } : null);
            setMessage({ type: 'success', text: 'Photo updated!' });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload photo' });
        }
        setUploadingPhoto(false);
        setShowCropper(false);
        setSelectedImage('');
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
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
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
            await api.put('/driver/profile', { currentPassword, newPassword });

            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setMessage({ type: 'success', text: 'Password changed!' });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
        }
        setSaving(false);
    };

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-[#FDFBF7] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#FDFBF7] pb-28">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />

            {/* Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl shadow-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-[#2D6A4F]' : 'bg-[#E07A5F]'
                            }`}
                    >
                        <Check className="w-5 h-5 text-white" />
                        <span className="text-white font-medium">{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="bg-gradient-to-br from-[#2D6A4F] via-[#40916C] to-[#52B788] px-5 pt-8 pb-20 text-center">
                <div className="relative inline-block mb-4">
                    <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto overflow-hidden border-4 border-white/30">
                        {uploadingPhoto ? (
                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : getPhotoUrl(driver?.photoUrl) ? (
                            <img src={getPhotoUrl(driver?.photoUrl)!} alt={driver?.name} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-14 h-14 text-white" />
                        )}
                    </div>
                    <button
                        onClick={handlePhotoClick}
                        disabled={uploadingPhoto}
                        className="absolute bottom-0 right-0 w-10 h-10 bg-[#E07A5F] rounded-full flex items-center justify-center border-4 border-[#40916C] active:scale-95 transition-transform"
                    >
                        <Camera className="w-4 h-4 text-white" />
                    </button>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">{driver?.name || 'Driver'}</h1>
                <p className="text-white/80 text-sm">{driver?.email}</p>
            </div>

            {/* Bus Card */}
            {driver?.bus && (
                <div className="px-5 -mt-10 relative z-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-5 shadow-lg border border-[#E9ECEF]">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-[#D8F3DC] rounded-2xl flex items-center justify-center">
                                <Bus className="w-8 h-8 text-[#2D6A4F]" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-[#74796D] uppercase font-medium">Assigned Bus</p>
                                <p className="text-xl font-bold text-[#1B4332]">{driver.bus.busNumber}</p>
                                <p className="text-sm text-[#52796F]">{driver.bus.busName}</p>
                            </div>
                            <div className="w-3 h-3 bg-[#40916C] rounded-full animate-pulse" />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Menu */}
            <div className="px-5 mt-6 space-y-3">
                <p className="text-xs text-[#74796D] uppercase font-semibold px-2 mb-2">Account</p>

                <button onClick={() => setShowEditModal(true)} className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 active:bg-[#F8F9FA] border border-[#E9ECEF] shadow-sm">
                    <div className="w-12 h-12 bg-[#E8F4F8] rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-[#457B9D]" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-[#1B4332] font-medium">Edit Profile</p>
                        <p className="text-xs text-[#74796D]">Update your information</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#95A3A4]" />
                </button>

                <div className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 border border-[#E9ECEF] shadow-sm">
                    <div className="w-12 h-12 bg-[#D8F3DC] rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-[#1B4332] font-medium">Phone Number</p>
                        <p className="text-xs text-[#74796D]">{driver?.phone || 'Not set'}</p>
                    </div>
                </div>

                <button onClick={() => setShowPasswordModal(true)} className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 active:bg-[#F8F9FA] border border-[#E9ECEF] shadow-sm">
                    <div className="w-12 h-12 bg-[#FFF1E6] rounded-xl flex items-center justify-center">
                        <Lock className="w-5 h-5 text-[#E07A5F]" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-[#1B4332] font-medium">Change Password</p>
                        <p className="text-xs text-[#74796D]">Update your password</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#95A3A4]" />
                </button>

                <p className="text-xs text-[#74796D] uppercase font-semibold px-2 mt-6 mb-2">Preferences</p>

                <button className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 active:bg-[#F8F9FA] border border-[#E9ECEF] shadow-sm">
                    <div className="w-12 h-12 bg-[#F3E8FF] rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-[#8B5CF6]" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-[#1B4332] font-medium">Notifications</p>
                        <p className="text-xs text-[#74796D]">Manage alerts</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#95A3A4]" />
                </button>

                <button className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 active:bg-[#F8F9FA] border border-[#E9ECEF] shadow-sm">
                    <div className="w-12 h-12 bg-[#F8F9FA] rounded-xl flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-[#74796D]" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-[#1B4332] font-medium">Help & Support</p>
                        <p className="text-xs text-[#74796D]">Get assistance</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#95A3A4]" />
                </button>

                {/* Logout */}
                <motion.button onClick={() => setShowLogoutConfirm(true)} whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#FFF1E6] border border-[#E07A5F]/20 rounded-2xl p-4 flex items-center gap-4 mt-6">
                    <div className="w-12 h-12 bg-[#E07A5F]/10 rounded-xl flex items-center justify-center">
                        <LogOut className="w-5 h-5 text-[#E07A5F]" />
                    </div>
                    <p className="text-[#E07A5F] font-medium">Logout</p>
                </motion.button>

                <p className="text-center text-[#95A3A4] text-xs mt-6">TrackX Driver v1.0.0</p>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-white rounded-3xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[#1B4332]">Edit Profile</h2>
                                <button onClick={() => setShowEditModal(false)} className="p-2 rounded-full bg-[#F8F9FA]">
                                    <X className="w-5 h-5 text-[#74796D]" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-[#74796D] mb-1 block">Name</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl px-4 py-3 text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-[#74796D] mb-1 block">Phone</label>
                                    <input
                                        type="tel"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl px-4 py-3 text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleEditProfile}
                                disabled={saving}
                                className="w-full mt-6 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
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

            {/* Password Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowPasswordModal(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-white rounded-3xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[#1B4332]">Change Password</h2>
                                <button onClick={() => setShowPasswordModal(false)} className="p-2 rounded-full bg-[#F8F9FA]">
                                    <X className="w-5 h-5 text-[#74796D]" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-[#74796D] mb-1 block">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl px-4 py-3 text-[#1B4332] focus:outline-none focus:border-[#E07A5F]"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-[#74796D] mb-1 block">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl px-4 py-3 text-[#1B4332] focus:outline-none focus:border-[#E07A5F]"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-[#74796D] mb-1 block">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl px-4 py-3 text-[#1B4332] focus:outline-none focus:border-[#E07A5F]"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleChangePassword}
                                disabled={saving}
                                className="w-full mt-6 bg-gradient-to-r from-[#E07A5F] to-[#F4A261] text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
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

            {/* Image Cropper */}
            <ImageCropper
                isOpen={showCropper}
                imageSrc={selectedImage}
                onClose={() => { setShowCropper(false); setSelectedImage(''); }}
                onCropComplete={handleCropComplete}
                aspectRatio={1}
            />

            {/* Logout Confirm Modal */}
            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Logout Account"
                message="Are you sure you want to log out from your driver session?"
                confirmText="Logout"
                cancelText="Stay logged in"
                type="danger"
            />
        </div>
    );
};

export default DriverProfile;
