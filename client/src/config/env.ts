/**
 * ============================================
 * TrackX Client - Environment Configuration
 * ============================================
 * Type-safe environment variable access
 * with validation and defaults
 */

// Environment variables are injected at build time by Vite
// All must be prefixed with VITE_ to be exposed to the client

interface EnvConfig {
    // API Configuration
    apiUrl: string;
    socketUrl: string;

    // Map Configuration
    mapTileUrl: string;

    // Environment
    isDev: boolean;
    isProd: boolean;
    mode: string;
}

/**
 * Get environment configuration with validation
 */
function getConfig(): EnvConfig {
    const mode = import.meta.env.MODE;
    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD;

    // In development, API calls go through Vite proxy (empty base URL)
    // In production, use the configured API URL
    const apiUrl = isDev
        ? ''
        : (import.meta.env.VITE_API_URL || '');

    const socketUrl = isDev
        ? ''
        : (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '');

    const mapTileUrl = import.meta.env.VITE_MAP_TILE_URL
        || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    // Validate required production config
    if (isProd && !import.meta.env.VITE_API_URL) {
        console.warn('⚠️ VITE_API_URL not set in production. API calls may fail.');
    }

    return {
        apiUrl,
        socketUrl,
        mapTileUrl,
        isDev,
        isProd,
        mode,
    };
}

// Export singleton config
export const config = getConfig();

// Export individual values for convenience
export const { apiUrl, socketUrl, mapTileUrl, isDev, isProd } = config;

export default config;
