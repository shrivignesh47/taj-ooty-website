/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { RefObject, useState } from 'react';
import { FileSpreadsheet, BookOpen, Edit2, Save, Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { deleteAllMenuItems, updateMenuItem, deleteMenuItem } from '@/features/ordering/actions/adminActions';

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
}: Props) {
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

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

    return (
        <div className="space-y-6">
            {/* Upload / Add strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Excel upload */}
                <div className="bg-white p-7 rounded-2xl border border-[#C9974A]/20 text-center flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#C9974A]/50 transition-colors cursor-pointer shadow-sm">
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-14 h-14 bg-[#F6EEDF] text-[#4E1414] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-lg text-[#4E1414]">Upload Excel / CSV</h3>
                    <p className="text-[#241B15]/60 text-sm mt-1.5 px-4">Drag & drop or click to upload a menu spreadsheet</p>
                </div>

                {/* Manual add placeholder */}
                <div className="bg-white p-7 rounded-2xl border border-[#C9974A]/20 text-center flex flex-col items-center justify-center cursor-pointer hover:border-[#C9974A]/50 transition-colors shadow-sm">
                    <div className="w-14 h-14 bg-[#F6EEDF] text-[#C9974A] rounded-xl flex items-center justify-center mb-3">
                        <BookOpen className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-lg text-[#4E1414]">Add Item Manually</h3>
                    <p className="text-[#241B15]/60 text-sm mt-1.5 px-4">Add a single new item to the menu directly</p>
                </div>
            </div>

            {/* Menu table */}
            <div className="bg-white rounded-2xl border border-[#C9974A]/20 shadow-sm overflow-hidden">
                {/* Header bar with Clear All */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#C9974A]/10 bg-[#F6EEDF]/40">
                    <div>
                        <h3 className="font-bold text-[#4E1414]">Menu Items</h3>
                        <p className="text-xs text-[#241B15]/50 mt-0.5">{menu.length} items across all categories</p>
                    </div>
                    <button
                        onClick={() => setShowDeleteAll(true)}
                        className="flex items-center gap-2 text-red-600 text-xs font-bold px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 outline outline-1 outline-red-200 transition-colors"
                    >
                        <AlertTriangle className="w-3.5 h-3.5" /> Clear All Menu
                    </button>
                </div>

                {/* Scrollable table */}
                <div className="overflow-x-auto overflow-y-auto max-h-[520px] taj-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 z-10 bg-[#4E1414] text-[#F6EEDF]">
                            <tr>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Item Name</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F6EEDF]">
                            {menu.map((m: any) => (
                                <tr key={m.id} className="hover:bg-[#F6EEDF]/30 transition-colors">
                                    <td className="px-6 py-3 font-bold text-[#241B15]">
                                        {editingMenuId === m.id ? (
                                            <input
                                                type="text"
                                                className="border border-[#C9974A]/50 bg-[#F6EEDF] p-1.5 rounded-lg w-full text-sm"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        ) : m.name}
                                    </td>
                                    <td className="px-6 py-3 text-[#4E1414]/70">
                                        {editingMenuId === m.id ? (
                                            <input
                                                type="text"
                                                className="border border-[#C9974A]/50 bg-[#F6EEDF] p-1.5 rounded-lg w-full text-sm"
                                                value={editForm.category}
                                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                            />
                                        ) : (m.categories?.name ?? 'General')}
                                    </td>
                                    <td className="px-6 py-3 font-black text-[#C9974A]">
                                        {editingMenuId === m.id ? (
                                            <input
                                                type="number"
                                                className="border border-[#C9974A]/50 bg-[#F6EEDF] p-1.5 rounded-lg w-20 text-sm"
                                                value={editForm.price}
                                                onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                                            />
                                        ) : `₹${m.price}`}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex gap-2 justify-center">
                                            {editingMenuId === m.id ? (
                                                <>
                                                    <button
                                                        onClick={() => doSaveEdit(m.id)}
                                                        disabled={savingId === m.id}
                                                        className="bg-[#4E1414] text-[#F6EEDF] p-2 rounded-lg hover:bg-[#350C0C] transition-colors disabled:opacity-50"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleStartEdit({ id: null })} className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleStartEdit(m)}
                                                    className="bg-[#F6EEDF] text-[#4E1414] p-2 rounded-lg hover:bg-[#e4d7be] transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => doDelete(m.id)}
                                                className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors outline outline-1 outline-red-200"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete All Confirmation Modal */}
            {showDeleteAll && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-red-300 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h2 className="text-xl font-black text-[#241B15] mb-2">Delete All Menu Items?</h2>
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
                                {deleting ? 'Deleting…' : <><CheckCircle2 className="w-4 h-4" /> Yes, Delete All</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
