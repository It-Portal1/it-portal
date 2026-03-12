/**
 * Header Komponente
 * Logo links, Benutzermenü & Dark/Light Toggle rechts
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
    Shield, Sun, Moon, User, Settings, LogOut,
    ChevronDown, LayoutDashboard, KeyRound
} from 'lucide-react';

export default function Header() {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const router = useRouter();
    const [isDark, setIsDark] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Theme aus localStorage laden
    useEffect(() => {
        const saved = localStorage.getItem('theme') || 'dark';
        setIsDark(saved === 'dark');
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    // Click outside schließt Menü
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleTheme = () => {
        const next = isDark ? 'light' : 'dark';
        setIsDark(!isDark);
        localStorage.setItem('theme', next);
        document.documentElement.setAttribute('data-theme', next);
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            backdropFilter: 'blur(12px)',
        }}>
            <div className="container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 64,
            }}>
                {/* Logo */}
                <Link href="/" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-accent)',
                        flexShrink: 0,
                    }}>
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                        ) : (
                            <Shield size={20} color="white" />
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{settings.appName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {settings.subtitle || 'Schulverwaltung'}
                        </div>
                    </div>
                </Link>

                {/* Navigation (Desktop) */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Link href="/" className="btn-icon" style={{ color: 'var(--text-secondary)' }}>
                        <LayoutDashboard size={18} />
                    </Link>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="btn-icon"
                        title={isDark ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* User Menu or Login Button */}
                    {user ? (
                        <div ref={menuRef} style={{ position: 'relative', marginLeft: 8 }}>
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 12px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 99,
                                    cursor: 'pointer',
                                    color: 'var(--text-primary)',
                                    transition: 'all var(--transition)',
                                }}
                            >
                                <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: 'white',
                                    flexShrink: 0,
                                }}>
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user.username}
                                </span>
                                <ChevronDown size={14} style={{
                                    color: 'var(--text-muted)',
                                    transition: 'transform var(--transition)',
                                    transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                }} />
                            </button>

                            {/* Dropdown */}
                            {menuOpen && (
                                <div style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 8px)',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-lg)',
                                    minWidth: 200,
                                    overflow: 'hidden',
                                    animation: 'slideUp 150ms ease',
                                }}>
                                    {/* User Info */}
                                    <div style={{
                                        padding: '14px 16px',
                                        borderBottom: '1px solid var(--border-color)',
                                    }}>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{user.username}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
                                        {user.isAdmin && (
                                            <span className="badge badge-purple" style={{ marginTop: 6 }}>Admin</span>
                                        )}
                                    </div>

                                    <div style={{ padding: 6 }}>
                                        {user.isAdmin && (
                                            <Link
                                                href="/admin"
                                                onClick={() => setMenuOpen(false)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: '10px 12px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    color: 'var(--text-primary)',
                                                    textDecoration: 'none',
                                                    fontSize: 14,
                                                    transition: 'all var(--transition)',
                                                }}
                                                className="menu-item"
                                            >
                                                <Settings size={16} />
                                                Administration
                                            </Link>
                                        )}

                                        <Link
                                            href="/change-password"
                                            onClick={() => setMenuOpen(false)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '10px 12px',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--text-primary)',
                                                textDecoration: 'none',
                                                fontSize: 14,
                                                transition: 'all var(--transition)',
                                            }}
                                            className="menu-item"
                                        >
                                            <KeyRound size={16} />
                                            Passwort ändern
                                        </Link>

                                        <button
                                            onClick={handleLogout}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '10px 12px',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--danger)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: 14,
                                                width: '100%',
                                                transition: 'all var(--transition)',
                                            }}
                                        >
                                            <LogOut size={16} />
                                            Abmelden
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href="/login" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: 14, borderRadius: 99, marginLeft: 8 }}>
                            Anmelden
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
