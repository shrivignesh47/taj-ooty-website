/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from 'react';
import { Search, X, User, FileSpreadsheet, Printer } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface Props {
    customers: any[];
    orders: any[];
    settings?: any;
}

export function AdminCRM({ customers, orders, settings }: Props) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any | null>(null);

    const filtered = customers.filter(c =>
        (c.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (c.phone || '').includes(search)
    );

    const customerOrders = selected
        ? orders.filter(o => o.customer_phone === selected.phone).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : [];

    const taxSettings = settings || {
        printerSize: '80mm',
        headerNote: 'Hotel Taj Ooty',
        footerNote: 'Thank You! Please Visit Again.',
        gstRate: 5,
        chargeServiceTax: true,
        serviceChargeRate: 10,
        isGstInclusive: false
    };

    const handlePrintHistoricalBill = (o: any) => {
        const w = window.open('', '_blank', 'width=380,height=600');
        if (!w) return;
        
        const now = new Date(o.created_at);
        const printerSize = taxSettings.printerSize || '80mm';
        
        // Calculate totals
        const subtotal = o.order_items?.reduce((s: number, i: any) => s + (i.price_at_order * i.qty), 0) || 0;
        
        const gstRate = taxSettings.gstRate ?? 5;
        const splitRate = gstRate / 2;
        const chargeServiceTax = taxSettings.chargeServiceTax ?? true;
        const serviceChargeRate = taxSettings.serviceChargeRate ?? 10;
        const isGstInclusive = taxSettings.isGstInclusive ?? false;
        
        let cgst = 0, sgst = 0, service = 0, grand = 0;
        
        if (isGstInclusive) {
            const baseAmount = subtotal / (1 + (gstRate / 100));
            const totalGst = subtotal - baseAmount;
            cgst = totalGst / 2;
            sgst = totalGst / 2;
            service = chargeServiceTax ? baseAmount * (serviceChargeRate / 100) : 0;
            grand = subtotal + service;
        } else {
            cgst = subtotal * (splitRate / 100);
            sgst = subtotal * (splitRate / 100);
            service = chargeServiceTax ? subtotal * (serviceChargeRate / 100) : 0;
            grand = subtotal + cgst + sgst + service;
        }

        w.document.write(`<!DOCTYPE html>
<html><head><title>Historical Bill - ${o.id.split('-').pop()}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:${printerSize === '58mm' ? '220px' : '300px'};padding:12px;font-size:11px;color:#000}
  h1{font-size:15px;text-align:center;font-weight:950;letter-spacing:1px}
  .center{text-align:center}.sub{font-size:9px;color:#333}
  .sep{border-top:1px dashed #000;margin:6px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .bold{font-weight:700}.big{font-size:14px;font-weight:900}
</style></head>
<body>
<h1>${taxSettings.headerNote || 'Hotel Taj Ooty'}</h1>
<p class="center sub">Hotel Taj Ooty - Historical Invoice</p>
<div class="sep"></div>
<div class="row"><span>Table: <b>T-${o.restaurant_tables?.table_no ?? 'Counter'}</b></span><span>${now.toLocaleDateString()}</span></div>
<div class="row"><span>Guest: ${o.customer_name ?? 'Guest'}</span><span>${now.toLocaleTimeString()}</span></div>
<div class="sep"></div>
<div class="row bold"><span>Item</span><span>Qty × Rate</span><span>Amt</span></div>
<div class="sep"></div>
${o.order_items?.map((i: any) => `<div class="row"><span>${i.menu_items?.name || 'Unknown Item'}</span><span>${i.qty}×${i.price_at_order}</span><span>₹${(i.qty * i.price_at_order).toFixed(0)}</span></div>`).join('')}
<div class="sep"></div>
<div class="row"><span>Subtotal</span><span>₹${subtotal.toFixed(0)}</span></div>
<div class="row"><span>CGST (${splitRate}%)</span><span>₹${cgst.toFixed(0)}</span></div>
<div class="row"><span>SGST (${splitRate}%)</span><span>₹${sgst.toFixed(0)}</span></div>
${chargeServiceTax ? `<div class="row"><span>Service Fee (${serviceChargeRate}%)</span><span>₹${service.toFixed(0)}</span></div>` : ''}
<div class="sep"></div>
<div class="row big"><span>GRAND TOTAL</span><span>₹${grand.toFixed(0)}</span></div>
<div class="sep"></div>
<p class="center bold">${taxSettings.footerNote || 'Thank You! Please Visit Again.'}</p>
<script>window.onload=()=>{window.print();window.close();}</script>
</body></html>`);
        w.document.close();
    };

    const exportCustomersToExcel = () => {
        const customerData = filtered.map(customer => ({
            'Phone': customer.phone || 'N/A',
            'Name': customer.name || 'Unknown',
            'Total Visits': customer.visits,
            'Total Spent': customer.totalSpent,
            'Last Visit': customer.lastVisit ? format(new Date(customer.lastVisit), 'yyyy-MM-dd') : 'N/A'
        }));
        const ws = XLSX.utils.json_to_sheet(customerData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        XLSX.writeFile(wb, "hotel-taj-ooty-customers-crm.xlsx");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-[#C9974A]/20 shadow-sm">
                <div>
                    <h3 className="text-[#4E1414] font-black text-lg">Customer Identity Ledger</h3>
                    <p className="text-[#241B15]/60 text-sm mt-1">Track loyalty, lifetime value, and visit history.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-white border border-[#C9974A]/40 rounded-xl overflow-hidden shadow-sm w-full md:w-64">
                        <div className="pl-3 py-2 flex items-center justify-center text-[#C9974A]">
                            <Search className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="px-3 py-2 outline-none text-[#241B15] w-full text-sm font-bold"
                        />
                    </div>
                    <button
                        onClick={exportCustomersToExcel}
                        className="flex items-center gap-1.5 bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Export CRM (Excel)
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#C9974A]/20 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#F6EEDF]/50 text-[#4E1414] font-black uppercase text-[11px] tracking-wider border-b border-[#C9974A]/20">
                            <tr>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Visits</th>
                                <th className="px-6 py-4">Lifetime Total</th>
                                <th className="px-6 py-4">Latest Encounter</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#C9974A]/10">
                            {filtered.map((c, i) => (
                                <tr
                                    key={i}
                                    onClick={() => setSelected(c)}
                                    className="hover:bg-[#F6EEDF]/50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4 font-bold text-[#241B15] flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#4E1414]/10 text-[#4E1414] flex items-center justify-center">
                                            <User className="w-4 h-4" />
                                        </div>
                                        {c.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-[#241B15]/60">{c.phone || 'N/A'}</td>
                                    <td className="px-6 py-4 font-black text-[#4E1414]">{c.visits}</td>
                                    <td className="px-6 py-4 font-black text-[#C9974A]">₹{c.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                                    <td className="px-6 py-4 text-xs font-semibold text-[#241B15]/50">
                                        {c.lastVisit ? format(new Date(c.lastVisit), 'MMM dd, yyyy') : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Profile Drawer / Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
                    <div className="bg-[#F6EEDF] w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden">
                        <div className="bg-[#4E1414] px-6 py-5 flex justify-between items-center shrink-0">
                            <h3 className="text-[#F6EEDF] font-black text-xl">Customer Profile</h3>
                            <button onClick={() => setSelected(null)} className="text-[#F6EEDF]/70 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 pb-4 shrink-0 border-b border-[#C9974A]/20">
                            <h2 className="text-3xl font-black text-[#4E1414] mb-1">{selected.name || 'Unknown'}</h2>
                            <p className="text-[#241B15]/60 font-bold mb-6">{selected.phone || 'No Phone Number'}</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-[#C9974A]/30">
                                    <p className="text-[10px] font-black text-[#4E1414] uppercase tracking-wider mb-1">Lifetime Value</p>
                                    <p className="text-2xl font-black text-[#C9974A]">₹{selected.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-[#C9974A]/30">
                                    <p className="text-[10px] font-black text-[#4E1414] uppercase tracking-wider mb-1">Avg per Visit</p>
                                    <p className="text-2xl font-black text-[#241B15]">₹{Math.round(selected.totalSpent / selected.visits).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto taj-scrollbar p-8">
                            <h4 className="text-sm font-black text-[#4E1414] uppercase tracking-wider mb-4">Visit History</h4>
                            <div className="space-y-4">
                                {customerOrders.map(o => {
                                    const total = o.order_items?.reduce((s: number, i: any) => s + (i.price_at_order * i.qty), 0) || 0;
                                    return (
                                        <div key={o.id} className="bg-white p-4 rounded-xl border border-[#C9974A]/20 shadow-sm flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-[#241B15]">{format(new Date(o.created_at), 'MMM dd, yyyy')}</span>
                                                    <span className="font-black text-[#C9974A]">₹{total.toFixed(0)}</span>
                                                </div>
                                                <p className="text-xs font-semibold text-[#241B15]/50">
                                                    Order #{o.id.split('-').pop()} • {o.restaurant_tables?.table_no ? `Table ${o.restaurant_tables.table_no}` : 'Takeaway'}
                                                </p>
                                                <div className="mt-2 text-[10px] text-gray-500 font-bold bg-[#F6EEDF]/20 p-2 rounded-lg border border-[#C9974A]/10 space-y-0.5">
                                                    {o.order_items?.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between">
                                                            <span>{item.menu_items?.name || 'Unknown Item'}</span>
                                                            <span className="text-[#4E1414]">x{item.qty}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handlePrintHistoricalBill(o)}
                                                className="p-2 border border-[#C9974A]/30 rounded-xl hover:bg-[#F6EEDF]/40 transition-colors text-[#4E1414] group"
                                                title="Print Invoice"
                                            >
                                                <Printer className="w-4 h-4 text-[#C9974A] group-hover:text-[#4E1414]" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
