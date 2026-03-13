/**
 * Client Providers – Auth & Theme Context
 */
'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import AutoLogout from '@/components/AutoLogout';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SettingsProvider>
            <AuthProvider>
                <AutoLogout />
                {children}
            </AuthProvider>
        </SettingsProvider>
    );
}
