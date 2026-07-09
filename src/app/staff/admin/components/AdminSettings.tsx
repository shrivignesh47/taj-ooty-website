/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import { Save, Store, Receipt, MapPin, Phone, Percent, ShieldCheck } from 'lucide-react';
import { supabase } from '@/features/ordering/lib/supabase';

export function AdminSettings() {
    const [form, setForm] = useState({
        restaurant_name: '',
        gst_number: '',
        fssai_number: '',
        service_charge_percent: 5.0,
        phone: '',
        email: '',
        address: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rowId, setRowId] = useState<string | null>(null);

    useEffect(() => {
        supabase.from('restaurant_settings').select('*').limit(1)
            .then(({ data }) => {
                if (data && data.length > 0) {
                    setRowId(data[0].id);
                    setForm({
                        restaurant_name: data[0].restaurant_name || '',
                        gst_number: data[0].gst_number || '',
                        fssai_number: data[0].fssai_number || '',
                        service_charge_percent: data[0].service_charge_percent || 0,
                        phone: data[0].phone || '',
                        email: data[0].email || '',
                        address: data[0].address || ''
                    });
                }
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        if (rowId) {
            await supabase.from('restaurant_settings').update(form).eq('id', rowId);
        } else {
            const { data } = await supabase.from('restaurant_settings').insert(form).select().single();
            if (data) setRowId(data.id);
        }
        alert('Settings saved successfully!');
        setSaving(false);
    };

    if (loading) return <div className="text-center py-20">Loading Settings...</div>;

    const baseAmount = 1500;
    const scAmt = (baseAmount * form.service_charge_percent) / 100;
    const total = baseAmount + scAmt;

    const handleExport = async () => {
        const XLSX = await import('xlsx');
        setSaving(true);
        try {
            const [menuRes, customerRes, tableRes, ordersRes] = await Promise.all([
                supabase.from('menu_items').select('*'),
                supabase.from('orders').select('customer_name, customer_phone, order_items(qty, price_at_order)'),
                supabase.from('restaurant_tables').select('*'),
                supabase.from('orders').select('*')
            ]);

            const wb = XLSX.utils.book_new();

            // Menu Sheet
            const menuWs = XLSX.utils.json_to_sheet(menuRes.data || []);
            XLSX.utils.book_append_sheet(wb, menuWs, "Menu Items");

            // Tables Sheet
            const tablesWs = XLSX.utils.json_to_sheet(tableRes.data || []);
            XLSX.utils.book_append_sheet(wb, tablesWs, "Tables");

            // Orders Sheet
            const ordersWs = XLSX.utils.json_to_sheet(ordersRes.data || []);
            XLSX.utils.book_append_sheet(wb, ordersWs, "Orders");

            // Derive CRM ledger
            const cMap = new Map();
            (customerRes.data || []).forEach((o: any) => {
                if (!o.customer_phone) return;
                const totalSp = (o.order_items || []).reduce((acc: number, i: any) => acc + (i.price_at_order * i.qty), 0);
                if (cMap.has(o.customer_phone)) {
                    cMap.get(o.customer_phone).visits += 1;
                    cMap.get(o.customer_phone).totalSpent += totalSp;
                } else {
                    cMap.set(o.customer_phone, { name: o.customer_name, phone: o.customer_phone, visits: 1, totalSpent: totalSp });
                }
            });
            const crmWs = XLSX.utils.json_to_sheet(Array.from(cMap.values()));
            XLSX.utils.book_append_sheet(wb, crmWs, "Customer Ledger");

            XLSX.writeFile(wb, "Taj_Ooty_Data_Export.xlsx");
        } catch (err: any) {
            alert('Export failed: ' + err.message);
        }
        setSaving(false);
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#C9974A]/20 shadow-sm">
                <div>
                    <h3 className="text-[#4E1414] font-black text-lg">System Data Export</h3>
                    <p className="text-[#241B15]/60 text-sm mt-1">Download backup of Menus, CRM, and Tables to a spreadsheet.</p>
                </div>
                <button
                    onClick={handleExport} disabled={saving}
                    className="flex items-center gap-2 bg-[#F6EEDF] border border-[#C9974A]/40 text-[#4E1414] px-5 py-2.5 rounded-xl font-bold hover:bg-[#e6dbcc] transition-colors disabled:opacity-50 shadow-sm"
                >
                    <Save className="w-5 h-5 text-[#C9974A]" /> {saving ? 'Exporting...' : 'Export to XLSX'}
                </button>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-start">
                <div className="w-full xl:w-2/3 bg-white p-8 rounded-2xl border border-[#C9974A]/20 shadow-sm">
                    <form className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Store className="w-4 h-4" /> Restaurant Name
                                </label>
                                <input
                                    type="text" value={form.restaurant_name} onChange={e => setForm({ ...form, restaurant_name: e.target.value })}
                                    className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#241B15] outline-none focus:border-[#4E1414] focus:bg-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Receipt className="w-4 h-4" /> GSTIN Number
                                </label>
                                <input
                                    type="text" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value.toUpperCase() })}
                                    className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#241B15] outline-none focus:border-[#4E1414] focus:bg-white transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> FSSAI
                                </label>
                                <input
                                    type="text" value={form.fssai_number} onChange={e => setForm({ ...form, fssai_number: e.target.value })}
                                    className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#241B15] outline-none focus:border-[#4E1414] focus:bg-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Percent className="w-4 h-4" /> Service Charge %
                                </label>
                                <input
                                    type="number" step="0.1" value={form.service_charge_percent} onChange={e => setForm({ ...form, service_charge_percent: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#241B15] outline-none focus:border-[#4E1414] focus:bg-white transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Phone className="w-4 h-4" /> Contact Phone
                                </label>
                                <input
                                    type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#241B15] outline-none focus:border-[#4E1414] focus:bg-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2 flex items-center gap-2">
                                    @ Contact Email
                                </label>
                                <input
                                    type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#241B15] outline-none focus:border-[#4E1414] focus:bg-white transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Physical Address
                            </label>
                            <textarea
                                rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#241B15] outline-none focus:border-[#4E1414] focus:bg-white transition-colors"
                            />
                        </div>

                        <div className="pt-4 border-t border-[#C9974A]/20 flex justify-end">
                            <button
                                type="button" onClick={handleSave} disabled={saving}
                                className="flex items-center justify-center gap-2 bg-[#4E1414] text-[#F6EEDF] px-8 py-3 rounded-xl shadow-lg font-bold hover:bg-[#350C0C] transition-all disabled:opacity-50"
                            >
                                <Save className="w-5 h-5 text-[#C9974A]" /> {saving ? 'Writing parameters...' : 'Lock Global Settings'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="w-full xl:w-1/3 mt-6 xl:mt-0">
                    <h4 className="text-xs font-black text-[#241B15]/50 uppercase tracking-wider mb-3">Live Receipt Preview</h4>
                    <div className="bg-white border-2 border-dashed border-[#C9974A]/40 rounded-xl p-8 font-mono text-sm max-w-sm mx-auto select-none shadow-xl">
                        <div className="text-center mb-6">
                            <h2 className="font-extrabold text-[#241B15] text-xl mb-1">{form.restaurant_name || '[Brand Name]'}</h2>
                            <p className="text-[#241B15]/70 whitespace-pre-line text-xs font-semibold leading-relaxed">
                                {form.address || '123 Fake Street\nCity, State, 12345'}
                            </p>
                            <p className="text-[#241B15]/80 mt-2 text-xs">Ph: {form.phone || '999-999-9999'}</p>
                            <p className="text-[#241B15]/80 mt-1 text-xs">GSTIN: {form.gst_number || '22AAAAA0000A1Z5'}</p>
                            {form.fssai_number && <p className="text-[#241B15]/80 mt-1 text-xs">FSSAI: {form.fssai_number}</p>}
                        </div>

                        <div className="border-t border-b border-dashed border-[#241B15]/30 py-4 mb-4">
                            <div className="flex justify-between mb-2"><span className="font-bold">Paneer Tikka × 1</span><span>₹500.00</span></div>
                            <div className="flex justify-between mb-2"><span className="font-bold">Chicken Curry × 1</span><span>₹1000.00</span></div>
                        </div>

                        <div className="space-y-1 mb-4">
                            <div className="flex justify-between text-[#241B15]/80"><span>Subtotal:</span><span>₹{baseAmount.toFixed(2)}</span></div>
                            {form.service_charge_percent > 0 && <div className="flex justify-between text-[#241B15]/80"><span>Service Charge ({form.service_charge_percent}%):</span><span>₹{scAmt.toFixed(2)}</span></div>}
                        </div>

                        <div className="flex justify-between text-lg font-black text-[#241B15] pt-3 border-t border-dashed border-[#241B15]/30">
                            <span>Grand Total:</span><span>₹{total.toFixed(2)}</span>
                        </div>

                        <div className="text-center mt-8 text-[#241B15]/60 text-xs italic font-semibold">
                            ~ Thank you for your visit ~
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
