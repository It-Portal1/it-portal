/**
 * Login-Seite
 * Formular mit Validierung, Rate-Limit-Feedback und Dark/Light Mode
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';

function LoginForm() {
    const { login, user, loading } = useAuth();
    const { settings } = useSettings();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Redirect wenn bereits eingeloggt
    useEffect(() => {
        if (!loading && user) router.replace(returnUrl || '/');
    }, [user, loading, router, returnUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Bitte fülle alle Felder aus.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await login(username, password);
            router.replace(returnUrl || '/');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(msg || 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
        } finally {
            setIsLoading(false);
        }
    };

    if (loading) {
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
            {/* Dekorative Hintergrund-Kreise */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                left: '-10%',
                width: 600,
                height: 600,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-20%',
                right: '-10%',
                width: 500,
                height: 500,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Login Card */}
            <div className="card" style={{
                width: '100%',
                maxWidth: 420,
                padding: '40px',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Logo / Brand */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        marginBottom: 20,
                        boxShadow: 'var(--shadow-accent)',
                    }}>
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                        ) : (
                            <Shield size={32} color="white" />
                        )}
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
                        {settings.loginTitle || settings.appName}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        {settings.loginSubtitle || 'Melde dich mit deinen Zugangsdaten an'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--danger)',
                        fontSize: 14,
                        marginBottom: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="label" htmlFor="username">Benutzername oder E-Mail</label>
                        <input
                            id="username"
                            type="text"
                            className="input"
                            placeholder="z.B. admin"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoComplete="username"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="password">Passwort</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="current-password"
                                style={{ paddingRight: 48 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 4,
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading}
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />
                                Anmelden...
                            </>
                        ) : 'Anmelden'}
                    </button>
                </form>

                <p style={{
                    textAlign: 'center',
                    marginTop: 24,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                }}>
                    Bei Problemen wende dich an dein IT-Team
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="loading-screen">
                <div className="spinner" style={{ width: 36, height: 36 }} />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
