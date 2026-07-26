"use client";

import { useEffect, useState } from 'react';
import { X, Printer, RefreshCw, CheckCircle2, AlertTriangle, Send, Sparkles } from 'lucide-react';
import { getAvailablePrinters, printThermalReceipt } from '@/features/ordering/lib/thermalPrint';
import { buildReceiptCommands } from '@/features/ordering/lib/escpos';
import { createBrowserClient } from '@supabase/ssr';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentPrinterName?: string | null;
    currentUseFallback?: boolean;
    onSaved?: (printerName: string, useFallback: boolean) => void;
}

export function PrinterSettingsModal({
    isOpen,
    onClose,
    currentPrinterName = '',
    currentUseFallback = true,
    onSaved
}: Props) {
    const [printers, setPrinters] = useState<string[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<string>(currentPrinterName || '');
    const [useFallback, setUseFallback] = useState<boolean>(currentUseFallback ?? true);
    const [loadingPrinters, setLoadingPrinters] = useState<boolean>(false);
    const [testStatus, setTestStatus] = useState<string | null>(null);
    const [saving, setSaving] = useState<boolean>(false);

    // Loyalty Settings state
    const [loyaltyEnabled, setLoyaltyEnabled] = useState<boolean>(true);
    const [pointsPerRupee, setPointsPerRupee] = useState<number>(1);
    const [redemptionRate, setRedemptionRate] = useState<number>(0.5);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        if (isOpen) {
            setSelectedPrinter(currentPrinterName || '');
            setUseFallback(currentUseFallback ?? true);
            refreshPrinters();
            loadSettings();
        }
    }, [isOpen, currentPrinterName, currentUseFallback]);

    const loadSettings = async () => {
        const { data } = await supabase.from('restaurant_settings').select('*').limit(1).single();
        if (data) {
            if (data.loyalty_enabled !== undefined) setLoyaltyEnabled(data.loyalty_enabled);
            if (data.loyalty_points_per_rupee !== undefined) setPointsPerRupee(Number(data.loyalty_points_per_rupee) || 1);
            if (data.loyalty_redemption_rate !== undefined) setRedemptionRate(Number(data.loyalty_redemption_rate) || 0.5);
        }
    };

    const refreshPrinters = async () => {
        setLoadingPrinters(true);
        setTestStatus(null);
        try {
            const list = await getAvailablePrinters();
            setPrinters(list);
            if (list.length > 0 && !selectedPrinter) {
                setSelectedPrinter(list[0]);
            }
        } catch {
            setPrinters([]);
        } finally {
            setLoadingPrinters(false);
        }
    };

    const handleTestPrint = async () => {
        if (!selectedPrinter) {
            alert('Please select a printer first');
            return;
        }
        setTestStatus('Sending test print command...');
        const testCommands = buildReceiptCommands({
            restaurantName: 'HOTEL TAJ OOTY',
            address: 'Main Bazaar Road, Ooty',
            phone: '+91 423 244 4000',
            billNo: 'TEST-001',
            tableNo: 'T-01',
            customerName: 'Test Guest',
            date: new Date().toLocaleString('en-IN'),
            items: [
                { name: 'Chicken Biriyani', qty: 1, price: 280, amount: 280 },
                { name: 'Masala Chai', qty: 2, price: 30, amount: 60 }
            ],
            subtotal: 340,
            discount: 0,
            taxableAmount: 340,
            serviceCharge: 17,
            cgst: 8.93,
            sgst: 8.93,
            grandTotal: 375,
            footerNote: 'TEST PRINT SUCCESSFUL — QZ TRAY DIRECT ESC/POS'
        });

        const res = await printThermalReceipt(selectedPrinter, testCommands);
        if (res.success) {
            setTestStatus('SUCCESS: Test receipt sent to thermal printer!');
        } else {
            setTestStatus(`FAILED: ${res.error || 'Could not send job to printer'}`);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: settings } = await supabase.from('restaurant_settings').select('id').limit(1).single();
            if (settings) {
                await supabase
                    .from('restaurant_settings')
                    .update({
                        printer_name: selectedPrinter,
                        use_browser_fallback: useFallback,
                        loyalty_enabled: loyaltyEnabled,
                        loyalty_points_per_rupee: pointsPerRupee,
                        loyalty_redemption_rate: redemptionRate
                    })
                    .eq('id', settings.id);
            }
            if (onSaved) onSaved(selectedPrinter, useFallback);
            onClose();
        } catch (e) {
            alert('Failed to save printer settings');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#C9974A]/30">
                {/* Header */}
                <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center text-[#F6EEDF]">
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <Printer className="w-5 h-5 text-[#C9974A]" />
                        <span>Thermal ESC/POS Printer Setup</span>
                    </div>
                    <button onClick={onClose} className="text-[#F6EEDF]/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 text-xs text-gray-700">
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="font-bold uppercase text-[10px] tracking-wide text-gray-500">
                                Discovered QZ Tray Printers
                            </label>
                            <button
                                onClick={refreshPrinters}
                                disabled={loadingPrinters}
                                className="flex items-center gap-1 text-[10px] text-[#4E1414] hover:underline font-bold"
                            >
                                <RefreshCw className={`w-3 h-3 ${loadingPrinters ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>

                        {printers.length > 0 ? (
                            <select
                                value={selectedPrinter}
                                onChange={e => setSelectedPrinter(e.target.value)}
                                className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl p-2.5 font-semibold text-xs text-gray-900 focus:outline-none"
                            >
                                {printers.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    <span>QZ Tray Service Not Detected</span>
                                </div>
                                <p className="text-[10px] leading-relaxed text-amber-800">
                                    Make sure the QZ Tray desktop app is running on this computer. You can also enter the printer name manually below:
                                </p>
                                <input
                                    type="text"
                                    placeholder="e.g. POS-80 or EPSON TM-T82"
                                    value={selectedPrinter}
                                    onChange={e => setSelectedPrinter(e.target.value)}
                                    className="w-full mt-2 bg-white border border-amber-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* Test Print Action */}
                    <div className="pt-1">
                        <button
                            onClick={handleTestPrint}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-900 font-bold rounded-xl transition-all"
                        >
                            <Send className="w-4 h-4 text-[#4E1414]" />
                            <span>Send ESC/POS Test Print Ticket</span>
                        </button>

                        {testStatus && (
                            <div className={`mt-2 p-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-2 ${
                                testStatus.startsWith('SUCCESS')
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : testStatus.startsWith('FAILED')
                                        ? 'bg-red-50 text-red-800 border border-red-200'
                                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}>
                                {testStatus.startsWith('SUCCESS') && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                                <span>{testStatus}</span>
                            </div>
                        )}
                    </div>

                    {/* Fallback Option */}
                    <div className="border-t pt-4">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useFallback}
                                onChange={e => setUseFallback(e.target.checked)}
                                className="w-4 h-4 rounded text-[#4E1414] focus:ring-[#C9974A]"
                            />
                            <div>
                                <span className="font-bold text-xs text-gray-900">Browser Print Fallback (`window.print()`)</span>
                                <p className="text-[10px] text-gray-500">Automatically open standard browser print popup if thermal printer disconnects</p>
                            </div>
                        </label>
                    </div>

                    {/* Customer Loyalty Program Configuration */}
                    <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-[#C9974A]" />
                                Customer Loyalty Program
                            </span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={loyaltyEnabled}
                                    onChange={e => setLoyaltyEnabled(e.target.checked)}
                                    className="w-4 h-4 rounded text-[#4E1414] focus:ring-[#C9974A]"
                                />
                                <span className="text-xs font-bold text-[#4E1414]">Enabled</span>
                            </label>
                        </div>

                        {loyaltyEnabled && (
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                                        Points per ₹1 Spent
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={pointsPerRupee}
                                        onChange={e => setPointsPerRupee(parseFloat(e.target.value) || 1)}
                                        className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl p-2 font-bold text-xs text-gray-900 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                                        ₹ Value per Point
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={redemptionRate}
                                        onChange={e => setRedemptionRate(parseFloat(e.target.value) || 0.5)}
                                        className="w-full bg-[#F6EEDF]/30 border border-[#C9974A]/40 rounded-xl p-2 font-bold text-xs text-gray-900 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-stone-50 px-6 py-3.5 border-t border-stone-200 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 text-xs font-bold bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] rounded-xl shadow transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
