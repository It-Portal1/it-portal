/**
 * Admin: Benutzerverwaltung
 * Tabellen-Ansicht mit Erstellen/Bearbeiten/Löschen Modals
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { User, Role, Permission } from '@/types';
import {
    Plus, Pencil, Trash2, CheckCircle, XCircle, Shield, Loader2, X
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
            permissions: u.userPermissions.map(p => p.permission),
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
                setSaving(false);
                setError('Passwort für neuen Benutzer erforderlich');
                return;
            }
            if (form.password && form.password.length < 8) {
                setSaving(false);
                setError('Passwort muss mindestens 8 Zeichen haben');
                return;
            }

            const payload = { ...form, roleId: form.roleId || null };
            if (editUser) {
                await api.put(`/users/${editUser.id}`, payload);
                showToast('Benutzer aktualisiert');
            } else {
                await api.post('/users', payload);
                showToast('Benutzer erstellt');
            }
            setModalOpen(false);
            fetchData();
        } catch (err: unknown) {
            setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Fehler beim Speichern');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (u: User) => {
        if (!confirm(`Benutzer "${u.username}" wirklich löschen?`)) return;
        await api.delete(`/users/${u.id}`);
        showToast('Benutzer gelöscht');
        fetchData();
    };

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
        <div>
            {toast && (
                <div className="toast-container">
                    <div className="toast toast-success">
                        <CheckCircle size={18} /> {toast}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Benutzerverwaltung</h1>
                    <p className="page-subtitle" style={{ marginBottom: 0 }}>{users.length} Benutzer</p>
                </div>
                <button onClick={openCreate} className="btn btn-primary">
                    <Plus size={16} /> Neuer Benutzer
                </button>
            </div>

            <div className="table-wrapper">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Loader2 size={24} style={{ animation: 'spin 0.6s linear infinite', margin: 'auto' }} />
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Benutzer</th>
                                <th>E-Mail</th>
                                <th>Rolle</th>
                                <th>Status</th>
                                <th>Admin</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td><strong>{u.username}</strong></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                                    <td>
                                        {u.role ? (
                                            <span className="badge badge-purple">{u.role.name}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Keine Rolle</span>
                                        )}
                                    </td>
                                    <td>
                                        {u.isActive
                                            ? <span className="badge badge-green">Aktiv</span>
                                            : <span className="badge badge-red">Gesperrt</span>}
                                    </td>
                                    <td>
                                        {u.isAdmin
                                            ? <Shield size={16} color="var(--accent-primary)" />
                                            : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>–</span>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => openEdit(u)} className="btn-icon" title="Bearbeiten">
                                                <Pencil size={15} />
                                            </button>
                                            <button onClick={() => handleDelete(u)} className="btn-icon" title="Löschen"
                                                style={{ color: 'var(--danger)' }}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
                    <div className="modal">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                                {editUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="btn-icon"><X size={18} /></button>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, color: 'var(--danger)', marginBottom: 16 }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="label">Benutzername *</label>
                            <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="username" />
                        </div>
                        <div className="form-group">
                            <label className="label">E-Mail *</label>
                            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@schule.de" />
                        </div>
                        <div className="form-group">
                            <label className="label">{editUser ? 'Neues Passwort (leer lassen = unverändert)' : 'Passwort *'}</label>
                            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                        </div>
                        <div className="form-group">
                            <label className="label">Rolle</label>
                            <select className="input" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                                <option value="">Keine Rolle</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                <label className="switch">
                                    <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} />
                                    <span className="switch-slider" />
                                </label>
                                Administrator
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                <label className="switch">
                                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                                    <span className="switch-slider" />
                                </label>
                                Aktiv
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                <label className="switch">
                                    <input type="checkbox" checked={form.requirePasswordChange} onChange={e => setForm(f => ({ ...f, requirePasswordChange: e.target.checked }))} />
                                    <span className="switch-slider" />
                                </label>
                                PW-Änderung erzwingen
                            </label>
                        </div>

                        <div className="form-group">
                            <label className="label">Individuelle Berechtigungen</label>
                            <div className="checkbox-group">
                                {ALL_PERMISSIONS.map(p => (
                                    <label key={p.value} className="checkbox-item">
                                        <input type="checkbox" checked={form.permissions.includes(p.value)} onChange={() => togglePermission(p.value)} />
                                        {p.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">Spezifische Tools (Direktzuweisung)</label>
                            <div className="checkbox-group" style={{ maxHeight: 150, overflowY: 'auto' }}>
                                {tools.map(t => (
                                    <label key={t.id} className="checkbox-item">
                                        <input type="checkbox" checked={form.toolIds.includes(t.id)} onChange={() => toggleTool(t.id)} />
                                        {t.name}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Abbrechen</button>
                            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                                {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> Speichern...</> : 'Speichern'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
