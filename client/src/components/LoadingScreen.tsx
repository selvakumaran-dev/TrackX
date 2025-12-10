/**
 * Loading Screen - TypeScript
 */

import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center">
            <div className="text-center">
                <div className="spinner w-8 h-8 border-4 mx-auto mb-4" />
                <p className="text-dark-400 text-sm">Loading...</p>
            </div>
        </div>
    );
};

export default LoadingScreen;
