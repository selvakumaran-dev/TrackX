/**
 * Master Root Authority Access - Human-Centered Design
 * Stealth access point for TrackX Company Personnel Only
 * Matches the "New UI" (Sage Green / Organic / Premium)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Terminal,
    Lock,
    Zap,
    ArrowRight,
    Eye,
    EyeOff,
    Fingerprint,
    Command,
    Bus,
    AlertCircle,
    Key
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

function MasterAccess() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleMasterLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await login(email, password, 'SUPER_ADMIN');
            if (!result.success) {
                setError(result.error || 'Authorization Failed: Protocol Denied');
            }
        } catch (err) {
            setError('System Error: Communication Interrupted');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 selection:bg-[#D8F3DC]">
            {/* Soft Decorative Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-[#D8F3DC] rounded-full blur-3xl opacity-40" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FFF1E6] rounded-full blur-3xl opacity-50" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Brand Header */}
                <div className="text-center mb-10">
                    <Link to="/" className="inline-block">
                        <div className="w-20 h-20 mx-auto bg-[#1B4332] rounded-3xl flex items-center justify-center shadow-xl mb-6 group transition-all duration-500 hover:rotate-[360deg] overflow-hidden">
                            <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </Link>
                    <h1 className="text-2xl font-black text-[#1B4332] uppercase tracking-[0.2em] mb-1">Super Admin</h1>
                    <div className="flex items-center justify-center gap-3">
                        <span className="h-0.5 w-6 bg-[#2D6A4F]/20" />
                        <span className="text-[10px] font-bold text-[#52796F] tracking-[0.3em] uppercase">Control Center Portal</span>
                        <span className="h-0.5 w-6 bg-[#2D6A4F]/20" />
                    </div>
                </div>

                {/* Login Card - Matches Main UI */}
                <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(27,67,50,0.08)] border border-[#E9ECEF] p-8 md:p-10 relative overflow-hidden">
                    {/* Subtle Internal Border */}
                    <div className="absolute inset-0 border-[12px] border-[#FDFBF7]/50 pointer-events-none rounded-[32px]" />

                    <form onSubmit={handleMasterLogin} className="space-y-6 relative">
                        {/* Error Alert */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-2xl bg-[#FFF1E6] border border-[#E07A5F]/20 flex items-center gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-[#E07A5F]" />
                                    <span className="text-xs font-bold text-[#E07A5F] uppercase tracking-wide">{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Authority Email */}
                        <div>
                            <label className="block text-[10px] font-black text-[#74796D] uppercase tracking-widest mb-3 ml-1">Administrator Email</label>
                            <div className="relative group">
                                <Command className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4] group-focus-within:text-[#2D6A4F] transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your authority email"
                                    className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl py-4 pl-12 pr-4 text-[#1B4332] text-sm font-semibold placeholder-[#95A3A4] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Passcode */}
                        <div>
                            <label className="block text-[10px] font-black text-[#74796D] uppercase tracking-widest mb-3 ml-1">Security Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4] group-focus-within:text-[#2D6A4F] transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl py-4 pl-12 pr-12 text-[#1B4332] text-sm font-semibold placeholder-[#95A3A4] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#95A3A4] hover:text-[#2D6A4F] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Action */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group overflow-hidden rounded-2xl py-4 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-[#2D6A4F]/20"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] hover:scale-105 transition-transform duration-500" />
                            <div className="relative flex items-center justify-center gap-3 text-white font-bold text-xs uppercase tracking-[0.2em]">
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>
                </div>

                {/* Footer Security Badge */}
                <div className="mt-12 flex flex-col items-center gap-6">
                    <div className="flex items-center gap-3 px-4 py-2 bg-[#D8F3DC]/50 rounded-full border border-[#2D6A4F]/10">
                        <Shield className="w-4 h-4 text-[#2D6A4F]" />
                        <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-widest leading-none mt-0.5">
                            Level 5 Secured Session
                        </span>
                    </div>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="text-[10px] font-bold text-[#74796D] hover:text-[#2D6A4F] uppercase tracking-[0.2em] transition-colors"
                    >
                        ← Back to Home
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default MasterAccess;
