// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// User Types
export interface User {
    id: string;
    email: string;
    name: string;
    type: 'ADMIN' | 'DRIVER';
}

export interface Driver {
    id: string;
    email: string;
    name: string;
    phone?: string;
    photoUrl?: string;
    isActive: boolean;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
    busId?: string;
    bus?: Bus;
}

// Bus Types
export interface Bus {
    id: string;
    busNumber: string;
    busName: string;
    gpsDeviceId?: string;
    apiKey?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    driver?: {
        id: string;
        name: string;
        phone?: string;
    };
    stops?: BusStop[];
}

export interface BusStop {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    order: number;
    busId: string;
}

// Location Types
export interface BusLocation {
    busNumber: string;
    busName: string;
    lat: number | null;
    lon: number | null;
    speed: number;
    heading?: number;
    accuracy?: number;
    driver?: string;
    driverPhone?: string;
    isOnline: boolean;
    updatedAt: string;
    stops?: BusStop[];
}

export interface GpsLog {
    id: string;
    latitude: number;
    longitude: number;
    speed?: number;
    accuracy?: number;
    timestamp: string;
    bus?: {
        busNumber: string;
        busName: string;
    };
}

// Dashboard Types
export interface DashboardStats {
    totalBuses: number;
    totalDrivers: number;
    onlineBuses: number;
    offlineBuses: number;
}

export interface DashboardBus {
    id: string;
    busNumber: string;
    busName: string;
    isOnline: boolean;
    lat?: number;
    lon?: number;
    speed?: number;
    driver?: string;
    lastUpdate?: string;
}

// Auth Types
export interface LoginResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

// Form Types
export interface BusFormData {
    busNumber: string;
    busName: string;
    gpsDeviceId?: string;
    driverId?: string;
}

export interface DriverFormData {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    busId?: string;
}

export interface StopFormData {
    name: string;
    latitude: number | string;
    longitude: number | string;
    order: number;
}

// GPS Status Type
export type GpsStatus = 'idle' | 'acquiring' | 'active' | 'weak' | 'error';
