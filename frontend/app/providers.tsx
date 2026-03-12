/**
 * Client Providers – Auth & Theme Context
 */
'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SettingsProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </SettingsProvider>
    );
}
