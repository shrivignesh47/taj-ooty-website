"use client";

import { useState } from 'react';
import { History, Printer } from 'lucide-react';
import { orderTotal, fmt } from './utils';
import { CashierOrder, MainView } from '../types';

interface Props {
    history: CashierOrder[];
    setView: (view: MainView) => void;
    gstRate?: number;
    settings?: {
        headerNote?: string;
        footerNote?: string;
        gstRate?: number;
        serviceChargeRate?: number;
        isGstInclusive?: boolean;
        chargeServiceTax?: boolean;
        printerSize?: string;
    };
    restaurantSettings?: {
        restaurant_name?: string;
        address?: string;
        phone?: string;
        gstin?: string;
    } | null;
    searchQuery?: string;
}

export function BillingHistory({
    history,
    setView,
    gstRate = 0,
    settings,
    restaurantSettings,
    searchQuery = ''
}: Props) {
    const [printingId, setPrintingId] = useState<string | null>(null);

    const filteredHistory = history.filter(o => {
        if (!searchQuery || !searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = o.customer_name?.toLowerCase().includes(q) ?? false;
        const phoneMatch = o.customer_phone?.includes(q) ?? false;
        const tableMatch = o.restaurant_tables ? `table ${o.restaurant_tables.table_no}`.includes(q) || `t-${o.restaurant_tables.table_no}`.includes(q) : 'counter'.includes(q);
        const itemMatch = o.order_items?.some(i => i.menu_items?.name?.toLowerCase().includes(q)) ?? false;
        return nameMatch || phoneMatch || tableMatch || itemMatch;
    });

    const handleReprint = (order: CashierOrder) => {
        setPrintingId(order.id);
        const now = new Date(order.created_at);
        const rName = restaurantSettings?.restaurant_name || settings?.headerNote || 'HOTEL TAJ OOTY';
        const rAddress = restaurantSettings?.address || 'Main Bazaar Road, Ooty';
        const rPhone = restaurantSettings?.phone || '+91 423 244 4000';
        const gstPct = settings?.gstRate ?? gstRate * 100;
        const footerNote = settings?.footerNote || 'Thank you! Visit again.';
        const width = settings?.printerSize === '58mm' ? '220px' : '300px';

        const sub = orderTotal(order);
        const gstAmt = sub * (gstPct / 100);
        const grand = sub + gstAmt;

        const w = window.open('', '_blank', 'width=380,height=600');
        if (!w) { setPrintingId(null); return; }
        w.document.write(`<!DOCTYPE html>
<html><head><title>REPRINT - ${order.restaurant_tables ? `T${order.restaurant_tables.table_no}` : 'Counter'}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:${width};padding:12px;font-size:11px;color:#000}
  h1{font-size:15px;text-align:center;font-weight:950;letter-spacing:1px}
  .center{text-align:center}.sub{font-size:9px;color:#333}
  .sep{border-top:1px dashed #000;margin:6px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .bold{font-weight:700}.big{font-size:14px;font-weight:900}
  .reprint{text-align:center;font-size:9px;color:#777;font-style:italic;border:1px dashed #ccc;padding:2px;margin-bottom:6px}
</style></head>
<body>
<div class="reprint">*** REPRINT ***</div>
<h1>${rName}</h1>
<p class="center sub">${rAddress}</p>
<p class="center sub">${rPhone}</p>
${restaurantSettings?.gstin ? `<p class="center sub">GSTIN: ${restaurantSettings.gstin}</p>` : ''}
<div class="sep"></div>
<div class="row"><span>${order.restaurant_tables ? `Table: <b>T-${order.restaurant_tables.table_no}</b>` : `Counter`}</span><span>${now.toLocaleDateString()}</span></div>
<div class="row"><span>Guest: ${order.customer_name ?? 'Guest'}</span><span>${now.toLocaleTimeString()}</span></div>
<div class="sep"></div>
<div class="row bold"><span>Item</span><span>Qty × Rate</span><span>Amt</span></div>
<div class="sep"></div>
${order.order_items.map(i => {
    const total = i.qty * i.price_at_order;
    return `<div class="row"><span>${i.menu_items?.name ?? 'Item'}</span><span>${i.qty}×${i.price_at_order}</span><span>₹${total.toFixed(0)}</span></div>`;
}).join('')}
<div class="sep"></div>
<div class="row"><span>Subtotal</span><span>₹${sub.toFixed(2)}</span></div>
<div class="row"><span>CGST (${(gstPct / 2)}%)</span><span>₹${(gstAmt / 2).toFixed(2)}</span></div>
<div class="row"><span>SGST (${(gstPct / 2)}%)</span><span>₹${(gstAmt / 2).toFixed(2)}</span></div>
<div class="sep"></div>
<div class="row big"><span>GRAND TOTAL</span><span>₹${grand.toFixed(2)}</span></div>
<div class="sep"></div>
<p class="center bold">${footerNote}</p>
<script>window.onload=()=>{window.print();window.close();}</script>
</body></html>`);
        w.document.close();
        setPrintingId(null);
    };

    return (
        <div className="bg-white border border-[#C9974A]/30 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-[#C9974A]" /> Closed Bills Registry
                    </h2>
                    <p className="text-xs text-[#4E1414]/60">Shift payments registry archive.</p>
                </div>
                <button onClick={() => setView('bento')} className="text-xs text-[#C9974A] hover:underline font-bold">← Dashboard</button>
            </div>

            {/* Bills Table Grid */}
            <div className="overflow-x-auto rounded-xl border border-[#C9974A]/25">
                <table className="w-full text-xs text-left">
                    <thead className="bg-[#4E1414] text-[#F6EEDF] uppercase font-bold tracking-wider">
                        <tr>
                            <th className="p-3">Table/POS</th>
                            <th className="p-3">Guest Profile</th>
                            <th className="p-3">Summary of Items</th>
                            <th className="p-3">Time Billed</th>
                            <th className="p-3 text-right">Settled Amount</th>
                            <th className="p-3 text-center">Reprint</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C9974A]/20 bg-white">
                        {filteredHistory.map(o => {
                            const sub = orderTotal(o);
                            const grand = sub * (1 + gstRate);
                            return (
                                <tr key={o.id} className="hover:bg-[#F6EEDF]/30 transition-colors">
                                    <td className="p-3 font-bold text-[#4E1414]">{o.restaurant_tables ? `Table ${o.restaurant_tables.table_no}` : 'Counter'}</td>
                                    <td className="p-3">
                                        <p className="font-semibold">{o.customer_name}</p>
                                        {o.customer_phone && <p className="text-[10px] text-[#4E1414]/60">{o.customer_phone}</p>}
                                    </td>
                                    <td className="p-3 text-[#4E1414]/60 max-w-xs truncate">
                                        {o.order_items.map(i => `${i.menu_items?.name} x${i.qty}`).join(', ')}
                                    </td>
                                    <td className="p-3 text-[#4E1414]/40">{new Date(o.created_at).toLocaleTimeString()}</td>
                                    <td className="p-3 text-right font-black">{fmt(grand)}</td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => handleReprint(o)}
                                            disabled={printingId === o.id}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] text-[9px] font-bold rounded-md transition-all disabled:opacity-50 cursor-pointer"
                                            title="Reprint this bill"
                                        >
                                            <Printer className="w-2.5 h-2.5 text-[#C9974A]" />
                                            Reprint
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredHistory.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-[#4E1414]/40 italic">
                                    No closed bills in the history log yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
