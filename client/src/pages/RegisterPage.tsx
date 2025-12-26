/**
 * Organization Registration Page
 * Human-Centered Design with warm color palette
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bus, Building2, User, Mail, Lock, Phone, MapPin, Globe,
    ArrowRight, ArrowLeft, AlertCircle, CheckCircle, Sparkles, GraduationCap
} from 'lucide-react';
import api from '../services/api';

interface FormData {
    organizationName: string;
    address: string;
    city: string;
    state: string;
    contactPhone: string;
    website: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    adminPhone: string;
}

function RegisterPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState<{ code: string; name: string } | null>(null);

    const [formData, setFormData] = useState<FormData>({
        organizationName: '',
        address: '',
        city: '',
        state: '',
        contactPhone: '',
        website: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        adminPhone: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const validateStep1 = () => {
        if (!formData.organizationName.trim()) {
            setError('Institution name is required');
            return false;
        }
        if (formData.organizationName.trim().length < 3) {
            setError('Institution name must be at least 3 characters');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.adminName.trim()) {
            setError('Admin name is required');
            return false;
        }
        if (!formData.adminEmail.trim() || !formData.adminEmail.includes('@')) {
            setError('Valid email is required');
            return false;
        }
        if (formData.adminPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateStep2()) return;

        setLoading(true);
        setError('');

        try {
            const res = await api.post('/organizations/register', formData);

            if (res.data.success) {
                setSuccess({
                    code: res.data.data.organization.code,
                    name: res.data.data.organization.name,
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        }

        setLoading(false);
    };

    // Success Screen
    if (success) {
        return (
            <div className="min-h-[100dvh] bg-[#FDFBF7] flex items-center justify-center px-4">
                {/* Background Decorations */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#D8F3DC] rounded-full blur-3xl opacity-40" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#E8F4F8] rounded-full blur-3xl opacity-40" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 max-w-md w-full bg-white border border-[#E9ECEF] rounded-3xl p-8 text-center shadow-xl"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#1B4332] mb-2">Registration Successful!</h1>
                    <p className="text-[#74796D] mb-6">
                        Welcome to TrackX, {success.name}!
                    </p>

                    <div className="bg-[#D8F3DC] rounded-2xl p-6 mb-6">
                        <p className="text-sm text-[#2D6A4F] mb-2">Your Organization Code</p>
                        <div className="text-4xl font-bold text-[#1B4332] tracking-widest mb-2">
                            {success.code}
                        </div>
                        <p className="text-xs text-[#52796F]">
                            Share this code with students to access your buses
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Link
                            to="/admin/login"
                            className="block w-full py-3.5 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white font-semibold rounded-xl transition shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            Login to Admin Panel
                        </Link>
                        <Link
                            to="/"
                            className="block w-full py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] text-[#1B4332] font-medium rounded-xl transition hover:bg-[#E9ECEF]"
                        >
                            Back to Home
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#FDFBF7] flex items-center justify-center px-4 py-8">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#D8F3DC] rounded-full blur-3xl opacity-40" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#E8F4F8] rounded-full blur-3xl opacity-40" />
            </div>

            <div className="relative z-10 max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                            <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-2xl font-bold text-[#1B4332]">TrackX</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-[#1B4332] mb-2">Register Your Institution</h1>
                    <p className="text-[#74796D]">
                        Get started with campus bus tracking in minutes
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition ${step >= 1 ? 'bg-[#2D6A4F] text-white' : 'bg-[#E9ECEF] text-[#74796D]'
                            }`}>
                            1
                        </div>
                        <span className={step >= 1 ? 'text-[#1B4332] font-medium' : 'text-[#95A3A4]'}>Institution</span>
                    </div>
                    <div className="w-12 h-0.5 bg-[#E9ECEF]" />
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition ${step >= 2 ? 'bg-[#2D6A4F] text-white' : 'bg-[#E9ECEF] text-[#74796D]'
                            }`}>
                            2
                        </div>
                        <span className={step >= 2 ? 'text-[#1B4332] font-medium' : 'text-[#95A3A4]'}>Admin Account</span>
                    </div>
                </div>

                {/* Form Card */}
                <motion.div
                    className="bg-white border border-[#E9ECEF] rounded-2xl p-6 md:p-8 shadow-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2 p-4 mb-6 bg-red-50 border border-red-100 rounded-xl text-red-600"
                            >
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                        {step === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-[#1B4332] mb-2">Institution Name *</label>
                                    <div className="relative">
                                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                        <input
                                            type="text"
                                            name="organizationName"
                                            value={formData.organizationName}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1B4332] mb-2">Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1B4332] mb-2">City</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1B4332] mb-2">State</label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1B4332] mb-2">Contact Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                            <input
                                                type="tel"
                                                name="contactPhone"
                                                value={formData.contactPhone}
                                                onChange={handleChange}
                                                className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1B4332] mb-2">Website</label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                            <input
                                                type="url"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleChange}
                                                className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3.5 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    Next: Admin Account
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="bg-[#D8F3DC] rounded-xl p-4 flex items-center gap-3 mb-2">
                                    <Building2 className="w-5 h-5 text-[#2D6A4F]" />
                                    <div>
                                        <p className="text-[#1B4332] font-medium">{formData.organizationName}</p>
                                        <p className="text-sm text-[#52796F]">Creating admin account</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1B4332] mb-2">Admin Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                        <input
                                            type="text"
                                            name="adminName"
                                            value={formData.adminName}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1B4332] mb-2">Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                        <input
                                            type="email"
                                            name="adminEmail"
                                            value={formData.adminEmail}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1B4332] mb-2">Password *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                        <input
                                            type="password"
                                            name="adminPassword"
                                            value={formData.adminPassword}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <p className="text-xs text-[#95A3A4] mt-1.5 ml-1">Minimum 6 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1B4332] mb-2">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                        <input
                                            type="tel"
                                            name="adminPhone"
                                            value={formData.adminPhone}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] text-[#1B4332] font-medium rounded-xl transition hover:bg-[#E9ECEF] flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3.5 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                Create Account
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </form>

                    <p className="text-center text-[#74796D] text-sm mt-6">
                        Already have an account?{' '}
                        <Link to="/admin/login" className="text-[#2D6A4F] font-medium hover:underline transition">
                            Login here
                        </Link>
                    </p>
                </motion.div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    <div className="text-[#74796D] text-sm">
                        <CheckCircle className="w-5 h-5 mx-auto mb-1 text-[#2D6A4F]" />
                        Completely free
                    </div>
                    <div className="text-[#74796D] text-sm">
                        <CheckCircle className="w-5 h-5 mx-auto mb-1 text-[#2D6A4F]" />
                        Unlimited buses
                    </div>
                    <div className="text-[#74796D] text-sm">
                        <CheckCircle className="w-5 h-5 mx-auto mb-1 text-[#2D6A4F]" />
                        Setup in 5 mins
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
