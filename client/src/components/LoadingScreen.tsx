/**
 * Loading Screen - Human-Centered Design
 */

import React from 'react';
import { Bus } from 'lucide-react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-[#1B4332] rounded-2xl flex items-center justify-center shadow-lg overflow-hidden animate-pulse">
                    <img src="/icon.svg" alt="Loading..." className="w-full h-full object-contain" />
                </div>
                <div className="w-8 h-8 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[#52796F] text-sm font-medium">Loading TrackX...</p>
            </div>
        </div>
    );
};

export default LoadingScreen;
