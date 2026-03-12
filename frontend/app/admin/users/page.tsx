'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { User, Role, Permission } from '@/types';
import {
    Plus, Pencil, Trash2, CheckCircle, XCircle, Shield, Loader2, X,
    Mail, User as UserIcon, Settings, UserPlus, Search, MoreVertical,
    CheckCircle2, AlertCircle, Save
} from 'lucide-react';

const ALL_PERMISSIONS: { value: Permission; label: string }[] = [
    { value: Permission.VIEW_TOOLS, label: 'Tools anzeigen' },
    { value: Permission.USE_TOOLS, label: 'Tools nutzen' },
    { value: Permission.CREATE_TOOLS, label: 'Tools erstellen' },
    { value: Permission.EDIT_TOOLS, label: 'Tools bearbeiten' },
    { value: Permission.DELETE_TOOLS, label: 'Tools löschen' },
    { value: Permission.MANAGE_USERS, label: 'Benutzer verwalten' },
];

interface UserFormData {
    username: string;
    email: string;
    password: string;
    isAdmin: boolean;
    isActive: boolean;
    requirePasswordChange: boolean;
    roleId: string;
    permissions: Permission[];
    toolIds: string[];
}

const defaultForm: UserFormData = {
    username: '', email: '', password: '',
    isAdmin: false, isActive: true, requirePasswordChange: true, roleId: '', permissions: [], toolIds: [],
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [tools, setTools] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [form, setForm] = useState<UserFormData>(defaultForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const fetchData = useCallback(async () => {
        try {
            const [uRes, rRes, tRes] = await Promise.all([
                api.get('/users'),
                api.get('/roles'),
                api.get('/tools')
            ]);
            setUsers(uRes.data);
            setRoles(rRes.data);
            setTools(tRes.data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => {
        setEditUser(null);
        setForm(defaultForm);
        setError('');
        setModalOpen(true);
    };

    const openEdit = (u: User) => {
        setEditUser(u);
        setForm({
            username: u.username,
            email: u.email,
            password: '',
            isAdmin: u.isAdmin,
            isActive: u.isActive,
            requirePasswordChange: u.requirePasswordChange,
            roleId: u.roleId ?? '',
            permissions: u.userPermissions?.map(p => p.permission) || [],
            toolIds: (u as any).toolAccess || [],
        });
        setError('');
        setModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            if (!editUser && !form.password) {
                setError('Passwort für neuen Benutzer erforderlich');
                setSaving(false);
                return;
            }
            if (form.password && form.password.length < 8) {
                setError('Passwort muss mindestens 8 Zeichen haben');
                setSaving(false);
                return;
            }

            const payload = { ...form, roleId: form.roleId || null };
            if (editUser) {
                await api.put(`/users/${editUser.id}`, payload);
                showToast('Benutzer erfolgreich aktualisiert');
            } else {
                await api.post('/users', payload);
                showToast('Benutzer erfolgreich erstellt');
            }
            setModalOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Aktion fehlgeschlagen');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (u: User) => {
        if (u.username.toLowerCase() === 'admin') {
            alert('Der Haupt-Administrator kann nicht gelöscht werden.');
            return;
        }
        if (!confirm(`Möchtest du den Benutzer "${u.username}" wirklich unwiderruflich löschen?`)) return;

        try {
            await api.delete(`/users/${u.id}`);
            showToast('Benutzer gelöscht');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Fehler beim Löschen');
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const togglePermission = (p: Permission) => {
        setForm(f => ({
            ...f,
            permissions: f.permissions.includes(p)
                ? f.permissions.filter(x => x !== p)
                : [...f.permissions, p],
        }));
    };

    const toggleTool = (toolId: string) => {
        setForm(f => ({
            ...f,
            toolIds: f.toolIds.includes(toolId)
                ? f.toolIds.filter(id => id !== toolId)
                : [...f.toolIds, toolId],
        }));
    };

    return (
        <div className="space-y-6">
            {toast && (
                <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-right-8 duration-300">
                    <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                        <CheckCircle2 size={20} />
                        <span className="font-semibold">{toast}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-extrabold flex items-center gap-4 tracking-tight">
                        <div className="p-3 bg-purple-500/10 rounded-2xl shadow-inner">
                            <UserIcon className="w-10 h-10 text-purple-500" />
                        </div>
                        Benutzerverwaltung
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 ml-16 text-lg font-medium opacity-80">Verwalte Zugänge, Rollen und Berechtigungen</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            name="user-search"
                            autoComplete="off"
                            placeholder="Suchen nach Name oder E-Mail..."
                            className="input pl-12 h-12 text-base glass-panel border-none shadow-lg"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={openCreate} className="btn btn-primary flex items-center gap-2 h-12 px-6 shadow-xl shadow-purple-500/20">
                        <UserPlus size={20} /> <span className="hidden sm:inline">Neuer Benutzer</span>
                    </button>
                </div>
            </div>

            <div className="glass-panel overflow-hidden border-none shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-color)] bg-white/[0.02]">
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Benutzer</th>
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Kontakt</th>
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Rolle</th>
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8">
                                            <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4 mx-auto" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-[var(--bg-secondary)]/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold flex items-center gap-1.5 text-lg">
                                                        {u.username}
                                                        {u.isAdmin && <Shield size={16} className="text-blue-500" />}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)] tracking-wider">USER-ID: {u.id.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                                <Mail size={14} />
                                                {u.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.role ? (
                                                <span className="badge badge-purple px-2.5 py-1 text-[11px]">{u.role.name}</span>
                                            ) : (
                                                <span className="text-xs text-[var(--text-muted)]">Standard</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.isActive ? (
                                                <div className="flex items-center gap-1.5 text-green-500 text-xs font-semibold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    Aktiv
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-red-500 text-xs font-semibold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                    Gesperrt
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(u)} className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors" title="Bearbeiten">
                                                    <Pencil size={18} />
                                                </button>
                                                {u.username.toLowerCase() !== 'admin' && (
                                                    <button onClick={() => handleDelete(u)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors" title="Löschen">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                        Keine Benutzer gefunden.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="modal-overlay z-[1000] p-4 sm:p-8" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
                    <div className="modal glass-panel max-w-2xl w-full max-h-[95vh] overflow-y-auto p-6 sm:p-10 border-white/10 shadow-[0_0_80px_-15px_rgba(139,92,246,0.3)]">
                        <div className="flex items-center justify-between mb-8 sticky top-0 bg-[var(--bg-secondary)]/50 backdrop-blur-xl z-10 py-4 border-b border-white/5">
                            <h2 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
                                {editUser ? <Pencil className="text-blue-500 w-8 h-8" /> : <UserPlus className="text-purple-500 w-8 h-8" />}
                                {editUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer anlegen'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all hover:rotate-90">
                                <X size={28} />
                            </button>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-6 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-group">
                                    <label className="label">Benutzername *</label>
                                    <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="z.B. j.schmidt" />
                                </div>
                                <div className="form-group">
                                    <label className="label">E-Mail *</label>
                                    <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@schule.de" />
                                </div>
                                <div className="form-group">
                                    <label className="label">{editUser ? 'Neues Passwort (optional)' : 'Passwort *'}</label>
                                    <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                                    {editUser && <p className="text-[10px] text-[var(--text-muted)] mt-1">Nur ausfüllen zum Ändern</p>}
                                </div>
                                <div className="form-group">
                                    <label className="label">Rolle</label>
                                    <select className="input" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                                        <option value="">Keine Rolle (Standard)</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 bg-[var(--bg-secondary)]/30 rounded-2xl space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Berechtigungen & Status</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Toggle label="Administrator-Rechte" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} sublabel="Voller Zugriff auf das Admin-Panel" />
                                    <Toggle label="Konto Aktiv" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} sublabel="Benutzer kann sich anmelden" />
                                    <Toggle label="PW-Wechsel erzwingen" checked={form.requirePasswordChange} onChange={e => setForm(f => ({ ...f, requirePasswordChange: e.target.checked }))} sublabel="Nach dem nächsten Login" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Individuelle Zugriffs-Berechtigungen</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                                    {ALL_PERMISSIONS.map(p => (
                                        <label key={p.value} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none ${form.permissions.includes(p.value)
                                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-500'
                                            : 'bg-[var(--bg-secondary)]/50 border-[var(--border-color)] hover:border-blue-500/30'
                                            }`}>
                                            <input type="checkbox" className="hidden" checked={form.permissions.includes(p.value)} onChange={() => togglePermission(p.value)} />
                                            {form.permissions.includes(p.value) ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 rounded-lg border-2 border-current opacity-20" />}
                                            <span className="font-semibold text-sm">{p.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 justify-end pt-6 border-t border-[var(--border-color)]">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary px-6">Abbrechen</button>
                                <button onClick={handleSave} disabled={saving} className="btn btn-primary px-8 flex items-center gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                                    {editUser ? 'Änderungen speichern' : 'Benutzer anlegen'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Toggle({ label, sublabel, checked, onChange }: { label: string, sublabel?: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-1">
                <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
                <div className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-gray-600'}`} />
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-semibold">{label}</span>
                {sublabel && <span className="text-[10px] text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-secondary)]">{sublabel}</span>}
            </div>
        </label>
    );
}
