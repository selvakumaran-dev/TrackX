/**
 * Admin Layout - Human-Centered Design
 * Warm, calming color palette
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, LayoutDashboard, Users, LogOut, Menu, X, User, Settings, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/buses', label: 'Buses', icon: Bus },
    { path: '/admin/drivers', label: 'Drivers', icon: Users },
    { path: '/admin/organization', label: 'Organization', icon: Building2 },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
];

function AdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen flex bg-[#FDFBF7]">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-60 fixed left-0 top-0 h-full bg-white border-r border-[#E9ECEF] z-40">
                {/* Logo */}
                <div className="h-20 flex items-center px-6 border-b border-[#E9ECEF]">
                    <Link to="/admin/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                            <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xl font-black text-[#1B4332] tracking-tighter">TrackX</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                    ? 'bg-[#1B4332] text-white shadow-lg shadow-[#1B4332]/20'
                                    : 'text-[#74796D] hover:text-[#1B4332] hover:bg-[#F8F9FA]'
                                    }`}>
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-[#D8F3DC]' : ''}`} />
                                <span className="uppercase tracking-tight text-[11px]">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Context */}
                <div className="p-4 border-t border-[#F8F9FA]">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-[#D8F3DC] flex items-center justify-center border border-[#2D6A4F]/10">
                            <User className="w-5 h-5 text-[#2D6A4F]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-[#1B4332] truncate">{user?.name || 'Admin'}</p>
                            <p className="text-[10px] font-bold text-[#E07A5F] uppercase tracking-widest">{user?.role?.replace('_', ' ') || 'Authority'}</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] text-[#E07A5F] font-black uppercase tracking-[0.2em] bg-[#FFF1E6] hover:bg-[#E07A5F] hover:text-white transition-all shadow-sm">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 z-50 bg-white/90 backdrop-blur-xl border-b border-[#E9ECEF] flex items-center justify-between px-6 shadow-sm">
                <Link to="/admin/dashboard" className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                        <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-black text-[#1B4332] tracking-tighter">TrackX</span>
                </Link>
                <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-[#74796D] rounded-xl hover:bg-[#F8F9FA]">
                    {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div className="lg:hidden fixed inset-0 z-[60] bg-[#1B4332]/40 backdrop-blur-sm"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)} />
                        <motion.aside className="lg:hidden fixed left-0 top-0 bottom-0 z-[70] w-80 bg-white border-r border-[#E9ECEF]"
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
                            <div className="h-20 flex items-center px-8 border-b border-[#F8F9FA]">
                                <Link to="/admin/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                                    <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                                        <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-black text-[#1B4332] tracking-tighter">TrackX</span>
                                </Link>
                            </div>
                            <nav className="p-6 space-y-2">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                                            className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-tight transition-all ${isActive
                                                ? 'bg-[#1B4332] text-white shadow-xl shadow-[#1B4332]/20'
                                                : 'text-[#74796D]'
                                                }`}>
                                            <item.icon className="w-5 h-5" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-[#F8F9FA] bg-[#FDFBF7]">
                                <button onClick={logout}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-[10px] text-[#E07A5F] font-black uppercase tracking-[0.2em] bg-[#FFF1E6] shadow-sm active:scale-95 transition-all">
                                    <LogOut className="w-5 h-5" /> Sign Out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-60 pt-16 lg:pt-0 min-h-screen">
                <div className="p-4 sm:p-6 lg:p-12 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>

        </div>
    );
}

export default AdminLayout;
