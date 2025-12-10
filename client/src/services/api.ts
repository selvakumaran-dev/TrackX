/**
 * API Service - Axios instance with interceptors
 * Handles separate admin/driver token storage
 */

import { config } from '../config/env';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Extend AxiosRequestConfig to include _retry
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

// Storage keys - must match AuthContext
const ADMIN_TOKEN_KEY = 'trackx_admin_token';
const ADMIN_REFRESH_KEY = 'trackx_admin_refresh';
const DRIVER_TOKEN_KEY = 'trackx_driver_token';
const DRIVER_REFRESH_KEY = 'trackx_driver_refresh';

/**
 * Get the correct token based on current path
 */
function getAccessToken(): string | null {
    const path = window.location.pathname;

    if (path.startsWith('/admin')) {
        return localStorage.getItem(ADMIN_TOKEN_KEY);
    } else if (path.startsWith('/driver')) {
        return localStorage.getItem(DRIVER_TOKEN_KEY);
    }

    // Fallback: try both (for public pages that might need auth)
    return localStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(DRIVER_TOKEN_KEY);
}

/**
 * Get the correct refresh token based on current path
 */
function getRefreshToken(): string | null {
    const path = window.location.pathname;

    if (path.startsWith('/admin')) {
        return localStorage.getItem(ADMIN_REFRESH_KEY);
    } else if (path.startsWith('/driver')) {
        return localStorage.getItem(DRIVER_REFRESH_KEY);
    }

    return localStorage.getItem(ADMIN_REFRESH_KEY) || localStorage.getItem(DRIVER_REFRESH_KEY);
}

/**
 * Save new access token to the correct storage
 */
function saveAccessToken(token: string): void {
    const path = window.location.pathname;

    if (path.startsWith('/admin')) {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else if (path.startsWith('/driver')) {
        localStorage.setItem(DRIVER_TOKEN_KEY, token);
    }
}

/**
 * Clear tokens and redirect to appropriate login
 */
function clearTokensAndRedirect(): void {
    const path = window.location.pathname;

    if (path.startsWith('/admin')) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_REFRESH_KEY);
        window.location.href = '/admin/login';
    } else if (path.startsWith('/driver')) {
        localStorage.removeItem(DRIVER_TOKEN_KEY);
        localStorage.removeItem(DRIVER_REFRESH_KEY);
        window.location.href = '/driver/login';
    } else {
        window.location.href = '/';
    }
}

const api = axios.create({
    baseURL: `${config.apiUrl}/api`,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // If 401 and not a retry, try to refresh token
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                const response = await axios.post(`${config.apiUrl}/api/auth/refresh`, {
                    refreshToken,
                });

                const { accessToken } = response.data.data;
                saveAccessToken(accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                clearTokensAndRedirect();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
