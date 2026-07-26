"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, SlidersHorizontal, ArrowUp, ArrowDown, RotateCcw, Check, Loader2, GripVertical
} from 'lucide-react';
import { StaffRole, WIDGET_CATALOG, getDefaultPreferences } from '../config/widgetCatalog';
import { saveDashboardPreferences } from '../actions/dashboardPrefActions';

interface Props {
    role: StaffRole;
    isOpen: boolean;
    onClose: () => void;
    currentVisible: string[];
    currentOrder: string[];
    onSave: (newVisible: string[], newOrder: string[]) => void;
}

export function CustomizeDashboardModal({
    role,
    isOpen,
    onClose,
    currentVisible,
    currentOrder,
    onSave
}: Props) {
    const catalog = WIDGET_CATALOG[role] || WIDGET_CATALOG.cashier;
    
    // Sort catalog according to currentOrder
    const initialOrderedList = [...currentOrder].filter(id => catalog.some(w => w.id === id));
    catalog.forEach(w => {
        if (!initialOrderedList.includes(w.id)) {
            initialOrderedList.push(w.id);
        }
    });

    const [visibleSet, setVisibleSet] = useState<Set<string>>(new Set(currentVisible));
    const [orderList, setOrderList] = useState<string[]>(initialOrderedList);
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const toggleWidget = (id: string) => {
        const next = new Set(visibleSet);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setVisibleSet(next);
    };

    const moveWidget = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= orderList.length) return;
        const nextList = [...orderList];
        const [moved] = nextList.splice(index, 1);
        nextList.splice(targetIndex, 0, moved);
        setOrderList(nextList);
    };

    const handleResetDefault = () => {
        const defaults = getDefaultPreferences(role);
        setVisibleSet(new Set(defaults.visible));
        setOrderList(defaults.order);
    };

    const handleSaveLayout = async () => {
        setSaving(true);
        const visibleArray = Array.from(visibleSet);
        const res = await saveDashboardPreferences(visibleArray, orderList);
        setSaving(false);
        if (!res.success) {
            alert(res.error || 'Failed to save layout preferences');
        } else {
            onSave(visibleArray, orderList);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-[#C9974A]/40 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-[#4E1414] text-[#F6EEDF] px-6 py-4 flex justify-between items-center border-b border-[#C9974A]/30">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-[#C9974A]/20 rounded-xl text-[#C9974A]">
                                <SlidersHorizontal className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base tracking-wide font-display text-[#F6EEDF]">
                                    Personalize {role.toUpperCase()} Dashboard
                                </h3>
                                <p className="text-[10px] text-[#C9974A] font-semibold">
                                    Show, hide & reorder widgets tailored to your shift workflow
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full text-[#F6EEDF]/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content List */}
                    <div className="p-6 overflow-y-auto space-y-3 flex-1 taj-scrollbar-dark bg-[#F6EEDF]/20">
                        <div className="flex justify-between items-center pb-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#4E1414]">
                                Available Widgets ({visibleSet.size} Active)
                            </span>
                            <button
                                onClick={handleResetDefault}
                                className="text-[11px] text-[#C9974A] hover:text-[#4E1414] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <RotateCcw className="w-3 h-3" /> Reset Defaults
                            </button>
                        </div>

                        {orderList.map((id, index) => {
                            const item = catalog.find(w => w.id === id);
                            if (!item) return null;
                            const isVisible = visibleSet.has(id);

                            return (
                                <div
                                    key={id}
                                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                        isVisible 
                                            ? 'bg-white border-[#C9974A]/30 shadow-xs' 
                                            : 'bg-gray-50/80 border-gray-200 opacity-60'
                                    }`}
                                >
                                    {/* Left drag/move controls & info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex flex-col gap-0.5 text-gray-400">
                                            <button
                                                disabled={index === 0}
                                                onClick={() => moveWidget(index, 'up')}
                                                className="p-0.5 hover:text-[#4E1414] disabled:opacity-20 cursor-pointer"
                                                title="Move Up"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                disabled={index === orderList.length - 1}
                                                onClick={() => moveWidget(index, 'down')}
                                                className="p-0.5 hover:text-[#4E1414] disabled:opacity-20 cursor-pointer"
                                                title="Move Down"
                                            >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <GripVertical className="w-4 h-4 text-[#C9974A]/60 flex-shrink-0" />

                                        <div className="min-w-0">
                                            <p className="font-extrabold text-xs text-[#4E1414] truncate">{item.label}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
                                        </div>
                                    </div>

                                    {/* Toggle Switch */}
                                    <button
                                        onClick={() => toggleWidget(id)}
                                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer flex-shrink-0 ${
                                            isVisible ? 'bg-[#C9974A]' : 'bg-gray-300'
                                        }`}
                                    >
                                        <div
                                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                                isVisible ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-white border-t border-[#C9974A]/25 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-[#4E1414] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={saving}
                            onClick={handleSaveLayout}
                            className="px-5 py-2 bg-[#4E1414] hover:bg-[#3d0f0f] text-[#F6EEDF] font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#C9974A]" />
                            ) : (
                                <Check className="w-4 h-4 text-[#C9974A]" />
                            )}
                            Save Layout Preference
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
