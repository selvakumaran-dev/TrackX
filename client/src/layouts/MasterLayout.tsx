/**
 * Master Admin Layout - Human-Centered Root Design
 * Premium Sage Green theme with prominent Root Authority branding
 */

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    ShieldCheck,
    Globe,
    Activity,
    Building2,
    Settings,
    LogOut,
    Menu,
    X,
    Zap,
    Cpu,
    Fingerprint,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const navItems = [
    { path: '/superadmin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/superadmin/map', label: 'Global Fleet Map', icon: Globe },
    { path: '/superadmin/organizations', label: 'Manage Institutions', icon: Building2 },
    { path: '/superadmin/system', label: 'System Health', icon: Activity },
    { path: '/superadmin/settings', label: 'Platform Settings', icon: Settings },
];

function MasterLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [health, setHealth] = useState<any>(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await api.get('/superadmin/stats');
                setHealth(res.data.data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen flex bg-[#FDFBF7]">
            {/* Soft Background Accents */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#D8F3DC]/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-[#FFF1E6]/20 blur-[120px] rounded-full" />
            </div>

            {/* Desktop Sidebar - Premium White Glass */}
            <aside className="hidden lg:flex flex-col w-72 fixed left-0 top-0 h-full bg-white/80 backdrop-blur-2xl border-r border-[#E9ECEF] z-[100] transition-all duration-500 shadow-2xl shadow-[#1B4332]/5">
                {/* Master Identity */}
                <div className="h-24 flex items-center px-8 border-b border-[#F8F9FA]">
                    <Link to="/superadmin/dashboard" className="flex items-center gap-4 group">
                        <div className="relative">
                            <div className="w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 overflow-hidden">
                                <img src="/icon.svg" alt="TrackX Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="absolute -inset-2 bg-[#2D6A4F]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-[#1B4332] tracking-tighter text-2xl leading-none">TRACKX</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E07A5F] group-hover:animate-pulse" />
                                <span className="text-[10px] font-black text-[#52796F] tracking-[0.2em] uppercase">Super Administrator</span>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center justify-between px-5 py-4 rounded-[24px] text-sm font-black transition-all group ${isActive
                                    ? 'bg-[#1B4332] text-white shadow-2xl shadow-[#1B4332]/25 scale-[1.03]'
                                    : 'text-[#74796D] hover:text-[#1B4332] hover:bg-[#D8F3DC]/40'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <item.icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'text-[#D8F3DC] scale-110' : 'group-hover:scale-110 group-hover:text-[#2D6A4F]'}`} />
                                    <span className="uppercase tracking-tight">{item.label}</span>
                                </div>
                                {isActive ? (
                                    <motion.div layoutId="nav-dot" className="w-1.5 h-1.5 rounded-full bg-[#E07A5F]" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Root Performance Mini Card */}
                <div className="mx-6 mb-8 p-6 bg-[#1B4332] rounded-[32px] border border-[#2D6A4F] relative overflow-hidden group shadow-2xl shadow-[#1B4332]/20">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-3xl rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-700" />
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <Cpu className="w-4 h-4 text-[#D8F3DC] animate-pulse" />
                        <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">Platform Status</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 relative z-10 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${health?.systemHealth || 0}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="bg-gradient-to-r from-[#D8F3DC] to-[#95D5B2] h-full rounded-full shadow-[0_0_10px_rgba(216,243,220,0.5)]"
                        />
                    </div>
                    <div className="flex justify-between items-center mt-4 relative z-10">
                        <span className="text-[10px] text-[#D8F3DC] font-black uppercase tracking-tight">{health?.systemHealth || 0}% HEALTH</span>
                        <div className="flex items-center gap-2 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest">LIVE</span>
                        </div>
                    </div>
                </div>

                {/* Super User Action Area */}
                <div className="p-6 border-t border-[#F8F9FA] bg-[#FDFBF7]">
                    <div className="flex items-center gap-4 mb-6 px-2">
                        <div className="w-12 h-12 rounded-[20px] bg-white border border-[#E9ECEF] flex items-center justify-center shadow-sm group hover:border-[#1B4332] transition-colors">
                            <Fingerprint className="w-6 h-6 text-[#1B4332]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-[#1B4332] truncate">{user?.name || 'System Owner'}</p>
                            <p className="text-[10px] font-black text-[#E07A5F] uppercase tracking-[0.2em] mt-0.5">Control Access: Full</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-[20px] text-[10px] text-[#E07A5F] font-black bg-[#FFF1E6] hover:bg-[#E07A5F] hover:text-white border border-[#E07A5F]/10 transition-all duration-500 uppercase tracking-[0.3em] shadow-sm hover:shadow-lg hover:shadow-[#E07A5F]/20 active:scale-95"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-20 z-50 bg-white/90 backdrop-blur-2xl border-b border-[#E9ECEF] flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                        <img src="/icon.svg" alt="L" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-black text-[#1B4332] tracking-tighter text-lg uppercase italic">TrackX Master</span>
                </div>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-3 bg-white border border-[#E9ECEF] rounded-2xl text-[#1B4332] shadow-sm active:scale-90 transition-transform"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </header>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="fixed inset-0 bg-[#1B4332]/40 backdrop-blur-md z-[60] lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white z-[70] lg:hidden flex flex-col border-r border-[#E9ECEF]"
                        >
                            <div className="h-24 flex items-center px-8 border-b border-[#F8F9FA] justify-between bg-[#FDFBF7]">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 flex items-center justify-center overflow-hidden">
                                        <img src="/icon.svg" alt="TrackX" className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-[#1B4332] tracking-tighter text-xl italic uppercase">TrackX Root</span>
                                </div>
                                <button onClick={() => setMobileOpen(false)} className="p-3 text-[#74796D] hover:bg-gray-100 rounded-2xl transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <nav className="flex-1 p-8 space-y-3 overflow-y-auto">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center gap-5 p-5 rounded-[24px] font-black text-sm uppercase transition-all ${isActive
                                                ? 'bg-[#1B4332] text-white shadow-2xl shadow-[#1B4332]/20'
                                                : 'text-[#74796D] hover:bg-[#F8F9FA]'
                                                }`}
                                        >
                                            <item.icon className="w-6 h-6" />
                                            <span className="tracking-tight">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="p-8 border-t border-[#F8F9FA] bg-[#FDFBF7]">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center justify-center gap-4 p-5 bg-[#FFF1E6] text-[#E07A5F] rounded-[24px] font-black uppercase tracking-[0.3em] text-xs shadow-sm"
                                >
                                    <LogOut className="w-5 h-5" /> Sign Out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 lg:pl-72 relative transition-all duration-500 w-full overflow-x-hidden border-box">
                {/* Desktop Top Header (Floating Style) */}
                <header className="hidden lg:flex h-28 items-center relative z-[60] pointer-events-none sticky top-0">
                    <div className="max-w-[1600px] mx-auto w-full px-12 flex justify-between items-center">
                        <div className="pointer-events-auto flex items-center gap-4">
                            <div className="px-6 py-3.5 bg-white border border-[#E9ECEF] rounded-[24px] shadow-sm hover:shadow-md transition-all flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-[#95A3A4] uppercase tracking-[0.3em]">Operational Area:</span>
                                <span className="text-[10px] font-black text-[#1B4332] uppercase tracking-[0.3em]">{health?.operationalArea || 'Global HQ'}</span>
                            </div>
                            <div className="w-px h-8 bg-[#E9ECEF]" />
                            <div className="px-6 py-3.5 bg-white border border-[#E9ECEF] rounded-[24px] shadow-sm hover:shadow-md transition-all flex items-center gap-3">
                                <Activity className="w-4 h-4 text-[#2D6A4F]" />
                                <span className="text-[10px] font-black text-[#95A3A4] uppercase tracking-[0.3em]">Module:</span>
                                <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-[0.3em]">
                                    {location.pathname.split('/').pop()?.replace('-', ' ') || 'Overview'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 pointer-events-auto">
                            <div className="bg-white/90 backdrop-blur-2xl border border-[#E9ECEF] rounded-[24px] px-8 py-3.5 shadow-sm hover:shadow-xl hover:shadow-[#1B4332]/5 transition-all flex items-center gap-4 group">
                                <div className="relative">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-50 animate-ping" />
                                </div>
                                <span className="text-[10px] font-black text-[#1B4332] uppercase tracking-[0.2em]">Secure Connection Active</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Mobile Top Spacer */}
                <div className="lg:hidden h-20" />

                <div className="p-8 lg:p-12 lg:pt-0 relative max-w-[1600px] mx-auto min-h-[calc(100vh-112px)] w-full">
                    <Outlet />
                </div>

                {/* Decorative Elements */}
                <div className="fixed bottom-10 right-10 pointer-events-none opacity-5 transition-opacity duration-1000 group-hover:opacity-20">
                    <ShieldCheck className="w-64 h-64 text-[#1B4332]" />
                </div>
            </main>
        </div>
    );
}

export default MasterLayout;
