"use client";

import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle2, FileSpreadsheet, Plus, Trash } from 'lucide-react';
import { supabase } from '@/features/ordering/lib/supabase';
import * as XLSX from 'xlsx';

const INDIAN_STATES = [
    { code: '01', name: 'Jammu & Kashmir' },
    { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' },
    { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' },
    { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' },
    { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh' },
    { code: '10', name: 'Bihar' },
    { code: '11', name: 'Sikkim' },
    { code: '12', name: 'Arunachal Pradesh' },
    { code: '13', name: 'Nagaland' },
    { code: '14', name: 'Manipur' },
    { code: '15', name: 'Mizoram' },
    { code: '16', name: 'Tripura' },
    { code: '17', name: 'Meghalaya' },
    { code: '18', name: 'Assam' },
    { code: '19', name: 'West Bengal' },
    { code: '20', name: 'Jharkhand' },
    { code: '21', name: 'Odisha' },
    { code: '22', name: 'Chhattisgarh' },
    { code: '23', name: 'Madhya Pradesh' },
    { code: '24', name: 'Gujarat' },
    { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
    { code: '27', name: 'Maharashtra' },
    { code: '29', name: 'Karnataka' },
    { code: '30', name: 'Goa' },
    { code: '31', name: 'Lakshadweep' },
    { code: '32', name: 'Kerala' },
    { code: '33', name: 'Tamil Nadu' },
    { code: '34', name: 'Puducherry' },
    { code: '35', name: 'Andaman & Nicobar Islands' },
    { code: '36', name: 'Telangana' },
    { code: '37', name: 'Andhra Pradesh' },
    { code: '38', name: 'Ladakh' }
];

export function AdminGSTConfig() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settingsId, setSettingsId] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form inputs
    const [legalName, setLegalName] = useState('Hotel Taj Ooty');
    const [tradeName, setTradeName] = useState('Hotel Taj');
    const [gstin, setGstin] = useState('');
    const [taxScheme, setTaxScheme] = useState('Regular Scheme (5% GST No ITC)');
    const [regState, setRegState] = useState('Tamil Nadu');
    const [hsnCode, setHsnCode] = useState('996331');
    const [enableEcomRules, setEnableEcomRules] = useState(false);
    const [pricingStrategy, setPricingStrategy] = useState('exclusive');
    const [printGstin, setPrintGstin] = useState(true);
    const [printCgstSgst, setPrintCgstSgst] = useState(true);
    const [printHsn, setPrintHsn] = useState(true);
    const [printCustGstin, setPrintCustGstin] = useState(true);
    
    // Aggregator tax table
    const [aggregators, setAggregators] = useState<any[]>([
        { name: 'Swiggy', gstin: '', liability: 'Aggregator Pays (Sec 9(5))', prefix: 'SWG-' },
        { name: 'Zomato', gstin: '', liability: 'Aggregator Pays (Sec 9(5))', prefix: 'ZOM-' },
        { name: 'Direct Delivery', gstin: 'N/A', liability: 'Restaurant Pays', prefix: 'DEL-' }
    ]);

    // GSTR-1 Exporter States
    const [exportMonth, setExportMonth] = useState('07');
    const [exportYear, setExportYear] = useState('2026');
    const [exporting, setExporting] = useState(false);

    // Validation state
    const [gstinValid, setGstinValid] = useState(true);

    const validateGSTIN = (val: string) => {
        if (!val) return true;
        const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return regex.test(val);
    };

    useEffect(() => {
        async function loadGstSettings() {
            const { data, error } = await supabase
                .from('restaurant_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setSettingsId(data.id);
                setLegalName(data.legal_business_name || 'Hotel Taj Ooty');
                setTradeName(data.trade_name || 'Hotel Taj');
                setGstin(data.gstin || '');
                setTaxScheme(data.tax_scheme || 'Regular Scheme (5% GST No ITC)');
                setRegState(data.registration_state || 'Tamil Nadu');
                setHsnCode(data.default_hsn_code || '996331');
                setEnableEcomRules(data.enable_ecommerce_tax ?? false);
                setPricingStrategy(data.pricing_strategy || 'exclusive');
                setPrintGstin(data.print_gstin_bill ?? true);
                setPrintCgstSgst(data.print_cgst_sgst_split ?? true);
                setPrintHsn(data.print_hsn_items ?? true);
                setPrintCustGstin(data.print_customer_gstin ?? true);
                if (data.aggregator_mappings) {
                    setAggregators(data.aggregator_mappings);
                }
            }
            setLoading(false);
        }
        loadGstSettings();
    }, []);

    const handleSave = async () => {
        const isGstValid = validateGSTIN(gstin);
        setGstinValid(isGstValid);
        if (!isGstValid) {
            setMsg({ type: 'error', text: 'Invalid GSTIN Format. Must match 15-character alphanumeric patterns.' });
            return;
        }

        setSaving(true);
        setMsg(null);

        const payload = {
            legal_business_name: legalName,
            trade_name: tradeName,
            gstin: gstin.toUpperCase(),
            tax_scheme: taxScheme,
            registration_state: regState,
            default_hsn_code: hsnCode,
            enable_ecommerce_tax: enableEcomRules,
            pricing_strategy: pricingStrategy,
            print_gstin_bill: printGstin,
            print_cgst_sgst_split: printCgstSgst,
            print_hsn_items: printHsn,
            print_customer_gstin: printCustGstin,
            aggregator_mappings: aggregators
        };

        const { error } = settingsId 
            ? await supabase.from('restaurant_settings').update(payload).eq('id', settingsId)
            : await supabase.from('restaurant_settings').insert(payload);

        setSaving(false);
        if (error) {
            setMsg({ type: 'error', text: `Failed to save settings: ${error.message}` });
        } else {
            setMsg({ type: 'success', text: 'GST settings and compliance rules updated successfully!' });
        }
    };

    const handleUpdateAggregator = (index: number, key: string, val: string) => {
        setAggregators(prev => prev.map((a, idx) => idx === index ? { ...a, [key]: val } : a));
    };

    const handleExportGSTR1 = async () => {
        setExporting(true);
        try {
            // Fetch billed orders for chosen month/year
            const startStr = `${exportYear}-${exportMonth}-01T00:00:00Z`;
            // Get end of month
            const lastDay = new Date(Number(exportYear), Number(exportMonth), 0).getDate();
            const endStr = `${exportYear}-${exportMonth}-${lastDay}T23:59:59Z`;

            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    id, created_at, customer_name, source, token_no, status,
                    order_items (qty, price_at_order)
                `)
                .eq('status', 'billed')
                .gte('created_at', startStr)
                .lte('created_at', endStr);

            if (error) throw error;

            if (!orders || orders.length === 0) {
                alert('No settled bills found for the selected month.');
                setExporting(false);
                return;
            }

            const stateObj = INDIAN_STATES.find(s => s.name === regState);
            const statePrefix = stateObj ? stateObj.code : '33';

            const records = orders.map((o: any, idx) => {
                const subtotal = o.order_items.reduce((acc: number, i: any) => acc + (i.price_at_order * i.qty), 0);
                
                // Pricing calculations
                const rate = taxScheme.includes('18%') ? 18 : 5;
                let grossTaxable = subtotal;
                let cgst = 0;
                let sgst = 0;

                if (pricingStrategy === 'inclusive') {
                    grossTaxable = subtotal / (1 + (rate / 100));
                }
                
                const taxAmount = grossTaxable * (rate / 100);
                cgst = taxAmount / 2;
                sgst = taxAmount / 2;

                // Match aggregator settings
                const sourceStr = o.source || 'dine_in';
                const agg = aggregators.find(a => a.name.toLowerCase() === sourceStr.toLowerCase());
                const prefix = agg?.prefix || '';
                const invoiceNo = `${prefix}TX-${o.id.substring(0, 4).toUpperCase()}`;

                const ecomGstin = (sourceStr === 'swiggy' || sourceStr === 'zomato') 
                    ? (agg?.gstin || 'Pending Configuration') 
                    : '';

                // GSTR-1 tag
                const gstrTag = (sourceStr === 'swiggy' || sourceStr === 'zomato')
                    ? 'Section 14 E-commerce'
                    : 'Section 7 B2C';

                return {
                    'Invoice Date': new Date(o.created_at).toLocaleDateString('en-IN'),
                    'Invoice Number': invoiceNo,
                    'Place of Supply (POS)': `${statePrefix} - ${regState}`,
                    'Supply Type': 'Intra-State',
                    'Gross Taxable Value': Number(grossTaxable.toFixed(2)),
                    'CGST Amount': Number(cgst.toFixed(2)),
                    'SGST Amount': Number(sgst.toFixed(2)),
                    'E-Commerce GSTIN': ecomGstin,
                    'GSTR-1 Section Tag': gstrTag
                };
            });

            // Write to Excel
            const worksheet = XLSX.utils.json_to_sheet(records);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'GSTR-1 Details');
            
            // Apply widths
            worksheet['!cols'] = [
                { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 15 },
                { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }
            ];

            XLSX.writeFile(workbook, `GSTR1_Report_${exportMonth}_${exportYear}.xlsx`);
        } catch (e: any) {
            alert(`Export failed: ${e.message}`);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9974A]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                <div>
                    <h2 className="text-xl font-black text-[#4E1414] tracking-wide flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[#C9974A]" /> GST Config & Aggregator Compliance
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold mt-1">
                        Configure business profile registration, HSN codes, and generate exportable GSTR-1 logs.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#C9974A] hover:bg-[#b08137] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow active:scale-95 cursor-pointer disabled:opacity-50"
                >
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {/* Alert messages */}
            {msg && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-xs font-bold border
                    ${msg.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{msg.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section A: Business Profile & Tax Registration */}
                <div className="bg-white border border-[#C9974A]/20 rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="font-extrabold text-sm text-[#4E1414] border-b border-gray-100 pb-2">
                        Section A: Profile & Tax Registration
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Legal Name</label>
                            <input
                                type="text"
                                value={legalName}
                                onChange={e => setLegalName(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#241B15] focus:bg-white outline-none focus:border-[#C9974A]"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Trade Name</label>
                            <input
                                type="text"
                                value={tradeName}
                                onChange={e => setTradeName(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#241B15] focus:bg-white outline-none focus:border-[#C9974A]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GSTIN Number</label>
                        <input
                            type="text"
                            value={gstin}
                            onChange={e => {
                                setGstin(e.target.value);
                                setGstinValid(true);
                            }}
                            placeholder="33AAAAA1111A1Z1"
                            className={`w-full bg-gray-50 border rounded-xl px-3 py-2 text-xs font-bold text-[#241B15] focus:bg-white outline-none focus:border-[#C9974A] uppercase
                                ${gstinValid ? 'border-gray-200' : 'border-red-500 bg-red-50'}`}
                        />
                        {!gstinValid && <p className="text-[9px] text-red-500 font-bold mt-1">Invalid Format (Format: 2 Digit State, 10 Alpha-Numeric, 3 Alpha-Numeric)</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Scheme</label>
                            <select
                                value={taxScheme}
                                onChange={e => setTaxScheme(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#241B15] focus:bg-white outline-none"
                            >
                                <option>Regular Scheme (5% GST No ITC)</option>
                                <option>Regular Scheme (18% GST with ITC)</option>
                                <option>Composition Scheme</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">State Prefix Code</label>
                            <select
                                value={regState}
                                onChange={e => setRegState(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#241B15] focus:bg-white outline-none"
                            >
                                {INDIAN_STATES.map(s => (
                                    <option key={s.code} value={s.name}>{s.code} - {s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section B: Tax Component & HSN/SAC Mapping */}
                <div className="bg-white border border-[#C9974A]/20 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                        <h3 className="font-extrabold text-sm text-[#4E1414] border-b border-gray-100 pb-2 mb-3">
                            Section B: Tax Component & HSN Mapping
                        </h3>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Default HSN/SAC Code</label>
                            <input
                                type="text"
                                value={hsnCode}
                                onChange={e => setHsnCode(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#241B15] focus:bg-white outline-none focus:border-[#C9974A]"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">
                            Tax Breakdown Matrix
                        </span>
                        <div className="space-y-2 text-[10px] font-bold text-gray-600">
                            <div className="flex justify-between pb-1.5 border-b border-gray-200">
                                <span>Intra-State Sales (POS: {regState})</span>
                                <span className="text-[#4E1414]">CGST (50%) + SGST (50%)</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Inter-State Sales (POS: Other State)</span>
                                <span className="text-[#4E1414]">IGST (100% Tax)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section C: E-Commerce / Aggregator Settings */}
            <div className="bg-white border border-[#C9974A]/20 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <h3 className="font-extrabold text-sm text-[#4E1414]">
                        Section C: Aggregator Settings (Sec 9(5) Compliance)
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">Enable Aggregator Compliance</span>
                        <button
                            onClick={() => setEnableEcomRules(!enableEcomRules)}
                            className={`w-9 h-5 rounded-full transition-all relative cursor-pointer
                                ${enableEcomRules ? 'bg-[#C9974A]' : 'bg-gray-200'}`}
                        >
                            <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-xs
                                ${enableEcomRules ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                    </div>
                </div>

                {enableEcomRules && (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[9px] tracking-wider">
                                    <th className="py-2.5 px-3">Platform</th>
                                    <th className="py-2.5 px-3">GSTIN of Aggregator</th>
                                    <th className="py-2.5 px-3">Tax Liability</th>
                                    <th className="py-2.5 px-3">Invoice Prefix</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                                {aggregators.map((agg, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2 px-3 font-extrabold text-[#4E1414]">{agg.name}</td>
                                        <td className="py-2 px-3">
                                            <input
                                                type="text"
                                                value={agg.gstin}
                                                onChange={e => handleUpdateAggregator(idx, 'gstin', e.target.value)}
                                                placeholder="Enter Aggregator GSTIN"
                                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none w-full"
                                            />
                                        </td>
                                        <td className="py-2 px-3">
                                            <select
                                                value={agg.liability}
                                                onChange={e => handleUpdateAggregator(idx, 'liability', e.target.value)}
                                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none w-full"
                                            >
                                                <option>Aggregator Pays (Sec 9(5))</option>
                                                <option>Restaurant Pays</option>
                                            </select>
                                        </td>
                                        <td className="py-2 px-3">
                                            <input
                                                type="text"
                                                value={agg.prefix}
                                                onChange={e => handleUpdateAggregator(idx, 'prefix', e.target.value)}
                                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none w-full"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Section D: Invoice & Billing Display Preferences */}
            <div className="bg-white border border-[#C9974A]/20 rounded-2xl p-5 shadow-xs space-y-5">
                <h3 className="font-extrabold text-sm text-[#4E1414] border-b border-gray-100 pb-2">
                    Section D: Invoice & Receipt Display Preferences
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pricing Strategy */}
                    <div className="space-y-2">
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Pricing Strategy</span>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#4E1414]">
                                <input
                                    type="radio"
                                    name="pricing_strategy"
                                    value="exclusive"
                                    checked={pricingStrategy === 'exclusive'}
                                    onChange={() => setPricingStrategy('exclusive')}
                                    className="accent-[#C9974A]"
                                />
                                Tax-Exclusive (+5% GST at checkout)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#4E1414]">
                                <input
                                    type="radio"
                                    name="pricing_strategy"
                                    value="inclusive"
                                    checked={pricingStrategy === 'inclusive'}
                                    onChange={() => setPricingStrategy('inclusive')}
                                    className="accent-[#C9974A]"
                                />
                                Tax-Inclusive (GST included in menu prices)
                            </label>
                        </div>
                    </div>

                    {/* Receipt Configurations */}
                    <div className="space-y-3">
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Receipt Elements</span>
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-600">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={printGstin}
                                    onChange={e => setPrintGstin(e.target.checked)}
                                    className="accent-[#C9974A] rounded"
                                />
                                Print GSTIN on Bill
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={printCgstSgst}
                                    onChange={e => setPrintCgstSgst(e.target.checked)}
                                    className="accent-[#C9974A] rounded"
                                />
                                Print CGST/SGST Split
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={printHsn}
                                    onChange={e => setPrintHsn(e.target.checked)}
                                    className="accent-[#C9974A] rounded"
                                />
                                Print HSN next to items
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={printCustGstin}
                                    onChange={e => setPrintCustGstin(e.target.checked)}
                                    className="accent-[#C9974A] rounded"
                                />
                                Print Customer GSTIN (B2B)
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Export GSTR-1 Reporting Card */}
            <div className="bg-[#4E1414] border border-[#C9974A]/30 rounded-2xl p-6 shadow-md text-[#F6EEDF] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h3 className="font-black text-base flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-[#C9974A]" /> Export GSTR-1 Monthly Report
                    </h3>
                    <p className="text-xs text-[#F6EEDF]/75 font-semibold">
                        Generate audit-ready spreadsheets containing Place of Supply (POS), gross taxable values, CGST/SGST tax split, and Section 14 Aggregator tagging.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={exportMonth}
                        onChange={e => setExportMonth(e.target.value)}
                        className="bg-[#1a0a0a] text-white border border-[#C9974A]/30 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    >
                        <option value="01">Jan</option>
                        <option value="02">Feb</option>
                        <option value="03">Mar</option>
                        <option value="04">Apr</option>
                        <option value="05">May</option>
                        <option value="06">Jun</option>
                        <option value="07">Jul</option>
                        <option value="08">Aug</option>
                        <option value="09">Sep</option>
                        <option value="10">Oct</option>
                        <option value="11">Nov</option>
                        <option value="12">Dec</option>
                    </select>

                    <select
                        value={exportYear}
                        onChange={e => setExportYear(e.target.value)}
                        className="bg-[#1a0a0a] text-white border border-[#C9974A]/30 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    >
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                    </select>

                    <button
                        onClick={handleExportGSTR1}
                        disabled={exporting}
                        className="bg-[#C9974A] hover:bg-[#b08137] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
                    >
                        {exporting ? 'Exporting...' : 'Export Excel'}
                    </button>
                </div>
            </div>
        </div>
    );
}
