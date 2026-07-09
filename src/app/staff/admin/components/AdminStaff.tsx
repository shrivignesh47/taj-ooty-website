/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from 'react';
import { Search, Plus, UserX, ShieldCheck, Mail, Copy, CheckCircle2, X } from 'lucide-react';
import { addStaffUser, editStaffUser, deactivateStaffUser, resetStaffPassword } from '@/features/ordering/actions/staffActions';

interface Props {
    staff: any[];
    roles: any[];
    onStaffUpdated: () => void;
}

export function AdminStaff({ staff, roles, onStaffUpdated }: Props) {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [form, setForm] = useState({ id: '', name: '', phone: '', email: '', password: '', roleId: '', isActive: true });

    // Status state
    const [saving, setSaving] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

    const filteredStaff = staff.filter(s => {
        const matchesName = s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone && s.phone.includes(search));
        const matchesRole = roleFilter === 'All' || s.roles?.name === roleFilter;
        return matchesName && matchesRole;
    });

    const openAddModal = () => {
        setForm({ id: '', name: '', phone: '', email: '', password: '', roleId: roles[0]?.id || '', isActive: true });
        setModalMode('add');
        setGeneratedPassword(null);
        setShowModal(true);
    };

    const openEditModal = (s: any) => {
        setForm({ id: s.id, name: s.name, phone: s.phone || '', email: s.email || '', password: '', roleId: s.role_id, isActive: s.is_active });
        setModalMode('edit');
        setGeneratedPassword(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.roleId) return alert('Name and Role are required.');
        setSaving(true);
        try {
            if (modalMode === 'add') {
                if (!form.email) {
                    setSaving(false);
                    return alert('Email is required for new staff logins.');
                }
                const res = await addStaffUser(form.name, form.phone, form.email, form.roleId, form.password);
                if (res?.success) {
                    setGeneratedPassword(res.password!);
                    onStaffUpdated();
                } else {
                    alert(`Error: ${res?.error || 'Unknown server error'}`);
                }
            } else {
                const res = await editStaffUser(form.id, form.name, form.phone, form.roleId, form.isActive);
                if (res?.success) {
                    setShowModal(false);
                    onStaffUpdated();
                } else {
                    alert(`Error: ${res?.error || 'Unknown server error'}`);
                }
            }
        } catch (e: any) {
            alert(`Client Error: ${e.message || 'An unexpected error occurred. Please refresh.'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async (authId: string) => {
        const customPwd = prompt('Enter a new password for this staff member.\nLeave blank to auto-generate a secure random password:');
        if (customPwd === null) return; // User cancelled

        const res = await resetStaffPassword(authId, customPwd || undefined);
        if (res.success) {
            alert(`Password Reset Successful!\n\nNew Password: ${res.password}\n\nPlease copy this immediately.`);
        } else {
            alert(`Error: ${res.error}`);
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!confirm('Deactivate this staff member? They will lose login access.')) return;
        const res = await deactivateStaffUser(id);
        if (res.success) onStaffUpdated();
        else alert(`Error: ${res.error}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex bg-white border border-[#C9974A]/30 rounded-xl overflow-hidden shadow-sm w-full md:w-auto">
                    <div className="pl-3 py-2 flex items-center justify-center text-[#C9974A]">
                        <Search className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-3 py-2 outline-none text-[#241B15] w-full md:w-64 text-sm font-medium"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto taj-scrollbar pb-1 md:pb-0">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-white border border-[#C9974A]/30 rounded-xl px-3 py-2 text-sm font-bold text-[#4E1414] outline-none shadow-sm cursor-pointer"
                    >
                        <option value="All">All Roles</option>
                        {roles.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                    </select>

                    <button onClick={openAddModal} className="flex items-center gap-2 bg-[#4E1414] text-[#F6EEDF] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#350C0C] transition-colors shrink-0">
                        <Plus className="w-4 h-4" /> Add Staff
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#C9974A]/20 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#F6EEDF]/50 text-[#4E1414] font-black uppercase text-[11px] tracking-wider border-b border-[#C9974A]/20">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#C9974A]/10">
                            {filteredStaff.map(s => (
                                <tr key={s.id} className="hover:bg-[#F6EEDF]/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-[#241B15]">{s.name}</td>
                                    <td className="px-6 py-4 font-medium text-[#241B15]/70">{s.phone || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-[#4E1414]/10 text-[#4E1414] px-2.5 py-1 rounded-lg text-xs font-bold border border-[#4E1414]/20 flex items-center gap-1.5 w-max">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            {s.roles?.name || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {s.is_active ? (
                                            <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-1 rounded-md text-xs font-bold border border-green-200 w-max">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2 py-1 rounded-md text-xs font-bold border border-red-200 w-max">
                                                <UserX className="w-3.5 h-3.5" /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-[#241B15]/60 font-medium">
                                        {new Date(s.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-4">
                                        {s.auth_id && s.is_active && (
                                            <button onClick={() => handleResetPassword(s.auth_id)} className="text-[#C9974A] hover:text-[#4E1414] font-bold text-xs underline underline-offset-2 transition-colors">
                                                Reset PWD
                                            </button>
                                        )}
                                        <button onClick={() => openEditModal(s)} className="text-[#4E1414] hover:text-black font-bold text-xs underline underline-offset-2 transition-colors">
                                            Edit
                                        </button>
                                        {s.is_active && s.roles?.name !== 'admin' && (
                                            <button onClick={() => handleDeactivate(s.id)} className="text-red-700 hover:text-red-900 font-bold text-xs underline underline-offset-2 transition-colors">
                                                Deactivate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredStaff.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[#241B15]/50 font-bold">
                                        No staff members found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-[#F6EEDF] w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-[#C9974A]/30">
                        <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center">
                            <h3 className="text-[#F6EEDF] font-black text-lg">
                                {modalMode === 'add' ? 'Add New Staff' : 'Edit Staff'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-[#F6EEDF]/70 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {generatedPassword ? (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                    <p className="text-green-800 font-bold mb-2">Staff Created Successfully!</p>
                                    <p className="text-sm font-medium text-green-700 mb-1">Temporary Password:</p>
                                    <div className="bg-white border border-green-300 font-mono text-xl font-black text-[#4E1414] py-2 px-4 rounded-lg flex justify-between items-center">
                                        {generatedPassword}
                                        <button onClick={() => navigator.clipboard.writeText(generatedPassword)} className="text-[#C9974A] hover:text-[#4E1414]">
                                            <Copy className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-red-600 font-bold mt-3">Copy this now. It will not be shown again.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-1">Full Name</label>
                                        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-[#C9974A]/40 outline-none focus:border-[#4E1414]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-1">Phone Number</label>
                                        <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-[#C9974A]/40 outline-none focus:border-[#4E1414]" />
                                    </div>
                                    {modalMode === 'add' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-1">Email <span className="text-red-500">*</span></label>
                                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Needed for login" className="w-full px-3 py-2 rounded-xl border border-[#C9974A]/40 outline-none focus:border-[#4E1414]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-1">Password</label>
                                                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to auto-generate" className="w-full px-3 py-2 rounded-xl border border-[#C9974A]/40 outline-none focus:border-[#4E1414]" />
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-1">Assigned Role</label>
                                        <select value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-[#C9974A]/40 outline-none focus:border-[#4E1414] bg-white">
                                            {roles.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {modalMode === 'edit' && (
                                        <div className="flex items-center gap-2 pt-2">
                                            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[#4E1414]" />
                                            <label htmlFor="isActive" className="text-sm font-bold text-[#241B15]">Account is Active</label>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-4 bg-black/5 border-t border-[#C9974A]/20 flex justify-end gap-3">
                            {generatedPassword ? (
                                <button onClick={() => setShowModal(false)} className="px-5 py-2 bg-[#4E1414] text-white font-bold rounded-xl text-sm">Close</button>
                            ) : (
                                <>
                                    <button onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-[#4E1414] text-sm">Cancel</button>
                                    <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#4E1414] text-white font-bold rounded-xl text-sm hover:bg-[#350C0C] disabled:opacity-50">
                                        {saving ? 'Saving...' : 'Save Staff'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
