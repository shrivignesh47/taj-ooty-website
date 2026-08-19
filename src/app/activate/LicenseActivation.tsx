'use client';

import { useState } from 'react';
import { validateLicense, setBusinessConfig } from '@/features/ordering/lib/tauriClient';
import { useRouter } from 'next/navigation';

export default function LicenseActivation() {
    const [key, setKey] = useState('');
    const [restaurantName, setRestaurantName] = useState('');
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleActivate = async () => {
        if (!key.trim() || !restaurantName.trim() || !supabaseUrl.trim() || !supabaseAnonKey.trim()) {
            setError('All fields are required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const valid = await validateLicense(key.trim());
            if (!valid) {
                setError('Invalid license key. Contact your provider.');
                return;
            }
            await setBusinessConfig({
                restaurant_name: restaurantName,
                supabase_url: supabaseUrl,
                supabase_anon_key: supabaseAnonKey,
                license_key: key,
                license_type: 'direct',
                license_expires: '',
            });
            router.replace('/staff/login');
        } catch {
            setError('Activation failed. Check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-cream">
            <div className="bg-white rounded-2xl p-10 w-full max-w-md space-y-6 shadow-xl">
                <h1 className="text-2xl font-semibold text-maroon">Activate Taj POS</h1>
                <p className="text-sm text-gray-500">Enter the details provided by your administrator.</p>
                <div className="space-y-4">
                    <input
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-charcoal focus:outline-none focus:border-gold"
                        placeholder="Restaurant name"
                        value={restaurantName}
                        onChange={e => setRestaurantName(e.target.value)}
                    />
                    <input
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-charcoal focus:outline-none focus:border-gold"
                        placeholder="Supabase project URL"
                        value={supabaseUrl}
                        onChange={e => setSupabaseUrl(e.target.value)}
                    />
                    <input
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-charcoal focus:outline-none focus:border-gold"
                        placeholder="Supabase anon key"
                        value={supabaseAnonKey}
                        onChange={e => setSupabaseAnonKey(e.target.value)}
                    />
                    <input
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-charcoal font-mono focus:outline-none focus:border-gold"
                        placeholder="License key (e.g. TAJPOS-XXXX-XXXX)"
                        value={key}
                        onChange={e => setKey(e.target.value)}
                    />
                </div>
                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                <button
                    onClick={handleActivate}
                    disabled={loading}
                    className="w-full bg-maroon hover:bg-maroon-mid text-white rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? 'Activating...' : 'Activate'}
                </button>
            </div>
        </div>
    );
}
