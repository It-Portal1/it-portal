'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        appName: '',
        subtitle: '',
        icon: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetch('/api/settings')
            .then((res) => res.json())
            .then((data) => {
                setSettings(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                setMessage('Einstellungen erfolgreich gespeichert!');
                router.refresh(); // Aktualisiert die Seite, damit Änderungen sichtbar werden
            } else {
                setMessage('Fehler beim Speichern.');
            }
        } catch (err) {
            setMessage('Ein Fehler ist aufgetreten.');
        }
    };

    if (loading) return <div className="p-8">Lade Einstellungen...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">System-Einstellungen</h1>

            {message && (
                <div className={`p-4 mb-4 rounded ${message.includes('Fehler') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow border border-gray-200">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name der Anwendung
                    </label>
                    <input
                        type="text"
                        value={settings.appName}
                        onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="z.B. IT Portal"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Untertitel
                    </label>
                    <input
                        type="text"
                        value={settings.subtitle}
                        onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="z.B. Schul-IT Management"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Icon Name (Lucide React)
                    </label>
                    <input
                        type="text"
                        value={settings.icon}
                        onChange={(e) => setSettings({ ...settings, icon: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="z.B. Monitor, Server, Shield..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Namen von <a href="https://lucide.dev/icons" target="_blank" className="text-blue-600 hover:underline">lucide.dev</a> verwenden.</p>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors font-medium">
                    Speichern
                </button>
            </form>
        </div>
    );
}