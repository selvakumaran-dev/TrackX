/**
 * Public Layout - Only Track Bus visible
 */

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Bus, MapPin } from 'lucide-react';

function PublicLayout() {
    const location = useLocation();
    const isTrackingPage = location.pathname === '/track';

    return (
        <div className="min-h-screen flex flex-col">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 h-full">
                    <div className="flex justify-between items-center h-full">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Bus className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-800">
                                Track<span className="text-indigo-600">X</span>
                            </span>
                        </Link>

                        {/* Track Bus Button */}
                        {!isTrackingPage && (
                            <Link
                                to="/track"
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/25 transition-all"
                            >
                                <MapPin className="w-4 h-4" />
                                Track Bus
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 pt-16">
                <Outlet />
            </main>

            {/* Footer - Only on Landing */}
            {!isTrackingPage && (
                <footer className="bg-gray-50 border-t border-gray-100 py-8">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <Bus className="w-4 h-4 text-indigo-500" />
                                <span>© 2026 TrackX. All rights reserved.</span>
                            </div>
                            <div className="flex gap-6">
                                <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
                                <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
                                <a href="#" className="hover:text-indigo-600 transition-colors">Contact</a>
                            </div>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}

export default PublicLayout;
