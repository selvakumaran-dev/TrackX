/**
 * Admin Layout - Clean Sidebar
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, LayoutDashboard, Users, LogOut, Menu, X, User, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/buses', label: 'Buses', icon: Bus },
    { path: '/admin/drivers', label: 'Drivers', icon: Users },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
];

function AdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-60 fixed left-0 top-0 h-full bg-dark-800/80 backdrop-blur-xl border-r border-white/5">
                {/* Logo */}
                <div className="h-16 flex items-center px-5 border-b border-white/5">
                    <Link to="/admin/dashboard" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                            <Bus className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-white">TrackX</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                                    : 'text-dark-400 hover:text-white hover:bg-white/5'
                                    }`}>
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-dark-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
                            <p className="text-xs text-dark-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 z-50 bg-dark-900/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4">
                <Link to="/admin/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                        <Bus className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-white">TrackX</span>
                </Link>
                <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-dark-300">
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div className="lg:hidden fixed inset-0 z-40 bg-black/50"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)} />
                        <motion.aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-dark-800 border-r border-white/5"
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}>
                            <div className="h-14 flex items-center px-4 border-b border-white/5">
                                <span className="font-semibold text-white">TrackX</span>
                            </div>
                            <nav className="p-4 space-y-1">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${isActive ? 'bg-primary-500/15 text-primary-400' : 'text-dark-400 hover:text-white'
                                                }`}>
                                            <item.icon className="w-4 h-4" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
                                <button onClick={logout}
                                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10">
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
                <div className="p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default AdminLayout;
