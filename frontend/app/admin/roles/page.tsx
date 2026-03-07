/**
 * Admin: Rollenverwaltung
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Role, Permission } from '@/types';
import { Plus, Pencil, Trash2, X, Loader2, CheckCircle } from 'lucide-react';

const ALL_PERMISSIONS: { value: Permission; label: string; desc: string }[] = [
    { value: Permission.VIEW_TOOLS, label: 'Tools anzeigen', desc: 'Tool-Kacheln sehen' },
    { value: Permission.USE_TOOLS, label: 'Tools nutzen', desc: 'Tools öffnen/aufrufen' },
    { value: Permission.CREATE_TOOLS, label: 'Tools erstellen', desc: 'Neue Tools anlegen' },
    { value: Permission.EDIT_TOOLS, label: 'Tools bearbeiten', desc: 'Bestehende Tools ändern' },
    { value: Permission.DELETE_TOOLS, label: 'Tools löschen', desc: 'Tools entfernen' },
    { value: Permission.MANAGE_USERS, label: 'Benutzer verwalten', desc: 'User-Management' },
];

interface RoleFormData { name: string; description: string; permissions: Permission[]; }
const defaultForm: RoleFormData = { name: '', description: '', permissions: [] };

export default function AdminRolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [form, setForm] = useState<RoleFormData>(defaultForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const fetchRoles = useCallback(async () => {
        try {
            const { data } = await api.get('/roles');
            setRoles(data);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const openCreate = () => {
        setEditRole(null); setForm(defaultForm); setError(''); setModalOpen(true);
    };

    const openEdit = (r: Role) => {
        setEditRole(r);
        setForm({ name: r.name, description: r.description || '', permissions: r.permissions });
        setError(''); setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name) { setError('Rollenname erforderlich'); return; }
        setSaving(true); setError('');
        try {
            if (editRole) {
                await api.put(`/roles/${editRole.id}`, form);
                showToast('Rolle aktualisiert');
            } else {
                await api.post('/roles', form);
                showToast('Rolle erstellt');
            }
            setModalOpen(false); fetchRoles();
        } catch (err: unknown) {
            setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Fehler');
        } finally { setSaving(false); }
    };

    const handleDelete = async (r: Role) => {
        if (!confirm(`Rolle "${r.name}" löschen?`)) return;
        await api.delete(`/roles/${r.id}`);
        showToast('Rolle gelöscht'); fetchRoles();
    };

    const togglePerm = (p: Permission) => {
        setForm(f => ({
            ...f,
            permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p],
        }));
    };

    return (
        <div>
            {toast && (
                <div className="toast-container">
                    <div className="toast toast-success"><CheckCircle size={18} /> {toast}</div>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Rollenverwaltung</h1>
                    <p className="page-subtitle" style={{ marginBottom: 0 }}>{roles.length} Rollen</p>
                </div>
                <button onClick={openCreate} className="btn btn-primary"><Plus size={16} /> Neue Rolle</button>
            </div>

            <div className="table-wrapper">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 0.6s linear infinite' }} /></div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>Rolle</th><th>Beschreibung</th><th>Berechtigungen</th><th>Benutzer</th><th>Aktionen</th></tr>
                        </thead>
                        <tbody>
                            {roles.map(r => (
                                <tr key={r.id}>
                                    <td><strong>{r.name}</strong></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.description || '–'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {r.permissions.length === 0
                                                ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Keine</span>
                                                : r.permissions.map(p => (
                                                    <span key={p} className="badge badge-purple" style={{ fontSize: 11 }}>
                                                        {ALL_PERMISSIONS.find(x => x.value === p)?.label ?? p}
                                                    </span>
                                                ))}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        {(r as Role & { _count?: { users: number } })._count?.users ?? 0}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => openEdit(r)} className="btn-icon"><Pencil size={15} /></button>
                                            <button onClick={() => handleDelete(r)} className="btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {modalOpen && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
                    <div className="modal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editRole ? 'Rolle bearbeiten' : 'Neue Rolle'}</h2>
                            <button onClick={() => setModalOpen(false)} className="btn-icon"><X size={18} /></button>
                        </div>
                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}
                        <div className="form-group">
                            <label className="label">Rollenname *</label>
                            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. IT-Team" />
                        </div>
                        <div className="form-group">
                            <label className="label">Beschreibung</label>
                            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optionale Beschreibung" />
                        </div>
                        <div className="form-group">
                            <label className="label">Berechtigungen</label>
                            <div className="checkbox-group">
                                {ALL_PERMISSIONS.map(p => (
                                    <label key={p.value} className="checkbox-item">
                                        <input type="checkbox" checked={form.permissions.includes(p.value)} onChange={() => togglePerm(p.value)} />
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{p.label}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                                        </div>
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
