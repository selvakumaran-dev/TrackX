/**
 * Authentication Context - Completely Separate Admin/Driver Sessions
 * 
 * Admin and Driver have completely independent:
 * - localStorage tokens
 * - Login/logout flows
 * - No cross-panel interference
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import api from '../services/api';
import type { User } from '../types';

// Auth context types
interface AuthUser extends User {
    type: 'ADMIN' | 'DRIVER';
}

interface LoginResult {
    success: boolean;
    error?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isDriver: boolean;
    login: (email: string, password: string, userType?: 'ADMIN' | 'DRIVER') => Promise<LoginResult>;
    logout: () => Promise<void>;
    refreshAccessToken: () => Promise<string>;
    setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Storage key prefixes - completely separate for admin and driver
const ADMIN_TOKEN_KEY = 'trackx_admin_token';
const ADMIN_REFRESH_KEY = 'trackx_admin_refresh';
const DRIVER_TOKEN_KEY = 'trackx_driver_token';
const DRIVER_REFRESH_KEY = 'trackx_driver_refresh';

// Get the current context (admin or driver) based on URL
const getContextFromPath = (pathname: string): 'ADMIN' | 'DRIVER' | null => {
    if (pathname.startsWith('/admin')) return 'ADMIN';
    if (pathname.startsWith('/driver')) return 'DRIVER';
    return null;
};

// Get storage keys for a user type
const getStorageKeys = (userType: 'ADMIN' | 'DRIVER') => {
    if (userType === 'ADMIN') {
        return { token: ADMIN_TOKEN_KEY, refresh: ADMIN_REFRESH_KEY };
    }
    return { token: DRIVER_TOKEN_KEY, refresh: DRIVER_REFRESH_KEY };
};

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    // Initialize auth based on current path context
    useEffect(() => {
        const initAuth = async () => {
            const contextType = getContextFromPath(location.pathname);

            // If not on admin/driver routes, no auth needed
            if (!contextType) {
                setLoading(false);
                setUser(null);
                return;
            }

            const keys = getStorageKeys(contextType);
            const token = localStorage.getItem(keys.token);

            if (!token) {
                setLoading(false);
                setUser(null);
                return;
            }

            // Set token for API calls
            localStorage.setItem('accessToken', token);

            try {
                const response = await api.get('/auth/me');
                const userData = response.data.data;

                // Verify user type matches context
                if (userData.type === contextType) {
                    setUser({ ...userData, type: contextType });
                } else {
                    // Mismatch - clear this context's tokens
                    localStorage.removeItem(keys.token);
                    localStorage.removeItem(keys.refresh);
                    localStorage.removeItem('accessToken');
                    setUser(null);
                }
            } catch (error: unknown) {
                // Token invalid
                localStorage.removeItem(keys.token);
                localStorage.removeItem(keys.refresh);
                localStorage.removeItem('accessToken');
                setUser(null);
            }

            setLoading(false);
        };

        setLoading(true);
        initAuth();
    }, [location.pathname]);

    // Login function
    const login = useCallback(async (
        email: string,
        password: string,
        userType: 'ADMIN' | 'DRIVER' = 'ADMIN'
    ): Promise<LoginResult> => {
        try {
            const response = await api.post('/auth/login', {
                email,
                password,
                userType,
            });

            const { user: userData, accessToken, refreshToken } = response.data.data;

            // Store with context-specific keys
            const keys = getStorageKeys(userType);
            localStorage.setItem(keys.token, accessToken);
            localStorage.setItem(keys.refresh, refreshToken);

            // Also set general token for API
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            setUser({ ...userData, type: userType });

            // Navigate to appropriate dashboard
            if (userType === 'ADMIN') {
                navigate('/admin/dashboard');
            } else {
                navigate('/driver/home');
            }

            return { success: true };
        } catch (error) {
            const axiosError = error as AxiosError<{ error: string }>;
            const message = axiosError.response?.data?.error || 'Login failed';
            return { success: false, error: message };
        }
    }, [navigate]);

    // Logout function
    const logout = useCallback(async () => {
        const userType = user?.type || getContextFromPath(location.pathname) || 'ADMIN';
        const keys = getStorageKeys(userType);

        try {
            const refreshToken = localStorage.getItem(keys.refresh);
            if (refreshToken) {
                await api.post('/auth/logout', { refreshToken });
            }
        } catch (error) {
            // Ignore logout errors
        } finally {
            // Clear tokens for this context
            localStorage.removeItem(keys.token);
            localStorage.removeItem(keys.refresh);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);

            // Navigate to login for this context
            if (userType === 'DRIVER') {
                navigate('/driver/login');
            } else {
                navigate('/admin/login');
            }
        }
    }, [navigate, user, location.pathname]);

    // Refresh token function
    const refreshAccessToken = useCallback(async (): Promise<string> => {
        const userType = user?.type || getContextFromPath(location.pathname) || 'ADMIN';
        const keys = getStorageKeys(userType);

        try {
            const refreshToken = localStorage.getItem(keys.refresh);
            if (!refreshToken) {
                throw new Error('No refresh token');
            }

            const response = await api.post('/auth/refresh', { refreshToken });
            const { accessToken } = response.data.data;

            localStorage.setItem(keys.token, accessToken);
            localStorage.setItem('accessToken', accessToken);

            return accessToken;
        } catch (error) {
            await logout();
            throw error;
        }
    }, [logout, user, location.pathname]);

    const value: AuthContextType = {
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.type === 'ADMIN',
        isDriver: user?.type === 'DRIVER',
        login,
        logout,
        refreshAccessToken,
        setUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
