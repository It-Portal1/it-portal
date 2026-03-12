'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import api from '@/lib/api';
import {
    Save, RefreshCcw, Layout, Palette, Type, Globe,
    Monitor, Sidebar, Shield, CheckCircle2, AlertCircle,
    Eye
} from 'lucide-react';

export default function AdminSettingsPage() {
    const { settings, refreshSettings } = useSettings();
    const [formData, setFormData] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            await api.put('/settings', formData);
            await refreshSettings();
            setMessage({ type: 'success', text: 'Einstellungen erfolgreich gespeichert!' });
            setTimeout(() => setMessage(null), 5000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Fehler beim Speichern der Einstellungen.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-color)] pb-4 mb-8 pt-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[var(--text-primary)] flex items-center gap-4 tracking-tight">
                            <div className="p-3 bg-blue-500/10 rounded-2xl shadow-inner">
                                <Monitor className="w-10 h-10 text-blue-500" />
                            </div>
                            System-Einstellungen
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2 ml-16 text-lg font-medium opacity-80">Personalisierung & Branding deines Portals</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData(settings)}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" /> Verwerfen
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="btn btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Speichert...' : 'Einstellungen speichern'}
                        </button>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {/* Form Side */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Branding Section */}
                    <div className="glass-panel p-8">
                        <div className="flex items-center gap-3 mb-8 border-b border-[var(--border-color)] pb-6">
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <Globe className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Identität</h2>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">Name und Logo deines IT Portals</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="label">Portal Name</label>
                                <input
                                    type="text"
                                    name="appName"
                                    value={formData.appName}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="z.B. IT Portal"
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Slogan / Untertitel</label>
                                <input
                                    type="text"
                                    name="subtitle"
                                    value={formData.subtitle}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="z.B. Management System"
                                />
                            </div>
                            <div className="md:col-span-2 form-group">
                                <label className="label">Logo URL</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        name="logoUrl"
                                        value={formData.logoUrl || ''}
                                        onChange={handleChange}
                                        className="input flex-1"
                                        placeholder="https://deine-domain.de/logo.png"
                                    />
                                    {formData.logoUrl && (
                                        <div className="w-11 h-11 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] p-1 flex items-center justify-center overflow-hidden">
                                            <img src={formData.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Typografie */}
                    <div className="glass-panel p-8">
                        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-color)] pb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Type className="w-5 h-5 text-purple-500" />
                            </div>
                            <h2 className="text-xl font-bold">Typografie</h2>
                        </div>
                        <div className="form-group">
                            <label className="label">Schriftfamilie</label>
                            <select
                                name="fontFamily"
                                value={formData.fontFamily}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="Inter">Inter (Modern & Sauber)</option>
                                <option value="Roboto">Roboto (Konventionell)</option>
                                <option value="Outfit">Outfit (Rund & Premium)</option>
                                <option value="Plus Jakarta Sans">Plus Jakarta (Trendig)</option>
                                <option value="System">Browser System</option>
                            </select>
                            <p className="mt-4 p-6 rounded-2xl bg-[var(--bg-secondary)] text-2xl border border-[var(--border-color)] text-center font-medium" style={{ fontFamily: formData.fontFamily }}>
                                The quick brown fox jumps over the lazy dog. 1234567890
                            </p>
                        </div>
                    </div>

                    {/* Login Page Content */}
                    <div className="glass-panel p-8">
                        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-color)] pb-4">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Layout className="w-5 h-5 text-orange-500" />
                            </div>
                            <h2 className="text-xl font-bold">Login-Bildschirm</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="label">Überschrift</label>
                                <input
                                    type="text"
                                    name="loginTitle"
                                    value={formData.loginTitle}
                                    onChange={handleChange}
                                    className="input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Hinweistext</label>
                                <input
                                    type="text"
                                    name="loginSubtitle"
                                    value={formData.loginSubtitle}
                                    onChange={handleChange}
                                    className="input"
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div >
    );
}

function ColorInput({ label, name, value, onChange }: { label: string, name: string, value: string, onChange: any }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[var(--text-muted)] ml-1">{label}</span>
            <div className="flex gap-2 group">
                <input
                    type="color"
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="h-11 w-12 border-none p-0 bg-transparent cursor-pointer rounded-lg overflow-hidden transition-transform group-hover:scale-105"
                />
                <input
                    type="text"
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="flex-1 input font-mono text-sm uppercase tracking-wider"
                />
            </div>
        </div>
    );
}
