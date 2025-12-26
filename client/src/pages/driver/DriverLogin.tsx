/**
 * Driver Login - Human-Centered Mobile-First Design
 * 
 * Design Philosophy:
 * - Warm, calming colors
 * - Large touch targets for mobile
 * - Clean and spacious
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Truck, Clock, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const DriverLogin: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [orgCode, setOrgCode] = useState('');
    const [organization, setOrganization] = useState<{ name: string; logoUrl?: string; code: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orgLoading, setOrgLoading] = useState(false);

    // Rate limit state
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutSeconds, setLockoutSeconds] = useState(0);

    useEffect(() => {
        if (lockoutSeconds > 0) {
            const timer = setInterval(() => {
                setLockoutSeconds(prev => {
                    if (prev <= 1) {
                        setIsLocked(false);
                        setError(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [lockoutSeconds]);

    // Cleanup lookup debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (orgCode && orgCode.length >= 3) {
                handleOrgLookup(orgCode);
            } else {
                setOrganization(null);
            }
        }, 800);
        return () => clearTimeout(timeoutId);
    }, [orgCode]);

    const handleOrgLookup = async (code: string) => {
        setOrgLoading(true);
        try {
            const response = await api.get(`/organizations/lookup/${code}`);
            if (response.data.success) {
                setOrganization(response.data.data);
            }
        } catch (err) {
            setOrganization(null);
        } finally {
            setOrgLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { setError('Please fill in all fields'); return; }
        if (isLocked) return;

        setLoading(true);
        setError(null);

        try {
            const result = await login(email, password, 'DRIVER');
            if (!result.success) {
                if (result.error?.includes('Too many') || result.error?.includes('locked')) {
                    try {
                        await api.post('/auth/login', { email, password, userType: 'DRIVER' });
                    } catch (apiError: unknown) {
                        const err = apiError as { response?: { status?: number; data?: { retryAfter?: number } } };
                        if (err.response?.status === 429) {
                            const retryAfter = err.response?.data?.retryAfter;
                            if (retryAfter) {
                                setIsLocked(true);
                                setLockoutSeconds(retryAfter);
                            }
                        }
                    }
                }
                setError(result.error || 'Login failed');
            }
        } catch (error: unknown) {
            const err = error as { response?: { status?: number; data?: { error?: string; retryAfter?: number } } };
            if (err.response?.status === 429) {
                const retryAfter = err.response?.data?.retryAfter;
                if (retryAfter) {
                    setIsLocked(true);
                    setLockoutSeconds(retryAfter);
                }
                setError(err.response?.data?.error || 'Too many attempts');
            } else {
                setError('Login failed');
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-[100dvh] bg-[#FDFBF7] flex flex-col">
            {/* Decorative Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#E8F4F8] rounded-full blur-3xl opacity-60" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D8F3DC] rounded-full blur-3xl opacity-40" />
            </div>

            {/* Header with Back */}
            <div className="relative z-10 p-4 safe-t">
                <Link to="/" className="inline-flex items-center gap-2 text-[#74796D] hover:text-[#2D6A4F] transition">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back</span>
                </Link>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-10">
                {/* Logo */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto mb-4 bg-[#1B4332] rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                        <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-[#1B4332] mb-2">Driver Login</h1>
                    <p className="text-[#74796D]">Sign in to start your route</p>
                </motion.div>

                {/* Rate Limit Countdown */}
                <AnimatePresence>
                    {isLocked && lockoutSeconds > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-5 mb-6 rounded-2xl bg-[#FFF1E6] border border-[#E07A5F]/20"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-[#E07A5F]/20 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-[#E07A5F]" />
                                </div>
                                <div>
                                    <p className="text-[#E07A5F] font-semibold">Too Many Attempts</p>
                                    <p className="text-xs text-[#E07A5F]/70">Account temporarily locked</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[#E07A5F]/70 text-sm">Try again in:</span>
                                <span className="text-3xl font-bold text-[#E07A5F] font-mono">
                                    {formatTime(lockoutSeconds)}
                                </span>
                            </div>
                            <div className="mt-4 h-2 bg-[#E07A5F]/20 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-[#E07A5F]"
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: lockoutSeconds, ease: 'linear' }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                    {error && !isLocked && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-50 border border-red-100">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <span className="text-sm text-red-600">{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#E9ECEF] p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Organization Code */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#1B4332]">Institute Code</label>
                            <div className="relative">
                                <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${organization ? 'text-[#2D6A4F]' : 'text-[#95A3A4]'}`} />
                                <input
                                    type="text"
                                    value={orgCode}
                                    onChange={(e) => setOrgCode(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border-2 rounded-xl text-[#1B4332] focus:outline-none focus:bg-white transition-all text-base uppercase
                                        ${organization ? 'border-[#2D6A4F]/20 bg-[#D8F3DC]/10' : 'border-[#E9ECEF] focus:border-[#457B9D]'}`}
                                    disabled={isLocked}
                                />
                                {orgLoading && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-[#457B9D] border-t-transparent rounded-full animate-spin" />
                                )}
                                {organization && !orgLoading && (
                                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2D6A4F]" />
                                )}
                            </div>
                            <AnimatePresence>
                                {organization && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="text-sm text-[#2D6A4F] font-medium flex items-center gap-1.5"
                                    >
                                        <span>Verified: {organization.name}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#1B4332]">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] focus:bg-white transition-all text-base"
                                    disabled={isLocked}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#1B4332]">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-14 py-4 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] focus:outline-none focus:border-[#457B9D] focus:bg-white transition-all text-base"
                                    disabled={isLocked}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#95A3A4] hover:text-[#52796F]">
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            disabled={loading || isLocked}
                            whileTap={{ scale: isLocked ? 1 : 0.98 }}
                            className={`w-full mt-2 py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${isLocked
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#457B9D] to-[#1D3557] shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : isLocked ? (
                                <>Locked <Clock className="w-5 h-5" /></>
                            ) : (
                                <>Sign In</>
                            )}
                        </motion.button>
                    </form>
                </div>

                {/* Rate Limit Info */}
                <p className="text-center mt-6 text-xs text-[#95A3A4]">
                    5 attempts allowed per 10 minutes
                </p>
            </div>

            {/* Footer */}
            <div className="relative z-10 p-4 text-center text-[#95A3A4] text-xs">
                TrackX © {new Date().getFullYear()}
            </div>
        </div>
    );
};

export default DriverLogin;
