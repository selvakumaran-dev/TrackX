/**
 * Admin Organization Page
 * Clean, modern design with warm accents
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Copy, RefreshCw, Palette, Globe, Phone, Mail,
    MapPin, Save, AlertCircle, Check, Users, Bus,
    Share2, ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';

interface Organization {
    id: string;
    name: string;
    code: string;
    slug: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    address: string | null;
    city: string | null;
    state: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    website: string | null;
    subscriptionTier: string;
    subscriptionEnd: string | null;
    maxBuses: number;
    maxDrivers: number;
    isVerified: boolean;
    _count?: {
        buses: number;
        drivers: number;
        admins: number;
    };
}

interface OrgStats {
    buses: { current: number; limit: number };
    drivers: { current: number; limit: number };
    admins: number;
    subscription: { tier: string; expiresAt: string | null };
}

const AdminOrganization: React.FC = () => {
    const { user } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [stats, setStats] = useState<OrgStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [showRegenConfirm, setShowRegenConfirm] = useState(false);
    const [copied, setCopied] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        contactEmail: '',
        contactPhone: '',
        website: '',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
    });

    useEffect(() => {
        fetchOrganization();
    }, []);

    const fetchOrganization = async () => {
        try {
            const [orgRes, statsRes] = await Promise.all([
                api.get('/organizations/my'),
                api.get('/organizations/my/stats'),
            ]);

            if (orgRes.data.success) {
                const org = orgRes.data.data;
                setOrganization(org);
                setFormData({
                    name: org.name || '',
                    address: org.address || '',
                    city: org.city || '',
                    state: org.state || '',
                    contactEmail: org.contactEmail || '',
                    contactPhone: org.contactPhone || '',
                    website: org.website || '',
                    primaryColor: org.primaryColor || '#6366f1',
                    secondaryColor: org.secondaryColor || '#8b5cf6',
                });
            }

            if (statsRes.data.success) {
                setStats(statsRes.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch organization:', error);
            setMessage({ type: 'error', text: 'Failed to load organization details' });
        }
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put('/organizations/my', formData);
            if (res.data.success) {
                setOrganization(res.data.data);
                setMessage({ type: 'success', text: 'Organization updated successfully!' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update' });
        }
        setSaving(false);
    };

    const handleConfirmRegenerate = async () => {
        setRegenerating(true);
        try {
            const res = await api.post('/organizations/my/regenerate-code');
            if (res.data.success) {
                setOrganization(prev => prev ? { ...prev, code: res.data.data.code } : null);
                setMessage({ type: 'success', text: 'New join code generated!' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to regenerate code' });
        } finally {
            setRegenerating(false);
            setShowRegenConfirm(false);
        }
    };

    const handleRegenerateCodeClick = () => {
        setShowRegenConfirm(true);
    };

    const copyCode = () => {
        if (organization?.code) {
            navigator.clipboard.writeText(organization.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#E9ECEF] shadow-sm">
                <Building2 className="w-16 h-16 mx-auto text-[#95A3A4] mb-4" />
                <h2 className="text-xl font-bold text-[#1B4332] mb-2">No Organization Found</h2>
                <p className="text-[#74796D]">Your account is not associated with any organization.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-[#1B4332]">Organization</h1>
                <p className="text-[#74796D] mt-1">Manage your institution settings and branding</p>
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

            {/* Join Code Card */}
            <div className="bg-gradient-to-r from-[#2D6A4F] to-[#40916C] rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Student Access Code</h3>
                        <p className="text-[#D8F3DC] text-sm mb-6 max-w-md">
                            Share this unique code with students and parents to grant them access to track buses for your institution.
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/20">
                                <span className="text-3xl font-bold tracking-[0.2em] font-mono">{organization.code}</span>
                            </div>
                            <button
                                onClick={copyCode}
                                className="p-3 bg-white text-[#2D6A4F] hover:bg-[#F8F9FA] rounded-xl transition-colors shadow-sm"
                                title="Copy code"
                            >
                                {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 min-w-[180px]">
                        <button
                            onClick={handleRegenerateCodeClick}
                            disabled={regenerating}
                            className="flex items-center justify-center gap-2 py-3 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl font-medium transition-colors border border-white/20 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                            Regenerate
                        </button>
                        <button className="flex items-center justify-center gap-2 py-3 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl font-medium transition-colors border border-white/20">
                            <Share2 className="w-4 h-4" />
                            Share Link
                        </button>
                    </div>
                </div>
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-black/5 rounded-full blur-2xl" />
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#E8F4F8] flex items-center justify-center text-[#457B9D]">
                            <Bus className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-[#74796D] uppercase font-bold tracking-wider">Buses</p>
                            <p className="text-3xl font-bold text-[#1B4332]">{stats.buses.current}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#D8F3DC] flex items-center justify-center text-[#2D6A4F]">
                            <Users className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-[#74796D] uppercase font-bold tracking-wider">Drivers</p>
                            <p className="text-3xl font-bold text-[#1B4332]">{stats.drivers.current}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] shadow-sm flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#F3E8FF] flex items-center justify-center text-[#8B5CF6]">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-[#74796D] uppercase font-bold tracking-wider">Admins</p>
                            <p className="text-3xl font-bold text-[#1B4332]">{stats.admins}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Organization Details Form */}
            <div className="bg-white rounded-2xl border border-[#E9ECEF] shadow-sm overflow-hidden">
                <div className="bg-[#F8F9FA] px-8 py-6 border-b border-[#E9ECEF]">
                    <h3 className="text-lg font-bold text-[#1B4332] flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-[#457B9D]" />
                        Institution Details
                    </h3>
                    <p className="text-[#74796D] text-sm mt-1">Update your organization's public profile</p>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-[#1B4332] mb-2">Institution Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-[#1B4332] mb-2">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#1B4332] mb-2">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#1B4332] mb-2">State</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-[#1B4332] mb-2">Contact Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                <input
                                    type="email"
                                    name="contactEmail"
                                    value={formData.contactEmail}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#1B4332] mb-2">Contact Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                <input
                                    type="tel"
                                    name="contactPhone"
                                    value={formData.contactPhone}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[#1B4332] mb-2">Website</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-[#E9ECEF]">
                        <label className="block text-sm font-semibold text-[#1B4332] mb-4 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-[#E07A5F]" />
                            Brand Colors
                        </label>
                        <div className="flex flex-wrap gap-8">
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    name="primaryColor"
                                    value={formData.primaryColor}
                                    onChange={handleChange}
                                    className="w-12 h-12 rounded-xl cursor-pointer border-4 border-white shadow-md ring-1 ring-gray-200"
                                />
                                <span className="text-sm font-medium text-[#74796D]">Primary Color</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    name="secondaryColor"
                                    value={formData.secondaryColor}
                                    onChange={handleChange}
                                    className="w-12 h-12 rounded-xl cursor-pointer border-4 border-white shadow-md ring-1 ring-gray-200"
                                />
                                <span className="text-sm font-medium text-[#74796D]">Secondary Color</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-[#457B9D] to-[#1D3557] text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
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
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={showRegenConfirm}
                onClose={() => setShowRegenConfirm(false)}
                onConfirm={handleConfirmRegenerate}
                title="Regenerate Join Code"
                message="Are you sure you want to regenerate the join code? The current code will be immediately invalidated and student maps will stop updating until they enter the new code."
                confirmText="Regenerate Code"
                cancelText="Cancel"
                type="warning"
            />
        </div>
    );
};

export default AdminOrganization;
