"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Tag, Check, Trash2, ShieldAlert } from 'lucide-react';
import { fetchAllCoupons, createCoupon, toggleCouponActive, deleteCoupon, CouponRecord } from '@/features/ordering/actions/couponActions';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function CouponManagementModal({ isOpen, onClose }: Props) {
    const [coupons, setCoupons] = useState<CouponRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // New Coupon Form state
    const [code, setCode] = useState('');
    const [type, setType] = useState<'pct' | 'amt'>('pct');
    const [value, setValue] = useState<number>(10);
    const [description, setDescription] = useState('');
    const [usageLimit, setUsageLimit] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    const loadCoupons = async () => {
        setLoading(true);
        const data = await fetchAllCoupons();
        setCoupons(data);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            loadCoupons();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setSubmitting(true);
        const res = await createCoupon({
            code,
            type,
            value: Number(value),
            description,
            usage_limit: usageLimit ? Number(usageLimit) : null
        });
        setSubmitting(false);
        if (res.success) {
            setCode('');
            setDescription('');
            setUsageLimit('');
            loadCoupons();
        } else {
            alert(`Failed: ${res.error}`);
        }
    };

    const handleToggle = async (id: string, active: boolean) => {
        await toggleCouponActive(id, !active);
        loadCoupons();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this coupon permanently?')) {
            await deleteCoupon(id);
            loadCoupons();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#C9974A]/30 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-[#C9974A]" />
                        <h2 className="text-lg font-bold text-[#4E1414]">Coupon & Discount Engine</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-[#4E1414]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto taj-scrollbar flex-1 py-4 space-y-6">
                    {/* Create New Coupon Form */}
                    <form onSubmit={handleCreate} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#4E1414] flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-[#C9974A]" /> Add New Promo Code
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase">Code</label>
                                <input
                                    type="text"
                                    placeholder="e.g. TAJ20"
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    className="w-full text-xs font-mono font-bold p-2 border rounded-xl border-stone-300 uppercase focus:border-[#C9974A] outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase">Type</label>
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value as 'pct' | 'amt')}
                                    className="w-full text-xs font-bold p-2 border rounded-xl border-stone-300 focus:border-[#C9974A] outline-none"
                                >
                                    <option value="pct">Percentage (%)</option>
                                    <option value="amt">Flat Amount (₹)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase">Value</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={value}
                                    onChange={e => setValue(Number(e.target.value))}
                                    className="w-full text-xs font-bold p-2 border rounded-xl border-stone-300 focus:border-[#C9974A] outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase">Max Uses (Optional)</label>
                                <input
                                    type="number"
                                    placeholder="Unlimited"
                                    value={usageLimit}
                                    onChange={e => setUsageLimit(e.target.value)}
                                    className="w-full text-xs font-bold p-2 border rounded-xl border-stone-300 focus:border-[#C9974A] outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Description (e.g. Weekend Special Offer)"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="flex-1 text-xs p-2 border rounded-xl border-stone-300 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-[#4E1414] hover:bg-[#3b0e0e] text-[#F6EEDF] font-bold text-xs rounded-xl transition-all"
                            >
                                Save Coupon
                            </button>
                        </div>
                    </form>

                    {/* Active Coupons List */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Configured Coupons ({coupons.length})</h3>
                        {loading ? (
                            <p className="text-xs text-stone-400 py-4 text-center">Loading coupons...</p>
                        ) : coupons.length === 0 ? (
                            <p className="text-xs text-stone-400 py-4 text-center">No coupons configured yet.</p>
                        ) : (
                            <div className="divide-y border border-stone-200 rounded-2xl overflow-hidden">
                                {coupons.map(c => (
                                    <div key={c.id} className="p-3 bg-white flex items-center justify-between hover:bg-stone-50 text-xs">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-black text-sm px-2.5 py-1 bg-[#F6EEDF] text-[#4E1414] rounded-lg border border-[#C9974A]/30">
                                                {c.code}
                                            </span>
                                            <div>
                                                <p className="font-bold text-stone-800">
                                                    {c.type === 'pct' ? `${c.value}% OFF` : `₹${c.value} FLAT OFF`}
                                                </p>
                                                <p className="text-[10px] text-stone-500">{c.description || 'No description'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-stone-400 font-mono">
                                                Used: {c.times_used}{c.usage_limit ? ` / ${c.usage_limit}` : ''}
                                            </span>
                                            <button
                                                onClick={() => handleToggle(c.id, c.is_active)}
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                                    c.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                                }`}
                                            >
                                                {c.is_active ? 'Active' : 'Disabled'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-stone-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
