/**
 * Main App Component - Separate Panels
 * - Public: Landing, Track Bus (no auth)
 * - Admin Panel: Completely separate (admin auth)
 * - Driver Panel: Completely separate (driver auth)
 */

import React, { Suspense, lazy, ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout components
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import DriverLayout from './layouts/DriverLayout';

// Loading component
import LoadingScreen from './components/LoadingScreen';

// Lazy load pages for code splitting
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminBuses = lazy(() => import('./pages/admin/AdminBuses'));
const AdminDrivers = lazy(() => import('./pages/admin/AdminDrivers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const DriverLogin = lazy(() => import('./pages/driver/DriverLogin'));
const DriverHome = lazy(() => import('./pages/driver/DriverHome'));
const DriverProfile = lazy(() => import('./pages/driver/DriverProfile'));
const DriverHistory = lazy(() => import('./pages/driver/DriverHistory'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Types
type UserRole = 'ADMIN' | 'DRIVER';

interface ProtectedRouteProps {
    children: ReactNode;
    role: UserRole;
    loginPath: string;
}

// Admin protected route - ONLY checks for admin token
function AdminProtectedRoute({ children }: { children: ReactNode }): JSX.Element {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <LoadingScreen />;
    }

    // Check if admin is logged in
    if (!user || user.type !== 'ADMIN') {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

// Driver protected route - ONLY checks for driver token
function DriverProtectedRoute({ children }: { children: ReactNode }): JSX.Element {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <LoadingScreen />;
    }

    // Check if driver is logged in
    if (!user || user.type !== 'DRIVER') {
        return <Navigate to="/driver/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

// Admin login route - redirects to dashboard if admin already logged in
function AdminLoginRoute({ children }: { children: ReactNode }): JSX.Element {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    // If admin is already logged in, redirect to dashboard
    if (user?.type === 'ADMIN') {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
}

// Driver login route - redirects to home if driver already logged in
function DriverLoginRoute({ children }: { children: ReactNode }): JSX.Element {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    // If driver is already logged in, redirect to home
    if (user?.type === 'DRIVER') {
        return <Navigate to="/driver/home" replace />;
    }

    return <>{children}</>;
}

function App(): JSX.Element {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <Routes>
                {/* ============================================ */}
                {/* PUBLIC PAGES - No auth required */}
                {/* ============================================ */}
                <Route path="/" element={<PublicLayout />}>
                    <Route index element={<LandingPage />} />
                    <Route path="track" element={<TrackingPage />} />
                </Route>

                {/* ============================================ */}
                {/* ADMIN PANEL - Completely Separate */}
                {/* ============================================ */}
                <Route
                    path="/admin/login"
                    element={
                        <AdminLoginRoute>
                            <AdminLogin />
                        </AdminLoginRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <AdminProtectedRoute>
                            <AdminLayout />
                        </AdminProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="buses" element={<AdminBuses />} />
                    <Route path="drivers" element={<AdminDrivers />} />
                    <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* ============================================ */}
                {/* DRIVER PANEL - Completely Separate */}
                {/* ============================================ */}
                <Route
                    path="/driver/login"
                    element={
                        <DriverLoginRoute>
                            <DriverLogin />
                        </DriverLoginRoute>
                    }
                />
                <Route
                    path="/driver"
                    element={
                        <DriverProtectedRoute>
                            <DriverLayout />
                        </DriverProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="home" replace />} />
                    <Route path="home" element={<DriverHome />} />
                    <Route path="history" element={<DriverHistory />} />
                    <Route path="profile" element={<DriverProfile />} />
                </Route>

                {/* 404 - Redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

export default App;
