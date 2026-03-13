'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const AUTO_LOGOUT_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

export default function AutoLogout() {
    const { user, logout } = useAuth();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (user) {
            timeoutRef.current = setTimeout(() => {
                console.log('User inactive for 1 hour. Logging out...');
                logout();
            }, AUTO_LOGOUT_TIME);
        }
    }, [user, logout]);

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        if (user) {
            // Initial timer setup
            resetTimer();

            // Add event listeners for all activity events
            events.forEach(event => {
                window.addEventListener(event, resetTimer);
            });

            // Cleanup
            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                events.forEach(event => {
                    window.removeEventListener(event, resetTimer);
                });
            };
        }
    }, [user, resetTimer]);

    return null; // This component doesn't render anything
}
