/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { RefObject, useState, useMemo } from 'react';
import { FileSpreadsheet, BookOpen, Edit2, Save, Trash2, AlertTriangle, CheckCircle2, X, Eye, EyeOff, Plus } from 'lucide-react';
import { deleteAllMenuItems, updateMenuItem, deleteMenuItem, updateMenuItemAvailability } from '@/features/ordering/actions/adminActions';

interface Props {
    menu: any[];
    editingMenuId: string | null;
    editForm: { name: string; price: number; category: string };
    fileInputRef: RefObject<HTMLInputElement | null>;
    handleFileUpload: (e: any) => void;
    handleStartEdit: (m: any) => void;
    handleSaveEdit: (id: string) => void;
    handleDeleteMenu: (id: string) => void;
    setEditForm: (f: { name: string; price: number; category: string }) => void;
    onMenuUpdated: () => void;
    readOnly?: boolean;
}

export function AdminMenuSync({
    menu,
    editingMenuId,
    editForm,
    fileInputRef,
    handleFileUpload,
    handleStartEdit,
    handleSaveEdit,
    handleDeleteMenu,
    setEditForm,
    onMenuUpdated,
    readOnly = false,
}: Props) {
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Grouping by category
    const groupedMenu = useMemo(() => {
        const groups: Record<string, any[]> = {};
        menu.forEach(m => {
            const catName = m.categories?.name || 'Uncategorized';
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(m);
        });
        return groups;
    }, [menu]);

    const activeCategoriesCount = Object.keys(groupedMenu).length;
    const unavailableCount = menu.filter(m => m.is_available === false).length;

    // Filter items inside groups based on search
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groupedMenu;

        const sq = searchQuery.toLowerCase();
        const result: Record<string, any[]> = {};

        Object.entries(groupedMenu).forEach(([cat, items]) => {
            // Include whole category if category name matches
            if (cat.toLowerCase().includes(sq)) {
                result[cat] = items;
            } else {
                // Otherwise include only matching items
                const matchingItems = items.filter(m => m.name.toLowerCase().includes(sq));
                result[cat] = matchingItems; // can be empty array, we will dim it
            }
        });
        return result;
    }, [groupedMenu, searchQuery]);

    const doDeleteAll = async () => {
        setDeleting(true);
        const res = await deleteAllMenuItems();
        setDeleting(false);
        setShowDeleteAll(false);
        if (res.success) onMenuUpdated();
        else alert(`Error: ${res.error}`);
    };

    const doSaveEdit = async (id: string) => {
        setSavingId(id);
        await updateMenuItem(id, editForm.name, editForm.price, editForm.category);
        handleSaveEdit(id);
        setSavingId(null);
    };

    const doDelete = async (id: string) => {
        await deleteMenuItem(id);
        handleDeleteMenu(id);
    };

    const toggleAvailability = async (m: any) => {
        if (togglingId) return;
        setTogglingId(m.id);

        const newState = m.is_available === false ? true : false;
        const res = await updateMenuItemAvailability(m.id, newState);
        if (!res.success) alert(`Failed to update availability: ${res.error}`);
        else onMenuUpdated();

        setTogglingId(null);
    };

    return (
        <div className="space-y-4">

            {/* Top Action Bar (Compact) */}
            <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center bg-white p-4 rounded-xl border border-[#C9974A]/20 shadow-sm">
                <div className="flex items-center gap-2">
                    {!readOnly ? (
                        <>
                            <button onClick={() => fileInputRef.current?.click()} className="relative flex items-center gap-2 px-3 py-1.5 bg-[#4E1414] text-[#F6EEDF] rounded-lg text-sm font-bold hover:bg-[#350C0C] transition-colors shadow-sm">
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} ref={fileInputRef} className="absolute inset-0 opacity-0 cursor-pointer hidden" />
                                <FileSpreadsheet className="w-4 h-4" /> Upload Excel/CSV
                            </button>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#F6EEDF] text-[#4E1414] border border-[#C9974A]/30 rounded-lg text-sm font-bold hover:bg-[#e8dec6] transition-colors shadow-sm">
                                <BookOpen className="w-4 h-4 text-[#C9974A]" /> Add Item Manually
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-[#4E1414]/50 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 select-none">
                            🔒 View Only Menu Mode
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                    <input
                        type="text"
                        placeholder="Search menu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-sm px-3 py-1.5 rounded-lg border border-[#C9974A]/40 bg-white min-w-[220px] outline-none focus:border-[#C9974A] focus:ring-1 focus:ring-[#C9974A] shadow-sm transition-all"
                    />
                    {!readOnly && (
                        <button onClick={() => setShowDeleteAll(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors shrink-0 shadow-sm">
                            <Trash2 className="w-4 h-4" /> Clear All Menu Data
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Row */}
            <div className="flex justify-between items-center px-2 py-1">
                <p className="text-[#350C0C] font-semibold text-sm">
                    {activeCategoriesCount} categories · {menu.length} items total <span className="text-red-700/80">· {unavailableCount} unavailable</span>
                </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
                {Object.entries(filteredGroups).map(([catName, items]) => {
                    const originalCount = groupedMenu[catName].length;
                    const isEmptySearch = searchQuery.trim() !== '' && items.length === 0;

                    if (isEmptySearch) {
                        return (
                            <div key={catName} className="rounded-xl border border-[#C9974A]/20 bg-[#4E1414]/10 opacity-70 p-3 flex justify-between items-center h-14">
                                <h3 className="font-bold text-[#4E1414] text-sm truncate">{catName}</h3>
                                <span className="text-[10px] bg-white text-[#4E1414] px-2 py-0.5 rounded-full font-bold shadow-sm">
                                    0 / {originalCount}
                                </span>
                            </div>
                        );
                    }

                    // Dynamically size the row based on item count to pack the grid tightly
                    let cardSpanHeight = 'h-72';
                    if (items.length > 8) cardSpanHeight = 'h-80';
                    if (items.length > 12) cardSpanHeight = 'h-96';
                    if (items.length > 18) cardSpanHeight = 'h-[28rem]';

                    return (
                        <div key={catName} className={`rounded-xl border border-[#C9974A]/30 overflow-hidden shadow-sm bg-white flex flex-col ${cardSpanHeight}`}>
                            {/* Card Header */}
                            <div className="bg-[#4E1414] px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm z-10">
                                <h3 className="font-black text-[#C9974A] tracking-wider uppercase text-sm truncate pr-2" title={catName}>
                                    {catName}
                                </h3>
                                <span className="bg-[#F6EEDF] text-[#4E1414] text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-inner">
                                    {items.length} items
                                </span>
                            </div>

                            {/* Card Body (Scrollable List) */}
                            <div className="flex-1 bg-[#F6EEDF]/40 overflow-y-auto taj-scrollbar divide-y divide-[#C9974A]/10 p-1">
                                {items.map((m: any) => {
                                    const isAvail = m.is_available !== false;
                                    return (
                                        <div key={m.id} className={`group flex flex-col justify-center px-3 py-1.5 hover:bg-[#4E1414]/5 transition-colors relative ${!isAvail ? 'opacity-60' : ''} min-h-[2.5rem]`}>

                                            <div className="flex justify-between items-start gap-2">
                                                {/* Name */}
                                                <div className="flex-1 min-w-0">
                                                    {editingMenuId === m.id ? (
                                                        <input type="text" className="border border-[#C9974A] rounded px-1.5 py-0.5 w-full bg-white outline-none text-[13px] font-bold text-[#241B15] shadow-inner" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                                    ) : (
                                                        <div className="font-bold text-[#241B15] text-[13px] leading-tight flex items-start gap-1 gap-y-0.5 flex-wrap">
                                                            <span>{m.name}</span>
                                                            {!isAvail && <span className="bg-red-100 border border-red-200 text-red-700 text-[8px] px-1 rounded uppercase font-black tracking-wider leading-tight self-center">Hidden</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Price */}
                                                <div className="shrink-0 text-right pt-0.5">
                                                    {editingMenuId === m.id ? (
                                                        <input type="number" className="border border-[#C9974A] rounded px-1.5 py-0.5 w-16 bg-white outline-none text-[12px] font-bold text-[#C9974A] shadow-inner" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) })} />
                                                    ) : (
                                                        <span className="font-black text-[#C9974A] text-[13px]">₹{m.price}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Hover Actions (Absolute on Desktop, static-ish flow otherwise) */}
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity bg-[#F6EEDF]/90 backdrop-blur-sm p-1 rounded-md shadow-sm border border-[#C9974A]/20">
                                                {editingMenuId === m.id ? (
                                                    <div className="flex gap-1 w-full relative z-20 bg-white p-1 rounded">
                                                        <button onClick={() => doSaveEdit(m.id)} disabled={savingId === m.id} className="bg-[#C9974A] text-white p-1.5 rounded hover:bg-[#A97A35] disabled:opacity-50 transition-colors">
                                                            <Save className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleStartEdit({ id: null })} className="bg-gray-200 text-gray-700 p-1.5 rounded hover:bg-gray-300 transition-colors">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button title={isAvail ? "Hide from menu" : "Show on menu"} onClick={() => toggleAvailability(m)} disabled={togglingId === m.id} className={`p-1 rounded transition-colors ${isAvail ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                                            {isAvail ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                        </button>
                                                        {!readOnly && (
                                                            <>
                                                                <button title="Edit item" onClick={() => handleStartEdit(m)} className="bg-white text-[#C9974A] p-1 rounded hover:bg-[#F6EEDF] transition-colors border border-[#C9974A]/30">
                                                                    <Edit2 className="w-3 h-3" />
                                                                </button>
                                                                <button title="Delete item" onClick={() => doDelete(m.id)} className="bg-red-50 text-[#B91C1C] p-1 rounded hover:bg-red-100 transition-colors border border-red-200">
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Card Footer */}
                            {!readOnly && (
                                <div className="bg-white px-3 py-2 border-t border-[#C9974A]/20 shrink-0 text-center">
                                    <button className="text-[#C9974A] hover:text-[#4E1414] text-xs font-bold transition-colors inline-flex items-center gap-1">
                                        <Plus className="w-3.5 h-3.5" /> Add {catName} Item
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {Object.keys(filteredGroups).length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-[#C9974A]/20 shadow-sm">
                    <AlertTriangle className="w-12 h-12 text-[#C9974A]/50 mx-auto mb-3" />
                    <p className="text-[#350C0C] font-bold text-lg">No menu items found.</p>
                    <p className="text-[#350C0C]/60 text-sm mt-1">Upload a spreadsheet or adjust your search.</p>
                </div>
            )}

            {/* Delete All Confirmation Modal */}
            {showDeleteAll && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-red-300 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h2 className="text-xl font-black text-[#241B15] mb-2">Delete All Menu Data?</h2>
                        <p className="text-sm text-[#241B15]/60 mb-6">
                            This will permanently remove ALL {menu.length} items from the menu.
                            <strong> All active and past orders will also be wiped to avoid data corruption.</strong> This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteAll(false)}
                                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-[#241B15] hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={doDeleteAll}
                                disabled={deleting}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {deleting ? 'Deleting…' : <><CheckCircle2 className="w-4 h-4" /> Yes, Purge All</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
