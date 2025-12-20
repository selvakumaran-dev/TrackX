/**
 * Admin Settings - Change Password, Profile
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Save, AlertCircle, Check, Shield, User } from 'lucide-react';
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
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-dark-400 mt-1">Manage your account settings</p>
            </div>

            {/* Toast Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                            ? 'bg-secondary-500/20 border border-secondary-500/30 text-secondary-400'
                            : 'bg-red-500/20 border border-red-500/30 text-red-400'
                            }`}
                    >
                        {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Info Card */}
            <div className="card">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                        <User className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">{user?.name || 'Admin'}</h2>
                        <p className="text-sm text-dark-400">{user?.email}</p>
                    </div>
                    <div className="ml-auto">
                        <span className="px-3 py-1 rounded-full text-xs bg-primary-500/20 text-primary-400 border border-primary-500/30">
                            Administrator
                        </span>
                    </div>
                </div>
            </div>

            {/* Change Password Card */}
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Change Password</h3>
                        <p className="text-sm text-dark-500">Update your admin password</p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="input-label">Current Password *</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label className="input-label">New Password *</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="input-label">Confirm New Password *</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary w-full mt-4"
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

            {/* Security Info */}
            <div className="card bg-dark-800/50">
                <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary-400 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-white">Security Tips</h4>
                        <ul className="mt-2 text-sm text-dark-400 space-y-1">
                            <li>• Use a strong, unique password</li>
                            <li>• Never share your password</li>
                            <li>• Log out when using shared devices</li>
                            <li>• Change your password regularly</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
