/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from 'react';
import { ShieldCheck, Plus, Settings2, Trash2, X, CheckCircle2 } from 'lucide-react';
import { addCustomRole, updateRolePermissions, deleteCustomRole } from '@/features/ordering/actions/staffActions';

interface Props {
    roles: any[];
    permissions: any[];
    staff: any[];
    onRolesUpdated: () => void;
}

export function AdminRoles({ roles, permissions, staff, onRolesUpdated }: Props) {
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [form, setForm] = useState<{ id?: string; name: string; permissionIds: string[] }>({ name: '', permissionIds: [] });
    const [saving, setSaving] = useState(false);

    // Permission human labels (fallback to generated keys if not mapped)
    const labelMap: Record<string, string> = {
        'view_orders': 'View Orders',
        'edit_orders': 'Edit Orders',
        'confirm_orders': 'Confirm Orders',
        'view_kitchen_queue': 'View Kitchen Queue',
        'update_prep_status': 'Update Prep Status',
        'view_billing': 'View Billing',
        'generate_bills': 'Generate Bills',
        'edit_menu': 'Edit Menu',
        'manage_staff': 'Manage Staff',
        'manage_roles': 'Manage Roles',
        'view_revenue': 'View Revenue & Analytics',
        'export_data': 'Export Data (Excel)',
        'manage_tables': 'Manage Tables'
    };

    const getAssignedCount = (roleId: string) => staff.filter(s => s.role_id === roleId && s.is_active).length;

    const openCreateModal = () => {
        setForm({ name: '', permissionIds: [] });
        setModalMode('create');
        setShowModal(true);
    };

    const openEditModal = (r: any) => {
        const assignedIds = (r.role_permissions || []).map((rp: any) => rp.permissions?.id).filter(Boolean);
        setForm({ id: r.id, name: r.name, permissionIds: assignedIds });
        setModalMode('edit');
        setShowModal(true);
    };

    const handleTogglePermission = (pId: string) => {
        setForm(prev => {
            const has = prev.permissionIds.includes(pId);
            return {
                ...prev,
                permissionIds: has ? prev.permissionIds.filter(i => i !== pId) : [...prev.permissionIds, pId]
            };
        });
    };

    const handleSave = async () => {
        if (!form.name.trim()) return alert('Role name is required.');
        if (form.permissionIds.length === 0) return alert('At least one permission must be selected.');

        setSaving(true);
        let res;
        if (modalMode === 'create') {
            res = await addCustomRole(form.name, form.permissionIds);
        } else {
            res = await updateRolePermissions(form.id!, form.permissionIds);
        }

        setSaving(false);
        if (res.success) {
            setShowModal(false);
            onRolesUpdated();
        } else {
            alert(`Error: ${res.error}`);
        }
    };

    const handleDelete = async (r: any) => {
        if (!confirm(`Are you sure you want to delete the ${r.name} role?`)) return;
        const res = await deleteCustomRole(r.id);
        if (res.success) {
            onRolesUpdated();
        } else {
            alert(res.error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#C9974A]/20 shadow-sm">
                <div>
                    <h3 className="text-[#4E1414] font-black text-lg">Role & Privilege Management</h3>
                    <p className="text-[#241B15]/60 text-sm mt-1 flex gap-4">
                        <span>{roles.length} Roles Active</span>
                        <span>{permissions.length} Global Permissions Available</span>
                    </p>
                </div>
                <button onClick={openCreateModal} className="flex items-center gap-2 bg-[#C9974A] text-[#4E1414] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#b0823c] transition-colors">
                    <Plus className="w-4 h-4" /> Create Custom Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {roles.map(r => {
                    const assignedUsers = getAssignedCount(r.id);
                    const perms = r.role_permissions?.map((rp: any) => rp.permissions?.key).filter(Boolean) || [];

                    return (
                        <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-[#C9974A]/20 hover:border-[#C9974A]/50 transition-colors flex flex-col overflow-hidden">
                            <div className="bg-[#4E1414]/5 p-5 border-b border-[#C9974A]/10 flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-[#4E1414] text-lg uppercase tracking-wider">{r.name}</h4>
                                    <span className={`inline-flex mt-1 items-center px-2 py-0.5 rounded text-[10px] font-bold ${r.is_custom ? 'bg-[#C9974A]/20 text-[#4E1414]' : 'bg-[#4E1414] text-[#F6EEDF]'}`}>
                                        {r.is_custom ? 'CUSTOM ROLE' : 'BASE SETTING'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="font-extrabold text-[#241B15] text-xl">{assignedUsers}</div>
                                    <div className="text-[10px] uppercase font-bold text-[#241B15]/50 tracking-wider">Staff Active</div>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div className="mb-6">
                                    <h5 className="text-[11px] uppercase tracking-wider font-extrabold text-[#241B15]/40 mb-3 flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5" /> Capabilities ({perms.length})
                                    </h5>
                                    <div className="flex flex-wrap gap-1.5">
                                        {perms.length === 0 ? (
                                            <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">No Permissions Assigned</span>
                                        ) : (
                                            perms.map((p: string) => (
                                                <span key={p} className="bg-[#F6EEDF] border border-[#C9974A]/40 text-[#4E1414] px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
                                                    {labelMap[p] || p}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-[#C9974A]/10">
                                    <button onClick={() => openEditModal(r)} className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#241B15] bg-[#F6EEDF] px-4 py-1.5 rounded-lg border border-[#C9974A]/30 hover:border-[#4E1414] hover:text-[#4E1414] transition-colors w-full mr-2">
                                        <Settings2 className="w-4 h-4" /> Edit Rules
                                    </button>

                                    {r.is_custom ? (
                                        <button onClick={() => handleDelete(r)} className="flex justify-center items-center h-8 w-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors border border-red-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <div className="h-8 w-8"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-[#F6EEDF] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-[#C9974A]/30 flex flex-col max-h-[90vh]">
                        <div className="bg-[#4E1414] px-6 py-4 flex justify-between items-center shrink-0">
                            <h3 className="text-[#F6EEDF] font-black text-lg">
                                {modalMode === 'create' ? 'Create Custom Role' : `Edit Overrides for: ${form.name}`}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-[#F6EEDF]/70 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto taj-scrollbar">
                            <div className="mb-6">
                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2">Role Identity</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    disabled={modalMode === 'edit' && !roles.find(r => r.id === form.id)?.is_custom}
                                    placeholder="e.g. Area Manager"
                                    className="w-full px-4 py-3 rounded-xl border border-[#C9974A]/40 outline-none focus:border-[#4E1414] disabled:opacity-50 font-bold bg-white"
                                />
                                {modalMode === 'edit' && !roles.find(r => r.id === form.id)?.is_custom && (
                                    <p className="text-[10px] font-bold text-red-600 uppercase mt-2">Cannot rename base roles.</p>
                                )}
                            </div>

                            <div className="mb-2">
                                <label className="block text-xs font-black text-[#4E1414] uppercase tracking-wider mb-2">Permission Access Capabilities</label>
                                <p className="text-xs text-[#241B15]/60 mb-4 font-medium">Select exactly what module bypasses and capabilities users under this group will inherit.</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {permissions.map(p => {
                                        const isChecked = form.permissionIds.includes(p.id);
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => handleTogglePermission(p.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isChecked ? 'bg-white border-[#4E1414] shadow-sm' : 'bg-[#C9974A]/5 border-transparent hover:bg-[#C9974A]/10'}`}
                                            >
                                                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${isChecked ? 'bg-[#4E1414] border-[#4E1414] text-white' : 'border-[#C9974A]/40 bg-white'}`}>
                                                    {isChecked && <CheckCircle2 className="w-4 h-4" />}
                                                </div>
                                                <span className={`text-sm font-bold ${isChecked ? 'text-[#4E1414]' : 'text-[#241B15]/70'}`}>
                                                    {labelMap[p.key] || p.key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-black/5 border-t border-[#C9974A]/20 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-[#4E1414] text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-[#4E1414] text-white font-bold rounded-xl text-sm hover:bg-[#350C0C] disabled:opacity-50">
                                {saving ? 'Writing Policy...' : 'Save Role Rules'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
