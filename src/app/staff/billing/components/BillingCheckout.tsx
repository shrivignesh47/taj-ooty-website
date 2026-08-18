"use client";

import { useState, Dispatch, SetStateAction } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    Utensils, User, Minus, Plus, Banknote, CreditCard, QrCode, 
    Printer, Check, Loader2, Tag, Percent, X, Sparkles
} from 'lucide-react';
import { fmt } from './utils';
import { applyOrderItemDiscount } from '@/features/ordering/actions/adminActions';

import { TableView } from '../types';
import { CustomerLoyaltyData } from '@/features/ordering/actions/loyaltyActions';
import { ArrowRightLeft } from 'lucide-react';

const DISCOUNT_REASONS = ['Complimentary', 'Loyalty Discount', 'Manager Comp', 'Other'];

interface Props {
    selectedTable: TableView | null;
    setSelectedTable: (table: TableView | null) => void;
    isRegisterOpen: boolean;
    canSettleBills: boolean;
    paymentMethod: 'cash' | 'card' | 'upi' | 'split';
    setPaymentMethod: (method: 'cash' | 'card' | 'upi' | 'split') => void;
    submittingPayment: boolean;
    billPrinted: boolean;
    discountType: 'amt' | 'pct';
    setDiscountType: (type: 'amt' | 'pct') => void;
    discountValue: number;
    setDiscountValue: (val: number) => void;
    appliedCoupon: string;
    setAppliedCoupon: (coupon: string) => void;
    isSplitEnabled: boolean;
    setIsSplitEnabled: (split: boolean) => void;
    splitGuests: number;
    setSplitGuests: Dispatch<SetStateAction<number>>;
    isMultiTenderEnabled?: boolean;
    setIsMultiTenderEnabled?: (enabled: boolean) => void;
    multiTenderRows?: { method: 'cash' | 'card' | 'upi'; amount: number }[];
    setMultiTenderRows?: (rows: { method: 'cash' | 'card' | 'upi'; amount: number }[]) => void;
    pointsToRedeem?: number;
    setPointsToRedeem?: (pts: number) => void;
    customerLoyalty?: CustomerLoyaltyData | null;
    loyaltyToast?: string | null;
    settings: Record<string, any>;
    handlePrintBill: (table: TableView) => void;
    handleSettlePayment: (table: TableView) => void;
    getCheckoutCalculation: (table: TableView) => any;
    handleApplyCoupon: (code: string) => void;
    loadData?: () => Promise<void>;
    customerGstin?: string;
    setCustomerGstin?: (gstin: string) => void;
    tables?: TableView[];
    handleTransferTable?: (fromTableId: string, toTableId: string) => Promise<void>;
}

export function BillingCheckout({
    selectedTable,
    setSelectedTable,
    isRegisterOpen,
    canSettleBills,
    paymentMethod,
    setPaymentMethod,
    submittingPayment,
    billPrinted,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    appliedCoupon,
    setAppliedCoupon,
    isSplitEnabled,
    setIsSplitEnabled,
    splitGuests,
    setSplitGuests,
    isMultiTenderEnabled = false,
    setIsMultiTenderEnabled = () => {},
    multiTenderRows = [],
    setMultiTenderRows = () => {},
    pointsToRedeem = 0,
    setPointsToRedeem = () => {},
    customerLoyalty = null,
    loyaltyToast = null,
    settings = {},
    handlePrintBill,
    handleSettlePayment,
    getCheckoutCalculation,
    handleApplyCoupon,
    loadData,
    customerGstin = '',
    setCustomerGstin = () => {},
    tables = [],
    handleTransferTable = async () => {}
}: Props) {
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [itemDiscPct, setItemDiscPct] = useState<number>(10);
    const [itemDiscReason, setItemDiscReason] = useState<string>('Manager Comp');
    const [savingItemDisc, setSavingItemDisc] = useState<boolean>(false);
    const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
    const [targetTableId, setTargetTableId] = useState<string>('');

    const handleSaveItemDiscount = async (orderItemId: string) => {
        setSavingItemDisc(true);
        const res = await applyOrderItemDiscount(orderItemId, itemDiscPct, itemDiscReason);
        setSavingItemDisc(false);
        if (!res.success) {
            alert(res.error);
        } else {
            setEditingItemId(null);
            if (loadData) await loadData();
        }
    };

    return (
        <div className="bg-white border border-[#C9974A]/30 rounded-3xl p-5 shadow-sm space-y-5 min-h-[380px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
                {selectedTable ? (
                    <motion.div
                        key={selectedTable.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4 flex-1 flex flex-col justify-between"
                    >
                        <div className="space-y-4">
                            {/* Panel header */}
                            <div className="flex justify-between items-center pb-3 border-b border-[#C9974A]/25">
                                <div>
                                    <h3 className="font-bold text-sm text-[#4E1414]">Table T-{selectedTable.table_no} Checkout</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Active Order Billing</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTable(null)}
                                    className="text-xs text-[#C9974A] hover:text-[#4E1414] font-bold"
                                >
                                    Dismiss
                                </button>
                            </div>

                            {/* Customer information & GSTIN */}
                            <div className="bg-[#F6EEDF]/40 border border-[#C9974A]/20 rounded-2xl p-3 text-[11px] space-y-2">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-[#4E1414]">
                                        Guest Profile: <span className="font-bold">{selectedTable.customer_name ?? 'Walk-in'}</span>
                                    </p>
                                    {selectedTable.table_no !== 0 && (
                                        <button
                                            onClick={() => setShowTransferModal(true)}
                                            className="px-2 py-0.5 bg-[#4E1414]/10 text-[#4E1414] hover:bg-[#4E1414]/20 rounded font-bold text-[9px] flex items-center gap-1 cursor-pointer"
                                        >
                                            <ArrowRightLeft className="w-2.5 h-2.5 text-[#C9974A]" /> Move Table
                                        </button>
                                    )}
                                </div>
                                {selectedTable.customer_phone && (
                                    <p className="text-gray-500 flex justify-between">
                                        <span>Phone:</span>
                                        <span>{selectedTable.customer_phone}</span>
                                    </p>
                                )}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#C9974A]/15">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Customer GSTIN:</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. 33AAAAA0000A1Z5"
                                        value={customerGstin}
                                        onChange={e => setCustomerGstin(e.target.value.toUpperCase())}
                                        className="w-36 bg-white border border-[#C9974A]/30 rounded px-2 py-0.5 text-[10px] font-mono font-bold focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Order Items Breakdown with Item-Level Discount Trigger */}
                            <div className="bg-[#F6EEDF]/20 border border-[#C9974A]/20 rounded-2xl p-3 space-y-2">
                                <p className="text-[10px] uppercase font-bold tracking-wider text-[#C9974A]">Order Line Items</p>
                                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 taj-scrollbar-dark">
                                    {selectedTable.orders?.flatMap((o: any) => o.order_items || []).map((item: any) => {
                                        const hasDisc = item.discount_percent && Number(item.discount_percent) > 0;
                                        const origPrice = item.price_at_order * item.qty;
                                        const finalPrice = origPrice * (1 - (Number(item.discount_percent || 0) / 100));
                                        const isEditing = editingItemId === item.id;

                                        return (
                                            <div key={item.id} className="bg-white border border-[#C9974A]/15 rounded-xl p-2.5 space-y-1 text-xs">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-bold text-[#4E1414]">{item.menu_items?.name ?? 'Item'}</span>
                                                            <span className="text-[10px] text-gray-400">×{item.qty}</span>
                                                            {hasDisc && (
                                                                <span className="bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                                                    <Tag className="w-2.5 h-2.5" />
                                                                    {item.discount_percent}% off ({item.discount_reason || 'Comp'})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="text-right">
                                                            {hasDisc ? (
                                                                <div>
                                                                    <span className="line-through text-gray-400 text-[10px] mr-1">₹{origPrice.toFixed(0)}</span>
                                                                    <span className="font-black text-green-700">₹{finalPrice.toFixed(0)}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="font-bold text-[#4E1414]">₹{origPrice.toFixed(0)}</span>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                if (isEditing) {
                                                                    setEditingItemId(null);
                                                                } else {
                                                                    setEditingItemId(item.id);
                                                                    setItemDiscPct(Number(item.discount_percent || 10));
                                                                    setItemDiscReason(item.discount_reason || 'Manager Comp');
                                                                }
                                                            }}
                                                            title="Apply Item Discount"
                                                            className="p-1 text-[#C9974A] hover:text-[#4E1414] hover:bg-[#F6EEDF] rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            <Percent className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Inline Popover for Discount Input */}
                                                {isEditing && (
                                                    <div className="mt-2 pt-2 border-t border-[#C9974A]/20 bg-[#F6EEDF]/40 p-2 rounded-lg space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-bold text-[#4E1414] uppercase">Item Discount Config</span>
                                                            <button onClick={() => setEditingItemId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Discount %</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={itemDiscPct}
                                                                    onChange={e => setItemDiscPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                                                    className="w-full bg-white border border-[#C9974A]/30 rounded-lg px-2 py-1 text-xs font-bold text-[#4E1414] focus:outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Reason</label>
                                                                <select
                                                                    value={itemDiscReason}
                                                                    onChange={e => setItemDiscReason(e.target.value)}
                                                                    className="w-full bg-white border border-[#C9974A]/30 rounded-lg px-1.5 py-1 text-xs font-bold text-[#4E1414] focus:outline-none cursor-pointer"
                                                                >
                                                                    {DISCOUNT_REASONS.map(r => (
                                                                        <option key={r} value={r}>{r}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleSaveItemDiscount(item.id)}
                                                                disabled={savingItemDisc}
                                                                className="w-full bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold py-1 px-3 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                                            >
                                                                {savingItemDisc ? <Loader2 className="w-3 h-3 animate-spin text-[#C9974A]" /> : <Check className="w-3 h-3 text-[#C9974A]" />}
                                                                Apply Item Discount
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Coupon Discount block */}
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-[#C9974A] mb-1.5">Apply Special Promo Offer</p>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Enter Promo Code (e.g. TAJ10)"
                                        value={appliedCoupon}
                                        onChange={e => setAppliedCoupon(e.target.value.toUpperCase())}
                                        className="flex-1 font-mono font-bold text-xs px-3 py-2 border rounded-xl border-[#C9974A]/40 uppercase bg-[#F6EEDF]/20 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleApplyCoupon(appliedCoupon)}
                                        className="px-4 py-2 bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold text-xs rounded-xl"
                                    >
                                        Apply
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1 flex bg-[#F6EEDF]/20 border border-[#C9974A]/40 rounded-xl overflow-hidden">
                                        <input
                                            type="number"
                                            value={discountValue || ''}
                                            onChange={e => {
                                                setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0));
                                                setAppliedCoupon('');
                                            }}
                                            placeholder="Manual Value"
                                            className="w-full bg-transparent px-3 py-2 text-xs focus:outline-none"
                                        />
                                        <select
                                            value={discountType}
                                            onChange={e => setDiscountType(e.target.value as 'amt' | 'pct')}
                                            className="bg-transparent border-l border-[#C9974A]/40 px-2 text-xs font-bold text-[#4E1414] focus:outline-none cursor-pointer"
                                        >
                                            <option value="amt">₹</option>
                                            <option value="pct">%</option>
                                        </select>
                                    </div>
                                    {(discountValue > 0 || appliedCoupon) && (
                                        <button
                                            onClick={() => { setDiscountValue(0); setAppliedCoupon(''); }}
                                            className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {/* Customer Loyalty Card */}
                                {selectedTable?.customer_phone && (
                                    <div className="mt-3 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold">
                                            <span className="flex items-center gap-1.5 text-[#4E1414]">
                                                <Sparkles className="w-3.5 h-3.5 text-[#C9974A]" />
                                                Customer Loyalty
                                            </span>
                                            {customerLoyalty ? (
                                                <span className="bg-[#4E1414] text-[#F6EEDF] px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                                                    {customerLoyalty.points_balance} pts (₹{(customerLoyalty.points_balance * (settings.loyalty_redemption_rate || 0.5)).toFixed(2)})
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-amber-700 font-semibold italic">New Customer</span>
                                            )}
                                        </div>

                                        {customerLoyalty && customerLoyalty.points_balance > 0 ? (
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={customerLoyalty.points_balance}
                                                    value={pointsToRedeem || ''}
                                                    onChange={e => {
                                                        const val = Math.min(customerLoyalty.points_balance, Math.max(0, parseInt(e.target.value) || 0));
                                                        setPointsToRedeem(val);
                                                    }}
                                                    placeholder="Points to redeem"
                                                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setPointsToRedeem(customerLoyalty.points_balance)}
                                                    className="px-2.5 py-1 bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold text-[10px] rounded-lg shrink-0"
                                                >
                                                    Max
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-amber-800 leading-snug font-medium">
                                                {customerLoyalty
                                                    ? '0 points available — earn points on this order!'
                                                    : 'New customer — start earning points from this order!'}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {loyaltyToast && (
                                    <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>{loyaltyToast}</span>
                                    </div>
                                )}
                            </div>

                            {/* Split bill selector */}
                            <div className="bg-[#F6EEDF]/20 border border-[#C9974A]/20 rounded-2xl p-3.5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#4E1414]">
                                        <User className="w-4 h-4 text-[#C9974A]" /> Split Settlement
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isSplitEnabled}
                                        onChange={e => setIsSplitEnabled(e.target.checked)}
                                        className="rounded border-[#C9974A]/40 text-[#4E1414] focus:ring-0"
                                    />
                                </div>
                                {isSplitEnabled && (
                                    <div className="flex items-center justify-between text-xs">
                                        <span>Number of Guests:</span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setSplitGuests(prev => Math.max(2, prev - 1))} className="p-1 bg-white border border-[#C9974A]/30 rounded"><Minus className="w-3 h-3" /></button>
                                            <span className="font-bold">{splitGuests}</span>
                                            <button onClick={() => setSplitGuests(prev => prev + 1)} className="p-1 bg-white border border-[#C9974A]/30 rounded"><Plus className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Settle Calculations block (Indian CGST + SGST split breakdown) */}
                            {(() => {
                                const { subtotal, discountAmt, taxableAmount, cgst, sgst, service, grand } = getCheckoutCalculation(selectedTable);
                                return (
                                    <div className="bg-[#F6EEDF]/40 border border-[#C9974A]/30 rounded-2xl p-4 space-y-1.5 text-xs">
                                        <div className="flex justify-between text-[#4E1414]/70">
                                            <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
                                        </div>
                                        {discountAmt > 0 && (
                                            <div className="flex justify-between text-green-700 font-bold">
                                                <span>Discount applied</span><span>−₹{discountAmt.toFixed(0)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-[#4E1414]/70 border-b border-[#C9974A]/10 pb-1.5 mb-1">
                                            <span>Taxable Amount</span><span>₹{taxableAmount.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between text-[#4E1414]/70">
                                            <span>CGST ({(settings.gstRate / 2)}%)</span>
                                            <span>₹{cgst.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between text-[#4E1414]/70">
                                            <span>SGST ({(settings.gstRate / 2)}%)</span>
                                            <span>₹{sgst.toFixed(0)}</span>
                                        </div>
                                        {isSplitEnabled && (
                                            <div className="flex justify-between text-xs text-blue-700 font-bold border-t border-[#C9974A]/10 pt-1.5 mt-1">
                                                <span>Per Guest Share ({splitGuests} pax)</span>
                                                <span>{fmt(grand / splitGuests)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-black text-base text-[#4E1414] border-t border-[#C9974A]/30 pt-2.5 mt-2">
                                            <span className="text-[#C9974A] font-bold uppercase tracking-wide">Grand Total</span>
                                            <span className="text-lg">{fmt(grand)}</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Pay Method selection / Multi-Tender Breakdown */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-[#C9974A]">Settlement Channel</p>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#4E1414]">
                                        <input
                                            type="checkbox"
                                            checked={isMultiTenderEnabled}
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                setIsMultiTenderEnabled(checked);
                                                if (checked && selectedTable) {
                                                    const { grand } = getCheckoutCalculation(selectedTable);
                                                    const half = Math.round(grand / 2);
                                                    setMultiTenderRows([
                                                        { method: 'cash', amount: half },
                                                        { method: 'upi', amount: grand - half }
                                                    ]);
                                                }
                                            }}
                                            className="rounded border-[#C9974A]/40 text-[#4E1414] focus:ring-0"
                                        />
                                        <span>Multi-Tender Split Payment</span>
                                    </label>
                                </div>

                                {!isMultiTenderEnabled ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { key: 'cash', label: 'CASH', icon: Banknote },
                                            { key: 'card', label: 'CARD', icon: CreditCard },
                                            { key: 'upi', label: 'UPI', icon: QrCode },
                                        ].map(({ key, label, icon: Icon }) => (
                                            <button
                                                key={key}
                                                onClick={() => setPaymentMethod(key as 'cash' | 'card' | 'upi')}
                                                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border font-bold text-[9px] transition-all
                                                    ${paymentMethod === key
                                                        ? 'border-[#C9974A] bg-[#C9974A]/10 text-[#4E1414]'
                                                        : 'border-gray-200 text-gray-400 bg-white hover:border-[#C9974A]/40 hover:text-[#4E1414]'}`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2 bg-stone-50 border border-[#C9974A]/30 rounded-2xl p-3">
                                        <p className="text-[10px] font-bold text-stone-500 uppercase">Enter Amounts per Payment Method</p>
                                        {multiTenderRows.map((row, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <select
                                                    value={row.method}
                                                    onChange={e => {
                                                        const newRows = [...multiTenderRows];
                                                        newRows[idx].method = e.target.value as 'cash' | 'card' | 'upi';
                                                        setMultiTenderRows(newRows);
                                                    }}
                                                    className="text-xs font-bold p-2 border rounded-xl border-stone-300 bg-white"
                                                >
                                                    <option value="cash">CASH</option>
                                                    <option value="card">CARD</option>
                                                    <option value="upi">UPI</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={row.amount || ''}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const newRows = [...multiTenderRows];
                                                        newRows[idx].amount = val;
                                                        setMultiTenderRows(newRows);
                                                    }}
                                                    placeholder="Amount (₹)"
                                                    className="flex-1 text-xs font-bold p-2 border rounded-xl border-stone-300 bg-white"
                                                />
                                                {multiTenderRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setMultiTenderRows(multiTenderRows.filter((_, i) => i !== idx))}
                                                        className="p-1 text-stone-400 hover:text-red-600"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {multiTenderRows.length < 3 && (
                                            <button
                                                type="button"
                                                onClick={() => setMultiTenderRows([...multiTenderRows, { method: 'card', amount: 0 }])}
                                                className="text-[10px] font-bold text-[#C9974A] hover:underline flex items-center gap-1"
                                            >
                                                + Add another payment method
                                            </button>
                                        )}

                                        {(() => {
                                            const { grand } = getCheckoutCalculation(selectedTable);
                                            const totalPaid = multiTenderRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                                            const remaining = grand - totalPaid;
                                            return (
                                                <div className={`p-2 rounded-xl text-xs font-bold flex justify-between ${
                                                    Math.abs(remaining) < 0.05 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
                                                }`}>
                                                    <span>Total Paid: ₹{totalPaid.toFixed(0)}</span>
                                                    <span>
                                                        {Math.abs(remaining) < 0.05 ? '✓ Balanced' : `Remaining: ₹${remaining.toFixed(0)}`}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bill action actions */}
                        <div className="flex gap-2 pt-4">
                            <button
                                onClick={() => handlePrintBill(selectedTable)}
                                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[#C9974A]/40 text-[#4E1414] hover:bg-[#F6EEDF]/40 font-bold text-xs transition-all whitespace-nowrap"
                            >
                                <Printer className="w-4 h-4" />
                                {billPrinted ? 'Printed' : 'Print Invoice'}
                            </button>
                            <button
                                onClick={() => handleSettlePayment(selectedTable)}
                                disabled={submittingPayment}
                                className="flex-1 flex items-center justify-center gap-2 bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-xs shadow-lg shadow-[#4E1414]/10 cursor-pointer"
                            >
                                {submittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                SETTLE BILL ({paymentMethod.toUpperCase()})
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                        <Utensils className="w-10 h-10 text-[#C9974A]/40" />
                        <p className="font-bold text-sm text-[#4E1414]">No Table Selected</p>
                        <p className="text-xs text-gray-400 max-w-xs">Select any occupied table from the floor map or express counter to load checkout items.</p>
                    </div>
                )}
            </AnimatePresence>

            {/* Transfer Table Modal */}
            {showTransferModal && selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl border border-[#C9974A]/40 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h4 className="font-bold text-sm text-[#4E1414] flex items-center gap-1.5">
                                <ArrowRightLeft className="w-4 h-4 text-[#C9974A]" /> Transfer Table T-{selectedTable.table_no}
                            </h4>
                            <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-black">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">Select an empty destination table to transfer all active orders for this table.</p>
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Target Empty Table</label>
                            <select
                                value={targetTableId}
                                onChange={e => setTargetTableId(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                            >
                                <option value="">-- Select Empty Table --</option>
                                {tables.filter(t => t.status === 'Empty' && t.id !== selectedTable.id).map(t => (
                                    <option key={t.id} value={t.id}>Table T-{t.table_no}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setShowTransferModal(false)}
                                className="flex-1 py-2 rounded-xl border border-stone-200 text-xs font-bold text-gray-600 hover:bg-stone-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!targetTableId) { alert('Select a destination table'); return; }
                                    await handleTransferTable(selectedTable.id, targetTableId);
                                    setShowTransferModal(false);
                                }}
                                disabled={!targetTableId}
                                className="flex-1 py-2 rounded-xl bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] text-xs font-bold disabled:opacity-40 cursor-pointer"
                            >
                                Confirm Move
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
