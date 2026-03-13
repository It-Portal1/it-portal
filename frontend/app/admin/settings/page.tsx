'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import api from '@/lib/api';
import {
    Save, RefreshCcw, Layout, Globe,
    Monitor, Shield, CheckCircle2, AlertCircle, Upload, Settings
} from 'lucide-react';

export default function AdminSettingsPage() {
    const { settings, refreshSettings } = useSettings();
    const [formData, setFormData] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const data = new FormData();
        data.append('logo', file);

        try {
            const res = await api.post('/settings/logo', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, logoUrl: res.data.logoUrl }));
            await refreshSettings();
            setMessage({ type: 'success', text: 'Logo erfolgreich hochgeladen!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error('Error uploading logo:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || 'Logo-Upload fehlgeschlagen.' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            await api.put('/settings', formData);
            await refreshSettings();
            setMessage({ type: 'success', text: 'Einstellungen gespeichert!' });
            setTimeout(() => setMessage(null), 5000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Fehler beim Speichern.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto py-12 max-w-5xl animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 p-8 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 opacity-60" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-white flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            <Settings className="w-8 h-8 text-blue-400" />
                        </div>
                        System-Konfiguration
                    </h1>
                    <p className="text-blue-200/60 mt-2 font-medium ml-1 flex items-center gap-2">
                        <Monitor className="w-4 h-4" /> Zentrale Verwaltung der Portal-Informationen
                    </p>
                </div>

                <div className="flex gap-4 relative z-10 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={() => setFormData(settings)}
                        className="btn bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-xl transition-all flex items-center gap-2 font-semibold"
                    >
                        <RefreshCcw className="w-4 h-4 opacity-70" /> Verwerfen
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="btn bg-blue-600 hover:bg-blue-500 text-white border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 shadow-lg shadow-blue-500/30 px-8 py-3 rounded-xl transition-all flex items-center gap-2"
                    >
                        {isSaving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span className="font-bold tracking-wide">{isSaving ? 'Speichert...' : 'Einstellungen sichern'}</span>
                    </button>
                </div>
            </div>

            {/* Messages */}
            {message && (
                <div className={`p-5 rounded-2xl mb-10 flex items-center gap-4 border shadow-2xl animate-in slide-in-from-top-4 duration-500 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    <div className={`p-2 rounded-xl ${message.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    </div>
                    <span className="font-bold text-lg">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Name & Slogan Card */}
                <div className="card bg-slate-900/30 backdrop-blur-md border border-white/5 hover:border-blue-500/30 transition-all duration-500 shadow-xl overflow-hidden group">
                    <div className="card-header bg-black/20 border-b border-white/5 flex items-center gap-4 p-6">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                            <Globe className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-wide">Portal Identität</h2>
                    </div>
                    <div className="card-content p-8 space-y-8">
                        <div className="form-group mb-0 relative">
                            <label className="label text-blue-400 font-bold uppercase tracking-widest text-[10px] mb-3 block">Anwendungsname</label>
                            <input
                                type="text"
                                name="appName"
                                value={formData.appName}
                                onChange={handleChange}
                                className="input h-14 bg-black/40 border-white/5 focus:border-blue-500/50 text-white font-semibold text-lg"
                                placeholder="IT Portal"
                            />
                        </div>
                        <div className="form-group mb-0 relative">
                            <label className="label text-blue-400 font-bold uppercase tracking-widest text-[10px] mb-3 block">Slogan</label>
                            <input
                                type="text"
                                name="subtitle"
                                value={formData.subtitle}
                                onChange={handleChange}
                                className="input h-14 bg-black/40 border-white/5 focus:border-blue-500/50 text-white font-medium"
                                placeholder="Schulverwaltung"
                            />
                        </div>

                        <div className="pt-8 border-t border-white/5">
                            <label className="label text-blue-400 font-bold uppercase tracking-widest text-[10px] mb-4 block">Portal-Logo Bild</label>
                            <div className="flex flex-col sm:flex-row items-center gap-6 bg-black/20 p-6 rounded-2xl border border-white/5">
                                <div className="w-28 h-28 rounded-2xl bg-black/40 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shadow-inner relative group/logo">
                                    {formData.logoUrl ? (
                                        <img src={formData.logoUrl} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain transition-transform duration-500 group-hover/logo:scale-110" />
                                    ) : (
                                        <Shield className="w-10 h-10 text-white/10" />
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-blue-900/50 backdrop-blur-sm flex items-center justify-center">
                                            <RefreshCcw className="w-6 h-6 animate-spin text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4 text-center sm:text-left">
                                    <label className="btn bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-transparent text-white transition-all cursor-pointer rounded-xl px-5 py-2.5">
                                        <Upload className="w-4 h-4 mr-2" />
                                        <span className="font-semibold">Logo Hochladen</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                                    </label>
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/30">PNG oder JPG max. 2MB</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Login Texts Card */}
                <div className="card bg-slate-900/30 backdrop-blur-md border border-white/5 hover:border-orange-500/30 transition-all duration-500 shadow-xl overflow-hidden group">
                    <div className="card-header bg-black/20 border-b border-white/5 flex items-center gap-4 p-6">
                        <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20 group-hover:-rotate-6 transition-transform">
                            <Layout className="w-5 h-5 text-orange-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-wide">Login Erfahrung</h2>
                    </div>
                    <div className="card-content p-8 space-y-8">
                        <div className="form-group mb-0">
                            <label className="label text-orange-400 font-bold uppercase tracking-widest text-[10px] mb-3 block">Login Überschrift</label>
                            <input
                                type="text"
                                name="loginTitle"
                                value={formData.loginTitle}
                                onChange={handleChange}
                                className="input h-14 bg-black/40 border-white/5 focus:border-orange-500/50 text-white font-semibold text-lg"
                                placeholder="Willkommen zurück"
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label className="label text-orange-400 font-bold uppercase tracking-widest text-[10px] mb-3 block">Login Untertitel</label>
                            <textarea
                                name="loginSubtitle"
                                value={formData.loginSubtitle}
                                onChange={handleChange}
                                className="input min-h-[120px] bg-black/40 border-white/5 focus:border-orange-500/50 text-white/80 font-medium resize-y py-4 leading-relaxed"
                                placeholder="Bitte melde dich an..."
                            />
                        </div>

                        <div className="mt-8 p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-start gap-4">
                            <div className="p-2 bg-orange-500/20 rounded-lg shrink-0">
                                <Monitor className="w-5 h-5 text-orange-400" />
                            </div>
                            <p className="text-xs text-orange-100/50 leading-relaxed font-medium">Diese Texte werden zentral auf dem Login-Bildschirm angezeigt und begrüßen alle neuen sowie wiederkehrenden Nutzer.</p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
