/**
 * Dashboard – Hauptseite des IT Portals
 * Zeigt alle sichtbaren Tools als Kacheln-Grid an
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import ToolCard from '@/components/ToolCard';
import api from '@/lib/api';
import { Tool } from '@/types';
import { LayoutGrid, Loader2, Search, ShieldAlert, X } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessError, setAccessError] = useState('');

  // Kein Auth-Guard mehr: Dashboard für alle öffentlich sichtbar

  const fetchTools = useCallback(async () => {
    try {
      const { data } = await api.get('/tools');
      setTools(data);
    } catch {
      // Fehler still behandeln
    } finally {
      setToolsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const handleToolClick = (tool: Tool) => {
    if (tool.isRestricted) {
      if (user) {
        // Logged-in user without access -> Show message
        setAccessError('Du hast keine Berechtigung, dieses Tool zu öffnen. Bitte wende dich an einen Administrator.');
      } else {
        // Guest user -> Redirect to login
        const returnUrl = tool.type === 'HTML_FILE' ? `/tools/${tool.slug}` : '';
        const loginUrl = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login';
        router.push(loginUrl);
      }
      return;
    }

    if (tool.type === 'EXTERNAL_LINK' && tool.url) {
      window.open(tool.url, '_blank', 'noopener,noreferrer');
    } else if (tool.type === 'HTML_FILE') {
      router.push(`/tools/${tool.slug}`);
    }
  };

  // Gefilterte Tools basierend auf Suchbegriff
  const filteredTools = tools.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Header />

      <main className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LayoutGrid size={24} />
              {user ? 'Meine Tools' : 'Verfügbare Tools'}
            </h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              {filteredTools.length} Tool{filteredTools.length !== 1 ? 's' : ''} {user ? 'verfügbar' : 'entdeckbar'}
            </p>
          </div>

          {/* Suchfeld */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={16} style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }} />
            <input
              type="text"
              className="input"
              placeholder="Tools durchsuchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>

        {/* Tool Grid */}
        {toolsLoading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            gap: 12,
            color: 'var(--text-muted)',
          }}>
            <Loader2 size={20} style={{ animation: 'spin 0.6s linear infinite' }} />
            Tools werden geladen...
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <LayoutGrid size={48} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {searchQuery ? 'Keine Tools gefunden' : 'Keine Tools verfügbar'}
            </h3>
            <p style={{ fontSize: 14 }}>
              {searchQuery
                ? `Kein Tool entspricht "${searchQuery}"`
                : 'Es wurden noch keine Tools für dich freigeschaltet.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}>
            {filteredTools.map(tool => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onClick={() => handleToolClick(tool)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Access Denied Modal */}
      {accessError && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setAccessError(''); }}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center', position: 'relative' }}>
            <button
              onClick={() => setAccessError('')}
              className="btn-icon"
              style={{ position: 'absolute', top: 16, right: 16 }}
            >
              <X size={20} />
            </button>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: 'var(--danger)'
            }}>
              <ShieldAlert size={32} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Zugriff verweigert</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              {accessError}
            </p>
            <button onClick={() => setAccessError('')} className="btn btn-primary" style={{ width: '100%', justifySelf: 'center', justifyContent: 'center' }}>
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
