/**
 * Gehostete HTML-Tool Seite
 * Zeigt eine hochgeladene HTML-Datei in einem Iframe an (sicher sandboxed)
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ToolViewerPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams<{ slug: string }>();
    const [tool, setTool] = useState<{ name: string; filePath?: string; slug: string } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!params.slug) return;

        // Fetch only this specific tool
        api.get(`/tools/${params.slug}`)
            .then(({ data }) => {
                if (data.isRestricted) {
                    if (user) {
                        setError('Du hast keine Berechtigung, dieses Tool zu öffnen. Bitte wende dich an einen Administrator.');
                    } else {
                        router.replace(`/login?returnUrl=${encodeURIComponent(`/tools/${params.slug}`)}`);
                    }
                    return;
                }
                if (data.type !== 'HTML_FILE') {
                    setError('Dieses Tool ist kein HTML-Tool');
                } else {
                    setTool(data);
                }
            })
            .catch(() => setError('Tool nicht gefunden oder Zugriff verweigert'));
    }, [params.slug, router, user]);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: 'var(--bg-primary)',
        }}>
            {/* Mini-Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 20px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                height: 52,
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link href="/" className="btn-icon">
                        <ArrowLeft size={18} />
                    </Link>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                        {tool?.name || params.slug}
                    </span>
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>Gehostet</span>
                </div>
                {tool && (
                    <a
                        href={`${API_URL}/hosted/${tool.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                    >
                        <ExternalLink size={14} /> Im Tab öffnen
                    </a>
                )}
            </div>

            {/* Content */}
            {error ? (
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', color: 'var(--text-muted)', gap: 12,
                }}>
                    <div style={{ fontSize: 40 }}>⚠️</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{error}</div>
                    <Link href="/" className="btn btn-secondary btn-sm">Zurück zum Dashboard</Link>
                </div>
            ) : !tool ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={28} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--text-muted)' }} />
                </div>
            ) : (
                // Sandbox iframe verhindert script-Ausbrüche
                <iframe
                    src={`${API_URL}/hosted/${tool.slug}`}
                    style={{ flex: 1, border: 'none', width: '100%' }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    title={tool.name}
                    loading="lazy"
                />
            )}
        </div>
    );
}
