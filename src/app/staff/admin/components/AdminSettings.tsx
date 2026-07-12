/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import { Save, Store, Receipt, MapPin, Phone, Percent, ShieldCheck, Printer, ChefHat, CheckSquare, Square } from 'lucide-react';
import { fetchRestaurantSettings, saveRestaurantSettings, fetchStationMappings, saveStationMappings } from '@/features/ordering/actions/adminActions';

export function AdminSettings() {
    const [form, setForm] = useState({
        restaurant_name: '',
        gst_number: '',
        fssai_number: '',
        service_charge_percent: 5.0,
        phone: '',
        email: '',
        address: '',
        auto_print_on_accept: false,
        printer_name: '',
        print_kot: true,
        print_bill: true
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rowId, setRowId] = useState<string | null>(null);

    const [stations, setStations] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [stationMap, setStationMap] = useState<{ station_id: string, category_id: string }[]>([]);
    const [stationRoutingEnabled, setStationRoutingEnabled] = useState(false);
    const [savingRouting, setSavingRouting] = useState(false);

    useEffect(() => {
        Promise.all([
            fetchRestaurantSettings(),
            fetchStationMappings()
        ]).then(([result, routingRes]) => {
            if (result.success && result.data) {
                setRowId(result.data.id);
                setForm({
                    restaurant_name: result.data.restaurant_name || '',
                    gst_number: result.data.gst_number || '',
                    fssai_number: result.data.fssai_number || '',
                    service_charge_percent: result.data.service_charge_percent || 0,
                    phone: result.data.phone || '',
                    email: result.data.email || '',
                    address: result.data.address || '',
                    auto_print_on_accept: result.data.auto_print_on_accept || false,
                    printer_name: result.data.printer_name || '',
                    print_kot: result.data.print_kot !== undefined ? result.data.print_kot : true,
                    print_bill: result.data.print_bill !== undefined ? result.data.print_bill : true
                });
            }
            if (routingRes.success) {
                setStations(routingRes.stations || []);
                setCategories(routingRes.categories || []);
                setStationMap(routingRes.map || []);
                setStationRoutingEnabled(routingRes.station_routing_enabled || false);
            }
            setLoading(false);
        });
    }, []);

    const handleToggleCategoryMapping = (stationId: string, categoryId: string) => {
        const exists = stationMap.some(m => m.station_id === stationId && m.category_id === categoryId);
        if (exists) {
            setStationMap(stationMap.filter(m => !(m.station_id === stationId && m.category_id === categoryId)));
        } else {
            setStationMap([...stationMap, { station_id: stationId, category_id: categoryId }]);
        }
    };

    const handleSaveRouting = async () => {
        setSavingRouting(true);
        const res = await saveStationMappings(stationRoutingEnabled, stationMap);
        if (!res.success) {
            alert(`Failed to save routing: ${res.error}`);
        } else {
            alert('Kitchen Station Routing & Category Mappings saved successfully!');
        }
        setSavingRouting(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await saveRestaurantSettings(form);
        if (!result.success) {
            alert(`Settings save failed: ${result.error}`);
        } else {
            alert('Settings saved successfully!');
        }
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
                import('@/features/ordering/lib/supabase').then(({ supabase }) => supabase.from('menu_items').select('*')),
                import('@/features/ordering/lib/supabase').then(({ supabase }) => supabase.from('orders').select('customer_name, customer_phone, order_items(qty, price_at_order)')),
                import('@/features/ordering/lib/supabase').then(({ supabase }) => supabase.from('restaurant_tables').select('*')),
                import('@/features/ordering/lib/supabase').then(({ supabase }) => supabase.from('orders').select('*'))
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
                <div className="w-full xl:w-2/3 space-y-6">
                    {/* Restaurant Info Settings */}
                    <div className="bg-white p-8 rounded-2xl border border-[#C9974A]/20 shadow-sm">
                        <h3 className="text-[#4E1414] font-black text-xl mb-6">Restaurant Information</h3>
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
                        </form>
                    </div>

                    {/* Printing Settings */}
                    <div className="bg-white p-8 rounded-2xl border border-[#C9974A]/20 shadow-sm">
                        <h3 className="text-[#4E1414] font-black text-xl mb-6 flex items-center gap-2">
                            <Printer className="w-5 h-5" /> Printing Configuration
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="font-bold text-[#4E1414]">Auto-Print on Accept</label>
                                    <p className="text-[#241B15]/60 text-sm">Automatically print KOT when order is confirmed by staff</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, auto_print_on_accept: !form.auto_print_on_accept })}
                                    className={`w-16 h-8 rounded-full transition-colors relative ${form.auto_print_on_accept ? 'bg-[#4E1414]' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute w-6 h-6 bg-white rounded-full top-1 transition-all ${form.auto_print_on_accept ? 'left-9' : 'left-1'}`} />
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2">
                                    Printer Name (Optional)
                                </label>
                                <input
                                    type="text" value={form.printer_name} onChange={e => setForm({ ...form, printer_name: e.target.value })}
                                    className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#241B15] outline-none focus:border-[#4E1414] focus:bg-white transition-colors"
                                />
                                <p className="mt-2 text-xs text-[#241B15]/60">
                                    Browser printing can open the system print dialog in real time, but silent background printing still depends on the browser and OS printer setup.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox" checked={form.print_kot}
                                        onChange={e => setForm({ ...form, print_kot: e.target.checked })}
                                        className="w-5 h-5 rounded border-2 border-[#4E1414] text-[#C9974A] focus:ring-[#C9974A]"
                                    />
                                    <label className="font-bold text-[#4E1414]">Print KOT Tickets</label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox" checked={form.print_bill}
                                        onChange={e => setForm({ ...form, print_bill: e.target.checked })}
                                        className="w-5 h-5 rounded border-2 border-[#4E1414] text-[#C9974A] focus:ring-[#C9974A]"
                                    />
                                    <label className="font-bold text-[#4E1414]">Print Bills</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kitchen Display Station Routing */}
                    <div className="bg-white p-8 rounded-2xl border border-[#C9974A]/20 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <ChefHat className="w-6 h-6 text-[#C9974A]" />
                                <div>
                                    <h3 className="font-black text-xl text-[#4E1414]">KOT Station Routing & Display Filtering</h3>
                                    <p className="text-xs text-[#241B15]/60 mt-0.5">Route categories (Tandoor, Gravy, Breads) directly to specific kitchen station monitors.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center cursor-pointer select-none">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={stationRoutingEnabled}
                                            onChange={e => setStationRoutingEnabled(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-11 h-6 bg-gray-200 rounded-full transition-colors ${stationRoutingEnabled ? 'bg-[#4E1414]' : 'bg-[#C9974A]/30'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${stationRoutingEnabled ? 'transform translate-x-5 bg-[#C9974A]' : ''}`}></div>
                                    </div>
                                    <span className="ml-2 text-xs font-bold text-[#4E1414]">
                                        {stationRoutingEnabled ? 'Routing Active' : 'Routing Disabled'}
                                    </span>
                                </label>
                                <button
                                    type="button"
                                    onClick={handleSaveRouting}
                                    disabled={savingRouting}
                                    className="bg-[#C9974A] text-[#4E1414] px-4 py-2 rounded-xl text-xs font-black shadow hover:bg-[#b88539] transition-all disabled:opacity-50"
                                >
                                    {savingRouting ? 'Saving...' : 'Save Routing Rules'}
                                </button>
                            </div>
                        </div>

                        {stations.length === 0 ? (
                            <div className="bg-[#F6EEDF]/30 p-6 rounded-2xl text-center border border-[#C9974A]/20 text-[#241B15]/60 text-xs font-bold">
                                No kitchen stations configured. Ensure kitchen_stations SQL migration has been run in Supabase Studio.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stations.map(st => (
                                    <div key={st.id} className="bg-[#F6EEDF]/20 p-4 rounded-2xl border border-[#C9974A]/30 shadow-sm">
                                        <div className="flex items-center gap-2 border-b border-[#C9974A]/20 pb-2 mb-3">
                                            <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: st.color || '#C9974A' }} />
                                            <span className="font-extrabold text-sm text-[#4E1414]">{st.name}</span>
                                        </div>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto taj-scrollbar pr-1">
                                            {categories.map(cat => {
                                                const isMapped = stationMap.some(m => m.station_id === st.id && m.category_id === cat.id);
                                                return (
                                                    <div
                                                        key={cat.id}
                                                        onClick={() => handleToggleCategoryMapping(st.id, cat.id)}
                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-bold transition-colors ${
                                                            isMapped ? 'bg-[#4E1414] text-[#F6EEDF] shadow-sm' : 'bg-white text-[#241B15]/70 hover:bg-[#F6EEDF]'
                                                        }`}
                                                    >
                                                        <span>{cat.name}</span>
                                                        {isMapped ? (
                                                            <CheckSquare className="w-4 h-4 text-[#C9974A]" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-gray-300" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-[#C9974A]/20 flex justify-end">
                        <button
                            type="button" onClick={handleSave} disabled={saving}
                            className="flex items-center justify-center gap-2 bg-[#4E1414] text-[#F6EEDF] px-8 py-3 rounded-xl shadow-lg font-bold hover:bg-[#350C0C] transition-all disabled:opacity-50"
                        >
                            <Save className="w-5 h-5 text-[#C9974A]" /> {saving ? 'Writing parameters...' : 'Lock Global Settings'}
                        </button>
                    </div>
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
