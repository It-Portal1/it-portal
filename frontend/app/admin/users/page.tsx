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
            toolIds: (u as any).toolAccess?.map((ta: any) => ta.toolId) || [],
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
        <div className="container mx-auto py-8">
            {toast && (
                <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-right-8 duration-300">
                    <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                        <CheckCircle2 size={20} />
                        <span className="font-semibold">{toast}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-extrabold flex items-center gap-4 tracking-tight">
                        <div className="p-3 bg-purple-500/10 rounded-2xl shadow-inner">
                            <UserIcon className="w-10 h-10 text-purple-500" />
                        </div>
                        Benutzerverwaltung
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 ml-16 text-lg font-medium">Verwalte Zugänge, Rollen und Berechtigungen</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Suchen nach Name oder E-Mail..."
                            className="input pl-12 h-12"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={openCreate} className="btn btn-primary h-12 px-6">
                        <UserPlus size={20} /> <span className="hidden sm:inline font-bold">Neuer Benutzer</span>
                    </button>
                </div>
            </div>

            <div className="table-wrapper shadow-xl">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th>Benutzer</th>
                            <th>Kontakt</th>
                            <th>Rolle</th>
                            <th>Status</th>
                            <th className="text-right">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-6 py-8">
                                        <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4 mx-auto" />
                                    </td>
                                </tr>
                            ))
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-bold flex items-center gap-2 text-base">
                                                {u.username}
                                                {u.isAdmin && <Shield size={16} className="text-blue-500" />}
                                            </span>
                                            <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">ID: {u.id.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                            <Mail size={14} className="opacity-60" />
                                            {u.email}
                                        </div>
                                    </td>
                                    <td>
                                        {u.role ? (
                                            <span className="badge badge-purple">{u.role.name}</span>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)] font-medium">Standard-User</span>
                                        )}
                                    </td>
                                    <td>
                                        {u.isActive ? (
                                            <div className="flex items-center gap-2 text-green-500 text-xs font-bold">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                Aktiv
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                Gesperrt
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(u)} className="btn btn-icon btn-sm text-blue-500 hover:bg-blue-500/10" title="Bearbeiten">
                                                <Pencil size={18} />
                                            </button>
                                            {u.username.toLowerCase() !== 'admin' && (
                                                <button onClick={() => handleDelete(u)} className="btn btn-icon btn-sm text-red-500 hover:bg-red-500/10" title="Löschen">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-20 text-center text-[var(--text-secondary)] font-medium">
                                    <div className="flex flex-col items-center gap-3">
                                        <Search className="w-10 h-10 opacity-20" />
                                        Keine Benutzer gefunden.
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
                    <div className="modal overflow-hidden">
                        {/* Header */}
                        <div className="modal-header bg-[var(--bg-tertiary)]/30">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                    {editUser ? <Pencil className="text-blue-500 w-5 h-5" /> : <UserPlus className="text-purple-500 w-5 h-5" />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">
                                        {editUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer anlegen'}
                                    </h2>
                                    <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Identität & Zugriff</p>
                                </div>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="btn btn-icon ring-1 ring-white/10 hover:ring-white/20">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="modal-content">
                            <div className="space-y-10">
                                {error && (
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                                        <span className="font-bold">{error}</span>
                                    </div>
                                )}

                                {/* Basic Info */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-2 mb-4">
                                        <UserIcon size={16} className="text-blue-500" />
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">Basis-Informationen</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="form-group mb-0">
                                            <label className="label">Benutzername <span className="text-red-500">*</span></label>
                                            <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="z.B. max.mustermann" />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="label">E-Mail Adresse <span className="text-red-500">*</span></label>
                                            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="max@beispiel.de" />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="label">{editUser ? 'Neues Passwort (optional)' : 'Passwort *'}</label>
                                            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="label">Rolle</label>
                                            <select className="input" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                                                <option value="">Keine spezielle Rolle</option>
                                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Toggles */}
                                <div className="p-6 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-inner grid grid-cols-1 sm:grid-cols-3 gap-8">
                                    <Toggle label="Administrator" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} sublabel="Vollzugriff" />
                                    <Toggle label="Aktiv" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} sublabel="Login erlaubt" />
                                    <Toggle label="PW-Wechsel" checked={form.requirePasswordChange} onChange={e => setForm(f => ({ ...f, requirePasswordChange: e.target.checked }))} sublabel="Erzwungen" />
                                </div>

                                {/* Permissions */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-2 mb-4">
                                        <Shield size={16} className="text-purple-500" />
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">Berechtigungen</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {ALL_PERMISSIONS.map(p => (
                                            <Tile
                                                key={p.value}
                                                label={p.label}
                                                active={form.permissions.includes(p.value)}
                                                onClick={() => togglePermission(p.value)}
                                                color="purple"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Tool Access */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-2 mb-4">
                                        <Settings size={16} className="text-emerald-500" />
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">Tool-Zugriff</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {tools.map(tool => (
                                            <Tile
                                                key={tool.id}
                                                label={tool.name}
                                                active={form.toolIds.includes(tool.id)}
                                                onClick={() => toggleTool(tool.id)}
                                                color="blue"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer bg-[var(--bg-primary)]/50">
                            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary px-8">Abbrechen</button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn btn-primary px-10"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                                <span className="font-bold">{editUser ? 'Speichern' : 'Erstellen'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Toggle({ label, sublabel, checked, onChange }: { label: string, sublabel?: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <label className="flex items-center gap-4 cursor-pointer group select-none">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
                <div className={`w-12 h-6 rounded-full transition-all duration-300 border ${checked ? 'bg-blue-600 border-blue-400' : 'bg-slate-700 border-slate-600'}`} />
                <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
            <div className="flex flex-col">
                <span className={`text-sm font-bold transition-colors ${checked ? 'text-white' : 'text-[var(--text-secondary)]'}`}>{label}</span>
                {sublabel && <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 leading-none mt-1">{sublabel}</span>}
            </div>
        </label>
    );
}

function Tile({ label, active, onClick, color }: { label: string, active: boolean, onClick: () => void, color: 'blue' | 'purple' }) {
    const activeClasses = color === 'purple'
        ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
        : 'bg-blue-500/10 border-blue-500/50 text-blue-400';

    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none group h-full shadow-sm hover:shadow-md ${active
                ? activeClasses
                : 'bg-[var(--bg-primary)] border-transparent hover:border-[var(--border-color)] grayscale opacity-70 hover:grayscale-0 hover:opacity-100'
                }`}
        >
            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${active ? (color === 'purple' ? 'bg-purple-500 border-purple-400' : 'bg-blue-500 border-blue-400') : 'border-[var(--border-color)] bg-black/20'}`}>
                {active && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <span className="font-bold text-xs leading-tight">{label}</span>
        </div>
    );
}
