/**
 * Passwort ändern Seite (Erzwungen nach erstem Login)
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Shield, Loader2, KeyRound } from 'lucide-react';

function ChangePasswordForm() {
    const { user, loading, refreshUser } = useAuth();
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Redirect wenn der User nicht eingeloggt ist
    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login');
            }
        }
    }, [user, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Bitte fülle alle Felder aus.');
            return;
        }

        if (newPassword.length < 8) {
            setError('Das neue Passwort muss mindestens 8 Zeichen haben.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Die neuen Passwörter stimmen nicht überein.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });

            // User-State aktualisieren (requirePasswordChange ist jetzt false)
            await refreshUser();

            // Erfolgreich geändert -> ab zum Dashboard
            router.replace('/');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(msg || 'Passwort konnte nicht geändert werden.');
        } finally {
            setIsLoading(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="loading-screen">
                <div className="spinner" style={{ width: 36, height: 36 }} />
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'var(--bg-primary)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background */}
            <div style={{
                position: 'absolute',
                top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div className="card" style={{
                width: '100%',
                maxWidth: 420,
                padding: '40px',
                position: 'relative',
                zIndex: 1,
                borderTop: user.requirePasswordChange ? '4px solid var(--danger)' : '4px solid var(--accent-primary)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 64, height: 64, borderRadius: 16,
                        background: user.requirePasswordChange
                            ? 'linear-gradient(135deg, var(--danger), #b91c1c)'
                            : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        marginBottom: 20, boxShadow: user.requirePasswordChange
                            ? '0 8px 16px rgba(239, 68, 68, 0.2)'
                            : 'var(--shadow-accent)',
                    }}>
                        <KeyRound size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
                        Passwort ändern
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        {user.requirePasswordChange
                            ? 'Ein Administrator hat festgelegt, dass du bei der ersten Anmeldung dein Passwort ändern musst.'
                            : 'Wähle ein neues, sicheres Passwort für deinen Account.'}
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--danger)', fontSize: 14, marginBottom: 20,
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="label" htmlFor="currentPassword">Aktuelles Passwort</label>
                        <input
                            id="currentPassword"
                            type="password"
                            className="input"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="newPassword">Neues Passwort (min. 8 Zeichen)</label>
                        <input
                            id="newPassword"
                            type="password"
                            className="input"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="confirmPassword">Neues Passwort bestätigen</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            className="input"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading}
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 12 }}
                    >
                        {isLoading ? (
                            <><Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} /> Speichern...</>
                        ) : 'Passwort aktualisieren'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={async () => {
                            if (user.requirePasswordChange) {
                                await api.post('/auth/logout');
                                sessionStorage.removeItem('accessToken');
                                window.location.href = '/login';
                            } else {
                                router.push('/');
                            }
                        }}
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 12 }}
                    >
                        {user.requirePasswordChange ? 'Abbrechen & Abmelden' : 'Abbrechen'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ChangePasswordPage() {
    return (
        <Suspense fallback={
            <div className="loading-screen">
                <div className="spinner" style={{ width: 36, height: 36 }} />
            </div>
        }>
            <ChangePasswordForm />
        </Suspense>
    );
}
