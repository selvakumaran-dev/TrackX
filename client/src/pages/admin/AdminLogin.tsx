/**
 * Admin Login - Clean & Professional with Rate Limit Countdown
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

    // Countdown timer effect
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

    // Format seconds as mm:ss
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
                // Check if it's a rate limit error
                if (result.error?.includes('Too many') || result.error?.includes('locked')) {
                    // Try to get the lockout time from the API directly
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
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                className="w-full max-w-sm relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block">
                        <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4">
                            <Bus className="w-6 h-6 text-white" />
                        </div>
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Admin Login</h1>
                    <p className="text-dark-400 text-sm mt-1">Sign in to manage your fleet</p>
                </div>

                {/* Form Card */}
                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Rate Limit Countdown */}
                        {isLocked && lockoutSeconds > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-amber-400 font-semibold">Account Temporarily Locked</p>
                                        <p className="text-xs text-amber-400/70">Too many failed attempts</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-center gap-2">
                                    <span className="text-amber-400/70 text-sm">Try again in:</span>
                                    <span className="text-2xl font-bold text-amber-400 font-mono">
                                        {formatTime(lockoutSeconds)}
                                    </span>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-3 h-1.5 bg-amber-500/20 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-amber-500"
                                        initial={{ width: '100%' }}
                                        animate={{ width: '0%' }}
                                        transition={{ duration: lockoutSeconds, ease: 'linear' }}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Regular Error */}
                        {error && !isLocked && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="input-label">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input pl-10"
                                    required
                                    disabled={isLocked}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pl-10 pr-10"
                                    required
                                    disabled={isLocked}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || isLocked}
                            className={`btn-primary w-full ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <><div className="spinner" /> Signing in...</>
                            ) : isLocked ? (
                                <>Locked <Clock className="w-4 h-4" /></>
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Back Link */}
                <p className="text-center mt-6">
                    <Link to="/" className="text-sm text-dark-400 hover:text-dark-300">
                        ← Back to Home
                    </Link>
                </p>

                {/* Rate Limit Info */}
                <p className="text-center mt-4 text-xs text-dark-600">
                    5 attempts allowed per 10 minutes
                </p>
            </motion.div>
        </div>
    );
}

export default AdminLogin;
