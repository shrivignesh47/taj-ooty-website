/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export function AdminCRM({ customers }: { customers: any[] }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-[#C9974A]/20 overflow-hidden">
            <h3 className="font-bold text-xl text-[#4E1414] p-6 border-b border-[#C9974A]/20 bg-[#F6EEDF]/50">Customer Identity Ledger</h3>
            <div className="p-6">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="text-[#4E1414] text-xs tracking-wider uppercase font-bold border-b border-[#C9974A]/20">
                        <tr>
                            <th className="py-4">Identifier Token</th>
                            <th className="py-4">Visits</th>
                            <th className="py-4">Lifetime Total</th>
                            <th className="py-4">Latest Encounter</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F6EEDF]">
                        {customers.map((c, i) => (
                            <tr key={i} className="hover:bg-[#F6EEDF]/30 transition-colors">
                                <td className="py-4 font-bold text-[#241B15] flex items-center gap-3">{c.name}</td>
                                <td className="py-4 font-bold text-[#4E1414]">{c.visits}</td>
                                <td className="py-4 font-bold text-[#C9974A]">₹{c.totalSpent}</td>
                                <td className="py-4 text-xs text-[#241B15]/60">{new Date(c.lastVisit).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
