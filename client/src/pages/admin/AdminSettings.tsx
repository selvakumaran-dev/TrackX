/**
 * Admin Settings - Human-Centered Design
 * Warm, professional profile and security management
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Save, AlertCircle, Check, Shield, User, Key } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AdminSettings: React.FC = () => {
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

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
            await api.put('/admin/profile/password', {
                currentPassword,
                newPassword,
            });

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setMessage({ type: 'success', text: 'Password changed successfully!' });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
        }
        setSaving(false);
    };

    // Auto-hide messages
    React.useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-[#1B4332]">Settings</h1>
                <p className="text-[#74796D] mt-1">Manage your account and security</p>
            </div>

            {/* Toast Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-xl flex items-center gap-3 shadow-lg ${message.type === 'success'
                            ? 'bg-[#D8F3DC] border border-[#2D6A4F]/20 text-[#2D6A4F]'
                            : 'bg-[#FFF1E6] border border-[#E07A5F]/20 text-[#E07A5F]'
                            }`}
                    >
                        {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-medium">{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Info Card */}
            <div className="bg-white rounded-2xl p-6 border border-[#E9ECEF] shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                    <div className="w-16 h-16 rounded-full bg-[#D8F3DC] flex items-center justify-center border-4 border-[#F8F9FA] flex-shrink-0">
                        <User className="w-8 h-8 text-[#2D6A4F]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-extrabold text-[#1B4332] truncate">{user?.name || 'Admin'}</h2>
                        <p className="text-[#74796D] text-sm truncate">{user?.email}</p>
                    </div>
                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                        <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#E8F4F8] text-[#457B9D] border border-[#457B9D]/10">
                            Administrator
                        </span>
                    </div>
                </div>
            </div>


            {/* Change Password Card */}
            <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
                <div className="bg-[#F8F9FA] px-6 py-4 border-b border-[#E9ECEF] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF1E6] flex items-center justify-center">
                        <Key className="w-4 h-4 text-[#E07A5F]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#1B4332]">Change Password</h3>
                        <p className="text-xs text-[#74796D]">Update your security credentials</p>
                    </div>
                </div>

                <div className="p-6">
                    <form onSubmit={handleChangePassword} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-[#1B4332] mb-2">Current Password *</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#95A3A4]" />
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-[#1B4332] mb-2">New Password *</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#95A3A4]" />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1B4332] mb-2">Confirm Password *</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#95A3A4]" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full mt-2 bg-gradient-to-r from-[#E07A5F] to-[#F4A261] text-white font-bold text-lg py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Update Password
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Security Info */}
            <div className="bg-[#E8F4F8] rounded-xl p-5 border border-[#457B9D]/20">
                <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#457B9D] mt-0.5" />
                    <div>
                        <h4 className="font-bold text-[#1B4332]">Security Tips</h4>
                        <ul className="mt-2 text-sm text-[#52796F] space-y-1">
                            <li>• Use a strong, unique password with a mix of characters</li>
                            <li>• Never share your password with anyone</li>
                            <li>• Log out when using shared or public devices</li>
                            <li>• Change your password every 3-6 months</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
