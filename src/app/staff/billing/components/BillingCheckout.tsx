"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { 
    Utensils, User, Minus, Plus, Banknote, CreditCard, QrCode, 
    Printer, Check, Loader2 
} from 'lucide-react';
import { fmt } from './utils';

const PRESET_COUPONS = [
    { code: 'TAJ10', type: 'pct', value: 10, description: '10% Restaurant Special' },
    { code: 'WELCOME50', type: 'amt', value: 50, description: '₹50 Flat Welcome Discount' },
    { code: 'FESTIVE15', type: 'pct', value: 15, description: '15% Festive Occasion Discount' },
    { code: 'VIP200', type: 'amt', value: 200, description: '₹200 Flat VIP Discount' }
];

interface Props {
    selectedTable: any;
    setSelectedTable: (table: any) => void;
    isRegisterOpen: boolean;
    canSettleBills: boolean;
    paymentMethod: 'cash' | 'card' | 'upi';
    setPaymentMethod: (method: 'cash' | 'card' | 'upi') => void;
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
    setSplitGuests: (guests: number | ((prev: number) => number)) => void;
    settings: any;
    handlePrintBill: (table: any) => void;
    handleSettlePayment: (table: any) => void;
    getCheckoutCalculation: (table: any) => any;
    handleApplyCoupon: (code: string) => void;
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
    settings,
    handlePrintBill,
    handleSettlePayment,
    getCheckoutCalculation,
    handleApplyCoupon
}: Props) {
    return (
        <div className="lg:col-span-4 bg-white border border-[#C9974A]/30 rounded-3xl p-5 shadow-sm sticky top-24 self-start space-y-5 min-h-[500px] flex flex-col justify-between">
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

                            {/* Customer information */}
                            <div className="bg-[#F6EEDF]/40 border border-[#C9974A]/20 rounded-2xl p-3 text-[11px] space-y-1">
                                <p className="font-semibold flex justify-between">
                                    <span>Guest Profile:</span>
                                    <span className="text-[#4E1414] font-bold">{selectedTable.customer_name ?? 'Walk-in'}</span>
                                </p>
                                {selectedTable.customer_phone && (
                                    <p className="text-gray-400 flex justify-between">
                                        <span>Phone Number:</span>
                                        <span>{selectedTable.customer_phone}</span>
                                    </p>
                                )}
                            </div>

                            {/* Coupon Discount block */}
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-[#C9974A] mb-1.5">Apply Special Promo Offer</p>
                                <div className="grid grid-cols-2 gap-1.5 mb-2">
                                    {PRESET_COUPONS.map(c => (
                                        <button
                                            key={c.code}
                                            onClick={() => handleApplyCoupon(c.code)}
                                            className={`py-1.5 px-2 rounded-xl text-[9px] font-bold border transition-all text-left flex justify-between items-center
                                                ${appliedCoupon === c.code
                                                    ? 'bg-[#C9974A]/20 border-[#C9974A] text-[#4E1414]'
                                                    : 'bg-white border-gray-200 text-gray-400 hover:border-[#C9974A]/40'}`}
                                        >
                                            <span>{c.code}</span>
                                            <span className="text-[8px] font-medium opacity-80">{c.type === 'pct' ? `${c.value}%` : `₹${c.value}`}</span>
                                        </button>
                                    ))}
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
                                            <button onClick={() => setSplitGuests(prev => Math.max(2, typeof prev === 'function' ? prev(2) : prev - 1))} className="p-1 bg-white border border-[#C9974A]/30 rounded"><Minus className="w-3 h-3" /></button>
                                            <span className="font-bold">{splitGuests}</span>
                                            <button onClick={() => setSplitGuests(prev => (typeof prev === 'function' ? prev(0) : prev) + 1)} className="p-1 bg-white border border-[#C9974A]/30 rounded"><Plus className="w-3 h-3" /></button>
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
                                        {settings.chargeServiceTax && (
                                            <div className="flex justify-between text-[#4E1414]/70">
                                                <span>Service Charge ({settings.serviceChargeRate}%)</span><span>₹{service.toFixed(0)}</span>
                                            </div>
                                        )}
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

                            {/* Pay Method selection */}
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-[#C9974A] mb-1.5">Settlement Channel</p>
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
                                disabled={submittingPayment || !canSettleBills || !isRegisterOpen}
                                className="flex-1 flex items-center justify-center gap-2 bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-xs shadow-lg shadow-[#4E1414]/10"
                            >
                                {submittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                SETTLE BILL ({paymentMethod.toUpperCase()})
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-[#C9974A]/30 rounded-3xl p-8 text-center text-[#4E1414]/30 italic font-semibold flex flex-col justify-center items-center h-full min-h-[400px]">
                        <Utensils className="w-10 h-10 opacity-20 mb-3 text-[#C9974A]" />
                        Please select an occupied table from the floor map layout to settle.
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
