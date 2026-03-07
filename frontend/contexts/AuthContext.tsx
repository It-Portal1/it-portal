/**
 * AuthContext – Globaler Authentifizierungszustand
 * Stellt den aktuellen Benutzer und Auth-Funktionen für die gesamte App bereit
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Permission } from '@/types';

export interface User {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
    requirePasswordChange?: boolean;
    role?: { id: string; name: string; permissions: Permission[] } | null;
    permissions: Permission[];
}

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    hasPermission: (permission: Permission) => boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
            if (data.requirePasswordChange && typeof window !== 'undefined') {
                if (window.location.pathname !== '/change-password') {
                    window.location.href = '/change-password';
                }
            }
        } catch {
            setUser(null);
        }
    }, []);

    // Beim Start: Versuchen den aktuellen User zu laden
    useEffect(() => {
        const token = sessionStorage.getItem('accessToken');
        if (token) {
            refreshUser().finally(() => setLoading(false));
        } else {
            // Versuchen per Refresh-Cookie (httpOnly) einen neuen Access-Token zu holen
            api.post('/auth/refresh')
                .then(({ data }) => {
                    sessionStorage.setItem('accessToken', data.accessToken);
                    return refreshUser();
                })
                .catch(() => { })
                .finally(() => setLoading(false));
        }
    }, [refreshUser]);

    const login = async (username: string, password: string) => {
        const { data } = await api.post('/auth/login', { username, password });
        sessionStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
        if (data.user.requirePasswordChange && typeof window !== 'undefined') {
            window.location.href = '/change-password';
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            sessionStorage.removeItem('accessToken');
            setUser(null);
        }
    };

    const hasPermission = (permission: Permission): boolean => {
        if (!user) return false;
        if (user.isAdmin) return true;
        return user.permissions.includes(permission);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
