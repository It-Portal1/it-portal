'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

interface Settings {
    appName: string;
    subtitle: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    loginTitle: string;
    loginSubtitle: string;
    fontFamily: string;
}

interface SettingsContextType {
    settings: Settings;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
    appName: 'IT Portal',
    subtitle: 'Schul-IT Management',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    accentColor: '#60a5fa',
    loginTitle: 'Willkommen zurück',
    loginSubtitle: 'Bitte melde dich an, um fortzufahren',
    fontFamily: 'Inter',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    const applyTheme = (s: Settings) => {
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.style.setProperty('--primary-color', s.primaryColor);
            root.style.setProperty('--secondary-color', s.secondaryColor);
            root.style.setProperty('--accent-color', s.accentColor);
            root.style.setProperty('--font-family', s.fontFamily);
        }
    };

    const refreshSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            setSettings(data);
            applyTheme(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
            applyTheme(defaultSettings);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
