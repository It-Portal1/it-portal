/**
 * Admin: Tool-Verwaltung
 * CRUD für Tools mit HTML-Upload und Icon-Auswahl
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Tool, Role, User, ToolType, ToolVisibility, Permission } from '@/types';
import {
    Plus, Pencil, Trash2, X, Loader2, CheckCircle,
    Lock, Unlock, Globe, FileCode as FileHtml, Eye, EyeOff
} from 'lucide-react';

const ICONS = ['Globe', 'Database', 'Network', 'Shield', 'Code', 'Wrench', 'Terminal', 'Server', 'Wifi', 'Key', 'Cpu', 'Monitor', 'FileCode'];

interface ToolFormData {
    name: string; description: string; icon: string; type: ToolType;
    url: string; filePath: string; visibility: ToolVisibility;
    isActive: boolean; isLocked: boolean; roleIds: string[]; userIds: string[];
}
const defaultForm: ToolFormData = {
    name: '', description: '', icon: 'Globe', type: 'EXTERNAL_LINK',
    url: '', filePath: '', visibility: 'PUBLIC', isActive: true, isLocked: false,
    roleIds: [], userIds: [],
};

export default function AdminToolsPage() {
    const [tools, setTools] = useState<Tool[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTool, setEditTool] = useState<Tool | null>(null);
    const [form, setForm] = useState<ToolFormData>(defaultForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const fetchData = useCallback(async () => {
        try {
            const [tRes, rRes, uRes] = await Promise.all([
                api.get('/tools'),
                api.get('/roles'),
                api.get('/users'),
            ]);
            setTools(tRes.data); setRoles(rRes.data); setUsers(uRes.data);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => {
        setEditTool(null); setForm(defaultForm); setError(''); setModalOpen(true);
    };

    const openEdit = (t: Tool) => {
        setEditTool(t);
        setForm({
            name: t.name, description: t.description || '', icon: t.icon || 'Globe',
            type: t.type, url: t.url || '', filePath: '',
            visibility: t.visibility, isActive: t.isActive, isLocked: t.isLocked,
            roleIds: t.roleAccess?.map(r => r.roleId) ?? [],
            userIds: t.userAccess?.map(u => u.userId) ?? [],
        });
        setError(''); setModalOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await api.post('/tools/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setForm(f => ({ ...f, filePath: data.filename }));
            showToast('Datei erfolgreich hochgeladen');
        } catch {
            setError('Upload fehlgeschlagen');
        } finally { setUploading(false); }
    };

    const handleSave = async () => {
        if (!form.name) { setError('Name erforderlich'); return; }
        if (form.type === 'EXTERNAL_LINK' && !form.url) { setError('URL erforderlich'); return; }
        if (form.type === 'HTML_FILE' && !form.filePath && !editTool) { setError('Bitte HTML-Datei hochladen'); return; }
        setSaving(true); setError('');
        try {
            const payload = {
                ...form,
                ...(form.type === 'HTML_FILE' && form.filePath && { filePath: form.filePath }),
            };
            if (editTool) {
                await api.put(`/tools/${editTool.id}`, payload);
                showToast('Tool aktualisiert');
            } else {
                await api.post('/tools', payload);
                showToast('Tool erstellt');
            }
            setModalOpen(false); fetchData();
        } catch (err: unknown) {
            setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Fehler beim Speichern');
        } finally { setSaving(false); }
    };

    const handleDelete = async (t: Tool) => {
        if (!confirm(`Tool "${t.name}" wirklich löschen?`)) return;
        await api.delete(`/tools/${t.id}`);
        showToast('Tool gelöscht'); fetchData();
    };

    const toggleLock = async (t: Tool) => {
        await api.put(`/tools/${t.id}`, { isLocked: !t.isLocked });
        fetchData();
    };

    const toggleActive = async (t: Tool) => {
        await api.put(`/tools/${t.id}`, { isActive: !t.isActive });
        fetchData();
    };

    const toggleId = (arr: string[], id: string) =>
        arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

    return (
        <div>
            {toast && (
                <div className="toast-container">
                    <div className="toast toast-success"><CheckCircle size={18} /> {toast}</div>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Tool-Verwaltung</h1>
                    <p className="page-subtitle" style={{ marginBottom: 0 }}>{tools.length} Tools</p>
                </div>
                <button onClick={openCreate} className="btn btn-primary"><Plus size={16} /> Neues Tool</button>
            </div>

            <div className="table-wrapper">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 0.6s linear infinite' }} /></div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>Name</th><th>Typ</th><th>Sichtbarkeit</th><th>Status</th><th>Aktionen</th></tr>
                        </thead>
                        <tbody>
                            {tools.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div>
                                            <strong>{t.name}</strong>
                                            {t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.description}</div>}
                                        </div>
                                    </td>
                                    <td>
                                        {t.type === 'HTML_FILE'
                                            ? <span className="badge badge-blue"><FileHtml size={11} style={{ marginRight: 4 }} />HTML</span>
                                            : <span className="badge badge-purple"><Globe size={11} style={{ marginRight: 4 }} />Link</span>}
                                    </td>
                                    <td>
                                        <span className="badge badge-yellow">
                                            {t.visibility === 'PUBLIC' ? 'Öffentlich' : t.visibility === 'ROLE_BASED' ? 'Rollenbasiert' : 'Benutzerbasiert'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {t.isActive ? <span className="badge badge-green">Aktiv</span> : <span className="badge badge-red">Inaktiv</span>}
                                            {t.isLocked && <span className="badge badge-red">Gesperrt</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => toggleLock(t)} className="btn-icon" title={t.isLocked ? 'Entsperren' : 'Sperren'}>
                                                {t.isLocked ? <Unlock size={15} /> : <Lock size={15} />}
                                            </button>
                                            <button onClick={() => toggleActive(t)} className="btn-icon" title={t.isActive ? 'Deaktivieren' : 'Aktivieren'}>
                                                {t.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                            <button onClick={() => openEdit(t)} className="btn-icon"><Pencil size={15} /></button>
                                            <button onClick={() => handleDelete(t)} className="btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
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
                    <div className="modal" style={{ maxWidth: 620 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editTool ? 'Tool bearbeiten' : 'Neues Tool'}</h2>
                            <button onClick={() => setModalOpen(false)} className="btn-icon"><X size={18} /></button>
                        </div>
                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Name *</label>
                                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tool-Name" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Icon</label>
                                <select className="input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}>
                                    {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label className="label">Beschreibung</label>
                            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Kurze Beschreibung" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Typ *</label>
                                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ToolType }))}>
                                    <option value="EXTERNAL_LINK">Externer Link</option>
                                    <option value="HTML_FILE">HTML-Datei</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Sichtbarkeit</label>
                                <select className="input" value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value as ToolVisibility }))}>
                                    <option value="PUBLIC">Öffentlich (alle)</option>
                                    <option value="ROLE_BASED">Rollenbasiert</option>
                                    <option value="USER_BASED">Benutzerbasiert</option>
                                </select>
                            </div>
                        </div>

                        {form.type === 'EXTERNAL_LINK' ? (
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="label">URL *</label>
                                <input className="input" type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com" />
                            </div>
                        ) : (
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="label">HTML-Datei {editTool && '(leer lassen = unverändert)'}</label>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <input ref={fileRef} type="file" accept=".html" style={{ display: 'none' }} onChange={handleFileUpload} />
                                    <button onClick={() => fileRef.current?.click()} className="btn btn-secondary" disabled={uploading}>
                                        {uploading ? <><Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> Hochladen...</> : 'Datei wählen'}
                                    </button>
                                    {form.filePath && <span style={{ fontSize: 13, color: 'var(--success)' }}>✓ {form.filePath}</span>}
                                </div>
                            </div>
                        )}

                        {/* Sichtbarkeits-Zuweisung */}
                        {form.visibility === 'ROLE_BASED' && (
                            <div className="form-group">
                                <label className="label">Erlaubte Rollen</label>
                                <div className="checkbox-group">
                                    {roles.map(r => (
                                        <label key={r.id} className="checkbox-item">
                                            <input type="checkbox" checked={form.roleIds.includes(r.id)} onChange={() => setForm(f => ({ ...f, roleIds: toggleId(f.roleIds, r.id) }))} />
                                            {r.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {form.visibility === 'USER_BASED' && (
                            <div className="form-group">
                                <label className="label">Erlaubte Benutzer</label>
                                <div className="checkbox-group">
                                    {users.map(u => (
                                        <label key={u.id} className="checkbox-item">
                                            <input type="checkbox" checked={form.userIds.includes(u.id)} onChange={() => setForm(f => ({ ...f, userIds: toggleId(f.userIds, u.id) }))} />
                                            {u.username}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 20, marginTop: 8, marginBottom: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                <label className="switch">
                                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                                    <span className="switch-slider" />
                                </label>
                                Aktiv
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                <label className="switch">
                                    <input type="checkbox" checked={form.isLocked} onChange={e => setForm(f => ({ ...f, isLocked: e.target.checked }))} />
                                    <span className="switch-slider" />
                                </label>
                                Gesperrt
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
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
