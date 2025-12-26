/**
 * Admin Login - Human-Centered Design
 * 
 * Design Philosophy:
 * - Warm, welcoming color palette
 * - Clean, spacious layout
 * - Friendly yet professional
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function AdminLogin() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Rate limit state
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutSeconds, setLockoutSeconds] = useState(0);

    useEffect(() => {
        if (lockoutSeconds > 0) {
            const timer = setInterval(() => {
                setLockoutSeconds(prev => {
                    if (prev <= 1) {
                        setIsLocked(false);
                        setError('');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [lockoutSeconds]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) return;

        setLoading(true);
        setError('');

        try {
            const result = await login(email, password, 'ADMIN');
            if (!result.success) {
                if (result.error?.includes('Too many') || result.error?.includes('locked')) {
                    try {
                        await api.post('/auth/login', { email, password, userType: 'ADMIN' });
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
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
            {/* Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-[#D8F3DC] rounded-full blur-3xl opacity-40" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FFF1E6] rounded-full blur-3xl opacity-50" />
            </div>

            <motion.div
                className="w-full max-w-md relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block">
                        <div className="w-16 h-16 mx-auto bg-[#1B4332] rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden">
                            <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </Link>
                    <h1 className="text-2xl font-bold text-[#1B4332]">Welcome Back</h1>
                    <p className="text-[#74796D] mt-1">Sign in to manage your fleet</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#E9ECEF] p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Rate Limit Countdown */}
                        {isLocked && lockoutSeconds > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-xl bg-[#FFF1E6] border border-[#E07A5F]/20"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-[#E07A5F]/20 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-[#E07A5F]" />
                                    </div>
                                    <div>
                                        <p className="text-[#E07A5F] font-semibold">Account Temporarily Locked</p>
                                        <p className="text-xs text-[#E07A5F]/70">Too many failed attempts</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-center gap-2">
                                    <span className="text-[#E07A5F]/70 text-sm">Try again in:</span>
                                    <span className="text-2xl font-bold text-[#E07A5F] font-mono">
                                        {formatTime(lockoutSeconds)}
                                    </span>
                                </div>
                                <div className="mt-3 h-1.5 bg-[#E07A5F]/20 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-[#E07A5F]"
                                        initial={{ width: '100%' }}
                                        animate={{ width: '0%' }}
                                        transition={{ duration: lockoutSeconds, ease: 'linear' }}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Error */}
                        {error && !isLocked && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-[#1B4332] mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] placeholder-[#95A3A4] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition-all"
                                    required
                                    disabled={isLocked}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#1B4332] mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4]" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-xl text-[#1B4332] placeholder-[#95A3A4] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition-all"
                                    required
                                    disabled={isLocked}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#95A3A4] hover:text-[#52796F] transition"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || isLocked}
                            className={`w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${isLocked
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#2D6A4F] to-[#40916C] hover:shadow-lg hover:shadow-[#2D6A4F]/25 hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Signing in...
                                </>
                            ) : isLocked ? (
                                <>Locked <Clock className="w-4 h-4" /></>
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Back Link */}
                <p className="text-center mt-6 flex flex-col gap-2">
                    <Link to="/register" className="text-sm font-medium text-[#2D6A4F] hover:underline transition">
                        Register your institution
                    </Link>
                    <Link to="/" className="text-sm text-[#74796D] hover:text-[#2D6A4F] transition">
                        ← Back to Home
                    </Link>
                </p>

                {/* Rate Limit Info */}
                <p className="text-center mt-4 text-xs text-[#95A3A4]">
                    5 attempts allowed per 10 minutes
                </p>
            </motion.div>
        </div>
    );
}

export default AdminLogin;
