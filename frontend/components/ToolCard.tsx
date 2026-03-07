/**
 * Tool-Kachel Komponente
 * Zeigt ein Tool als anklickbare Kachel an.
 * Gesperrte Tools werden ausgegraut mit Schloss-Icon dargestellt.
 */
'use client';

import { useMemo } from 'react';
import { Tool } from '@/types';
import {
    Lock, Globe, FileCode as FileHtml, ExternalLink,
    Monitor, Database, Network, Shield, Code, Wrench,
    Terminal, Server, Wifi, Key, Cpu,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
    Globe: <Globe size={28} />, Database: <Database size={28} />,
    Network: <Network size={28} />, Shield: <Shield size={28} />,
    Code: <Code size={28} />, Wrench: <Wrench size={28} />,
    Terminal: <Terminal size={28} />, Server: <Server size={28} />,
    Wifi: <Wifi size={28} />, Key: <Key size={28} />,
    Cpu: <Cpu size={28} />, Monitor: <Monitor size={28} />,
    FileHtml: <FileHtml size={28} />,
};

interface ToolCardProps {
    tool: Tool;
    onClick: () => void;
}

export default function ToolCard({ tool, onClick }: ToolCardProps) {
    const isInactive = !tool.isActive;
    const isLocked = tool.isRestricted || tool.isLocked;
    const isDisabled = isInactive; // Nur inaktive sind wirklich "disabled"

    const iconEl = useMemo(() => {
        if (tool.icon && ICON_MAP[tool.icon]) return ICON_MAP[tool.icon];
        return tool.type === 'HTML_FILE' ? <FileHtml size={28} /> : <Globe size={28} />;
    }, [tool.icon, tool.type]);

    return (
        <div
            onClick={isDisabled ? undefined : onClick}
            role={isDisabled ? 'presentation' : 'button'}
            tabIndex={isDisabled ? -1 : 0}
            onKeyDown={e => { if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '28px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition)',
                textAlign: 'center',
                minHeight: 160,
                userSelect: 'none',
                opacity: isInactive ? 0.45 : (isLocked ? 0.75 : 1),
                filter: isInactive ? 'grayscale(100%)' : (isLocked ? 'grayscale(30%) brightness(0.9)' : 'none'),
                overflow: 'hidden',
            }}
            className={isDisabled ? '' : 'tool-card-hover'}
        >
            {/* Hover-Gradient (nur aktive) */}
            {!isDisabled && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, var(--accent-primary)08, transparent)',
                    opacity: 0,
                    transition: 'opacity var(--transition)',
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                }} className="tool-card-gradient" />
            )}

            {/* Gesperrt-Overlay (Scloss-Icon) */}
            {isLocked && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'inherit',
                    background: 'rgba(0,0,0,0.15)',
                    backdropFilter: 'grayscale(0.5) blur(0.5px)',
                    zIndex: 2,
                }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.5)',
                        borderRadius: '50%',
                        padding: 12,
                        backdropFilter: 'blur(4px)',
                        boxShadow: 'var(--shadow-md)',
                    }}>
                        <Lock size={24} color="rgba(255,255,255,0.9)" />
                    </div>
                </div>
            )}

            {/* Icon */}
            <div style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: 'linear-gradient(135deg, var(--accent-primary)22, var(--accent-secondary)22)',
                border: '1px solid var(--accent-primary)33',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                marginBottom: 12,
                transition: 'all var(--transition)',
            }}>
                {iconEl}
            </div>

            {/* Name */}
            <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 4,
                lineHeight: 1.3,
            }}>
                {tool.name}
            </div>

            {/* Beschreibung */}
            {tool.description && (
                <div style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    marginBottom: 8,
                }}>
                    {tool.description}
                </div>
            )}

            {/* Typ-Badge */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 4,
                fontSize: 11,
                color: 'var(--text-muted)',
            }}>
                {tool.type === 'HTML_FILE'
                    ? <><FileHtml size={11} /> Gehostet</>
                    : <><ExternalLink size={11} /> Externer Link</>}
            </div>

            <style>{`
        .tool-card-hover:hover {
          border-color: var(--accent-primary) !important;
          box-shadow: var(--shadow-md), 0 0 0 1px var(--accent-primary)40 !important;
          transform: translateY(-2px);
        }
        .tool-card-hover:hover .tool-card-gradient {
          opacity: 1 !important;
        }
      `}</style>
        </div>
    );
}
