/**
 * Admin Übersichtsseite
 */
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Users, Wrench, Shield, Activity } from 'lucide-react';

export default function AdminPage() {
    const [stats, setStats] = useState({ users: 0, tools: 0, roles: 0 });

    useEffect(() => {
        Promise.all([
            api.get('/users'),
            api.get('/tools'),
            api.get('/roles'),
        ]).then(([u, t, r]) => {
            setStats({ users: u.data.length, tools: t.data.length, roles: r.data.length });
        }).catch(() => { });
    }, []);

    const cards = [
        { label: 'Benutzer', value: stats.users, icon: <Users size={24} />, color: '#6366f1' },
        { label: 'Tools', value: stats.tools, icon: <Wrench size={24} />, color: '#8b5cf6' },
        { label: 'Rollen', value: stats.roles, icon: <Shield size={24} />, color: '#10b981' },
    ];

    return (
        <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={22} /> Admin-Panel
            </h1>
            <p className="page-subtitle">Systemübersicht und Verwaltung</p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 16,
                marginBottom: 32,
            }}>
                {cards.map(card => (
                    <div key={card.label} className="card" style={{ padding: 24 }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: `${card.color}22`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: card.color,
                            marginBottom: 16,
                        }}>
                            {card.icon}
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800 }}>{card.value}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{card.label}</div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Schnell-Links</h2>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                        { href: '/admin/users', label: '+ Benutzer erstellen' },
                        { href: '/admin/roles', label: '+ Rolle erstellen' },
                        { href: '/admin/tools', label: '+ Tool erstellen' },
                    ].map(l => (
                        <a key={l.href} href={l.href} className="btn btn-secondary btn-sm">{l.label}</a>
                    ))}
                </div>
            </div>
        </div>
    );
}
