/**
 * Driver Layout - Ultra Mobile-First with Bottom Navigation
 */

import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Clock, User } from 'lucide-react';

const DriverLayout: React.FC = () => {
    const location = useLocation();

    const navItems = [
        { path: '/driver/home', icon: Home, label: 'Track' },
        { path: '/driver/history', icon: Clock, label: 'History' },
        { path: '/driver/profile', icon: User, label: 'Profile' },
    ];

    return (
        <div className="min-h-[100dvh] bg-slate-900 relative">
            {/* Main Content */}
            <main className="pb-20">
                <Outlet />
            </main>

            {/* Bottom Navigation - Mobile Optimized */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 safe-nav">
                <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-2">
                    <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className="relative flex flex-col items-center justify-center w-20 h-full"
                                >
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className={`flex flex-col items-center justify-center w-full py-1 rounded-2xl transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500'
                                            }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-x-2 top-1 bottom-1 bg-indigo-500/10 rounded-2xl"
                                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                            />
                                        )}
                                        <item.icon className={`w-6 h-6 relative z-10 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                                        <span className={`text-xs mt-1 relative z-10 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                                            {item.label}
                                        </span>
                                    </motion.div>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

                {/* Safe area fill for iOS */}
                <div className="bg-slate-900/95 h-safe-b" />
            </nav>

            <style>{`
        .safe-nav { padding-bottom: env(safe-area-inset-bottom); }
        .h-safe-b { height: env(safe-area-inset-bottom); }
      `}</style>
        </div>
    );
};

export default DriverLayout;
