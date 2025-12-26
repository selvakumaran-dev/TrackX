/**
 * Public Layout - Human-Centered Design
 */

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Bus, MapPin } from 'lucide-react';

function PublicLayout() {
    const location = useLocation();
    const isTrackingPage = location.pathname === '/track';

    return (
        <div className="min-h-screen flex flex-col bg-[#FDFBF7]">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/95 backdrop-blur-lg border-b border-[#E9ECEF] shadow-sm">
                <div className="max-w-6xl mx-auto px-4 h-full">
                    <div className="flex justify-between items-center h-full">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                                <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-xl font-black text-[#1B4332] tracking-tighter">
                                TrackX
                            </span>
                        </Link>

                        {/* Track Bus Button */}
                        {!isTrackingPage && (
                            <Link
                                to="/track"
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2D6A4F] to-[#40916C] hover:from-[#1B4332] hover:to-[#2D6A4F] text-white rounded-xl text-sm font-medium shadow-lg shadow-[#2D6A4F]/25 transition-all hover:-translate-y-0.5"
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

            {/* Footer - Only on Public Pages (not landing, landing has its own) */}
            {/* Note: Landing page usually hides this footer via isTrackingPage logic or just renders its own. 
                We keep the logic simple here for other public pages if any exist. */}
            {!isTrackingPage && location.pathname !== '/' && (
                <footer className="bg-white border-t border-[#E9ECEF] py-8">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#74796D]">
                            <div className="flex items-center gap-2">
                                <img src="/icon.svg" alt="TrackX" className="w-5 h-5 object-contain" />
                                <span>© {new Date().getFullYear()} TrackX. All rights reserved.</span>
                            </div>
                            <div className="flex gap-6">
                                <a href="#" className="hover:text-[#2D6A4F] transition-colors">Privacy</a>
                                <a href="#" className="hover:text-[#2D6A4F] transition-colors">Terms</a>
                                <a href="#" className="hover:text-[#2D6A4F] transition-colors">Contact</a>
                            </div>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}

export default PublicLayout;
