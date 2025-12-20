/**
 * Driver Login - Ultra Mobile-First Premium Design with Rate Limit Countdown
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Truck, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const DriverLogin: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Rate limit state
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutSeconds, setLockoutSeconds] = useState(0);

    // Countdown timer effect
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

    // Format seconds as mm:ss
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
                // Check if it's a rate limit error
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
        <div className="min-h-[100dvh] bg-slate-900 flex flex-col">
            <style>{`
        .touch-input{min-height:56px;font-size:16px}
        .touch-btn{min-height:56px}
      `}</style>

            {/* Header with Back */}
            <div className="p-4 safe-t">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm">Back</span>
                </Link>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center px-6 pb-10">
                {/* Logo */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
                        <Truck className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Driver Login</h1>
                    <p className="text-slate-400">Sign in to start tracking</p>
                </motion.div>

                {/* Rate Limit Countdown */}
                {isLocked && lockoutSeconds > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-amber-400 font-semibold">Too Many Attempts</p>
                                <p className="text-xs text-amber-400/70">Account temporarily locked</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-amber-400/70 text-sm">Try again in:</span>
                            <span className="text-3xl font-bold text-amber-400 font-mono">
                                {formatTime(lockoutSeconds)}
                            </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-4 h-2 bg-amber-500/20 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-amber-500"
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: lockoutSeconds, ease: 'linear' }}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Error */}
                {error && !isLocked && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <span className="text-sm text-red-400">{error}</span>
                    </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 touch-input disabled:opacity-50"
                                disabled={isLocked}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-14 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 touch-input disabled:opacity-50"
                                disabled={isLocked}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1">
                                {showPassword ? <EyeOff className="w-5 h-5 text-slate-500" /> : <Eye className="w-5 h-5 text-slate-500" />}
                            </button>
                        </div>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading || isLocked}
                        whileTap={{ scale: isLocked ? 1 : 0.98 }}
                        className={`w-full mt-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/30 touch-btn flex items-center justify-center gap-2 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                {/* Rate Limit Info */}
                <p className="text-center mt-6 text-xs text-slate-600">
                    5 attempts allowed per 10 minutes
                </p>
            </div>

            {/* Footer */}
            <div className="p-4 text-center text-slate-600 text-xs">
                TrackX © {new Date().getFullYear()}
            </div>
        </div>
    );
};

export default DriverLogin;
