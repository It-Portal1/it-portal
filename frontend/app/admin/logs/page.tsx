'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
    Activity, Search, Filter, Calendar, User,
    ChevronLeft, ChevronRight, RefreshCcw, Info,
    LogIn, LogOut, Settings, Wrench, ShieldAlert,
    Clock, Globe, Database
} from 'lucide-react';

interface AuditLog {
    id: string;
    timestamp: string;
    userId: string | null;
    username: string | null;
    action: string;
    resource: string | null;
    details: string | null;
    ipAddress: string | null;
    user?: {
        username: string;
        email: string;
    };
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function AdminLogsPage() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [page, setPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchLogs = async (pageNum = 1) => {
        setLoading(true);
        try {
            const params: any = { page: pageNum, limit: 50 };
            if (search) params.search = search;
            if (actionFilter) params.action = actionFilter;

            const res = await api.get('/logs', { params });
            setLogs(res.data.logs);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Fehler beim Laden der Logs:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (user?.isAdmin) {
            fetchLogs(page);
        }
    }, [user, page, actionFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs(1);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchLogs(page);
    };

    if (!user?.isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="p-6 bg-red-500/10 rounded-full mb-6 border border-red-500/20 shadow-2xl">
                    <ShieldAlert className="w-16 h-16 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4">Zugriff Verweigert</h2>
                <p className="text-[var(--text-secondary)] text-lg max-w-md">Diese Seite ist nur für System-Administratoren zugänglich.</p>
            </div>
        );
    }

    const getActionIcon = (action: string) => {
        if (action.includes('LOGIN')) return <LogIn className="w-4 h-4 text-emerald-400" />;
        if (action.includes('LOGOUT')) return <LogOut className="w-4 h-4 text-orange-400" />;
        if (action.includes('SETTINGS')) return <Settings className="w-4 h-4 text-blue-400" />;
        if (action.includes('TOOL')) return <Wrench className="w-4 h-4 text-purple-400" />;
        if (action.includes('USER')) return <User className="w-4 h-4 text-indigo-400" />;
        return <Activity className="w-4 h-4 text-gray-400" />;
    };

    const getActionColor = (action: string) => {
        if (action.includes('LOGIN')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (action.includes('LOGOUT')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        if (action.includes('SETTINGS')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (action.includes('TOOL')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        if (action.includes('USER')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    return (
        <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                <div>
                    <h1 className="text-4xl font-black flex items-center gap-4 tracking-tight text-white mb-2">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-[0_0_25px_rgba(79,70,229,0.4)] border border-indigo-400/30">
                            <Database className="w-8 h-8 text-white" />
                        </div>
                        System-Protokoll
                    </h1>
                    <p className="text-[var(--text-secondary)] text-lg font-medium opacity-70 ml-1">Vollständige Überwachung aller System-Aktivitäten</p>
                </div>

                <div className="flex items-center gap-4 bg-[var(--bg-secondary)]/30 p-2 rounded-2xl border border-[var(--border-color)]">
                    <button
                        onClick={handleRefresh}
                        className={`btn p-3 rounded-xl transition-all ${isRefreshing ? 'bg-indigo-500/20' : 'hover:bg-white/5'}`}
                        title="Logs aktualisieren"
                    >
                        <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-white/60'}`} />
                    </button>
                    <div className="h-8 w-px bg-[var(--border-color)] mx-1" />
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Live Audit</span>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Filters Card */}
            <div className="card mb-10 overflow-visible relative bg-slate-900/30 backdrop-blur-xl border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Filter className="w-32 h-32 text-white" />
                </div>
                <div className="card-content">
                    <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Logs durchsuchen (Nutzer, Resource, Aktion...)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input pl-14 h-14 bg-black/20 border-white/5 focus:border-indigo-500/50 text-white font-medium"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="relative min-w-[200px]">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="input pl-12 h-14 bg-black/20 border-white/5 focus:border-indigo-500/50 text-white font-bold appearance-none"
                                >
                                    <option value="">Alle Aktionen</option>
                                    <option value="LOGIN">Logins</option>
                                    <option value="LOGOUT">Logouts</option>
                                    <option value="UPDATE_SETTINGS">Einstellungen</option>
                                    <option value="ACCESS_TOOL">Tool-Zugriffe</option>
                                    <option value="CREATE_USER">Nutzer-Erstellung</option>
                                    <option value="UPDATE_USER">Nutzer-Update</option>
                                    <option value="DELETE_USER">Nutzer-Löschung</option>
                                </select>
                            </div>

                            <button type="submit" className="btn h-14 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xl transition-all border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 active:shadow-none">
                                Filter Anwenden
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card overflow-hidden shadow-2xl relative border-none">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 border-b border-white/5">
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Zeitpunkt</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Benutzer</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Aktion</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Resource</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">IP-Adresse</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading && logs.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="p-6 h-16 bg-white/[0.01]" />
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                            <Search className="w-16 h-16" />
                                            <p className="text-xl font-bold">Keine Log-Einträge gefunden</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-6 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white leading-none mb-1">
                                                        {new Date(log.timestamp).toLocaleDateString('de-DE')}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-white/40">
                                                        {new Date(log.timestamp).toLocaleTimeString('de-DE')}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                                    <User className="w-4 h-4 text-indigo-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-white">{log.username || 'System / Gast'}</span>
                                                    <span className="text-[10px] font-medium text-white/30">{log.user?.email || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 whitespace-nowrap">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                                                {getActionIcon(log.action)}
                                                {log.action}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-xs font-bold text-white/80">{log.resource || '-'}</span>
                                        </td>
                                        <td className="p-6 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-[10px] font-mono text-white/20">
                                                <Globe className="w-3 h-3" />
                                                {log.ipAddress || 'Unbekannt'}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button
                                                className="p-2 hover:bg-white/5 rounded-lg transition-colors group/btn"
                                                title={log.details || 'Keine Details vorhanden'}
                                            >
                                                <Info className="w-4 h-4 text-white/20 group-hover/btn:text-white transition-colors" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                            Eintrag <span className="text-white">{(page - 1) * pagination.limit + 1}</span> bis <span className="text-white">{Math.min(page * pagination.limit, pagination.total)}</span> von <span className="text-white">{pagination.total}</span>
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn p-3 bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-white/5 rounded-xl border border-white/10 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5 text-white" />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                                    const pageNum = i + 1; // Simplified for brevity
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all border ${page === pageNum ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                                className="btn p-3 bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-white/5 rounded-xl border border-white/10 transition-all"
                            >
                                <ChevronRight className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 flex items-start gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl">
                    <ShieldAlert className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h4 className="text-indigo-400 font-bold mb-1">Datenschutz-Hinweis</h4>
                    <p className="text-xs text-white/40 leading-relaxed font-medium">Diese Protokolle dienen der Sicherheit und Nachvollziehbarkeit administrativer Änderungen. Sie werden gemäß der IT-Sicherheitsrichtlinien für 90 Tage aufbewahrt.</p>
                </div>
            </div>
        </div>
    );
}
