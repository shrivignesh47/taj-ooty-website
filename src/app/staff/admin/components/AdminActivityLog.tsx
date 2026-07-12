/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { fetchActivityLog } from '@/features/ordering/actions/adminActions';
import { Activity, ShieldCheck } from 'lucide-react';

function fmt(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminActivityLog() {
    const [log, setLog] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadLog = () => {
        setLoading(true);
        fetchActivityLog().then(res => {
            if (res.success) setLog(res.data);
            else setError(res.error ?? 'Failed to load activity log');
            setLoading(false);
        });
    };

    useEffect(() => {
        loadLog();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-48 text-[#4E1414]">
            <Activity className="w-8 h-8 animate-pulse mr-3" />
            <span className="font-semibold">Loading activity log…</span>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
            <p className="font-bold">Could not load activity log</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={loadLog} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">Try Reloading</button>
        </div>
    );

    if (log.length === 0) return (
        <div className="flex flex-col items-center justify-center h-48 text-[#4E1414]/60 bg-white rounded-2xl border border-[#C9974A]/20 p-8">
            <ShieldCheck className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-bold">No activity recorded yet</p>
            <p className="text-sm text-[#241B15]/50 mt-1">Staff login/logout, settings updates, and order confirmations will appear here.</p>
            <button onClick={loadLog} className="mt-4 flex items-center gap-2 bg-[#4E1414] text-[#F6EEDF] px-4 py-2 rounded-xl text-xs font-bold shadow hover:bg-[#350C0C] transition-colors">
                🔄 Refresh Logs
            </button>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-[#C9974A]/20 shadow-sm overflow-hidden">
            <div className="bg-[#4E1414] px-6 py-4 flex items-center gap-3">
                <Activity className="w-5 h-5 text-[#C9974A]" />
                <h3 className="font-bold text-[#F6EEDF]">System Audit Log</h3>
                <button onClick={loadLog} className="ml-auto flex items-center gap-1.5 bg-[#C9974A]/20 text-[#C9974A] hover:bg-[#C9974A]/30 px-3 py-1 rounded-lg text-xs font-bold transition-colors">
                    🔄 Refresh
                </button>
                <span className="text-xs text-[#F6EEDF]/80 font-bold ml-2">{log.length} records</span>
            </div>
            <div className="overflow-x-auto taj-scrollbar">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#F6EEDF]/60 border-b border-[#C9974A]/20">
                        <tr>
                            <th className="px-6 py-3 font-bold text-xs text-[#4E1414] uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-3 font-bold text-xs text-[#4E1414] uppercase tracking-wider">Staff Extractor</th>
                            <th className="px-6 py-3 font-bold text-xs text-[#4E1414] uppercase tracking-wider">Action Dispatched</th>
                            <th className="px-6 py-3 font-bold text-xs text-[#4E1414] uppercase tracking-wider">Payload / Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F6EEDF]">
                        {log.map((row: any) => (
                            <tr key={row.id} className="hover:bg-[#F6EEDF]/30 transition-colors">
                                <td className="px-6 py-4 text-[#241B15]/70 text-xs font-semibold">{fmt(row.created_at)}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#4E1414]/10 text-[#4E1414] flex items-center justify-center font-bold text-xs">
                                            {row.staff_users?.name?.charAt(0) ?? '?'}
                                        </div>
                                        <div>
                                            <span className="block font-bold text-[#241B15]">{row.staff_users?.name ?? 'System Proxy'}</span>
                                            <span className="text-[10px] font-bold uppercase text-[#C9974A]">
                                                {row.staff_users?.roles?.name ?? 'Automaton'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-[#C9974A]/10 text-[#4E1414] px-2.5 py-1 rounded-md text-xs font-extrabold shadow-sm border border-[#C9974A]/20">
                                        {row.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <pre className="text-[10px] bg-white p-2 border border-[#C9974A]/20 rounded-lg text-[#241B15]/70 w-max max-w-sm overflow-x-auto whitespace-pre-wrap font-mono">
                                        {JSON.stringify(row.details, null, 2)}
                                    </pre>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
