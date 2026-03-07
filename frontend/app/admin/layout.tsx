/**
 * Admin Panel Layout
 * Sidebar-Navigation für alle Admin-Bereiche
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Users, Shield, Wrench, LayoutDashboard } from 'lucide-react';

const navItems = [
    { href: '/admin', label: 'Übersicht', icon: <LayoutDashboard size={18} />, exact: true },
    { href: '/admin/users', label: 'Benutzer', icon: <Users size={18} /> },
    { href: '/admin/roles', label: 'Rollen', icon: <Shield size={18} /> },
    { href: '/admin/tools', label: 'Tools', icon: <Wrench size={18} /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
        if (!loading && user && !user.isAdmin) router.replace('/');
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (!user?.isAdmin) return null;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <Header />
            <div className="container" style={{
                display: 'flex',
                gap: 32,
                paddingTop: 32,
                paddingBottom: 60,
                alignItems: 'flex-start',
            }}>
                {/* Sidebar */}
                <aside style={{
                    width: 220,
                    flexShrink: 0,
                    position: 'sticky',
                    top: 88,
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 8,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: '10px 12px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginBottom: 4,
                        }}>
                            Administration
                        </div>
                        {navItems.map(item => {
                            const isActive = item.exact
                                ? pathname === item.href
                                : pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        textDecoration: 'none',
                                        fontSize: 14,
                                        fontWeight: isActive ? 600 : 400,
                                        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                                        transition: 'all var(--transition)',
                                        marginBottom: 2,
                                    }}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
