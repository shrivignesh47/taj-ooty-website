/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function addStaffUser(name: string, phone: string, email: string, roleId: string, customPassword?: string) {
    try {
        const password = customPassword ? customPassword : Math.random().toString(36).slice(-8) + 'A1!'; // auto-gen if not provided
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError || !authData.user) {
            return { success: false, error: authError?.message || 'Failed to create auth user' };
        }

        const { error: dbError } = await admin.from('staff_users').insert({
            auth_id: authData.user.id,
            name,
            phone,
            role_id: roleId,
            is_active: true
        });

        if (dbError) {
            // Rollback
            await admin.auth.admin.deleteUser(authData.user.id);
            return { success: false, error: dbError.message };
        }

        revalidatePath('/staff/admin');
        return { success: true, password }; // return once
    } catch (e: any) {
        return { success: false, error: e.message || 'Server Action Exception' };
    }
}

export async function editStaffUser(id: string, name: string, phone: string, roleId: string, isActive: boolean) {
    try {
        const { error } = await admin.from('staff_users').update({
            name,
            phone,
            role_id: roleId,
            is_active: isActive
        }).eq('id', id);

        if (error) return { success: false, error: error.message };
        revalidatePath('/staff/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deactivateStaffUser(id: string) {
    const { error } = await admin.from('staff_users').update({ is_active: false }).eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/staff/admin');
    return { success: true };
}

export async function resetStaffPassword(authId: string, customPassword?: string) {
    const newPassword = customPassword ? customPassword : Math.random().toString(36).slice(-8) + 'A1!';
    const { error } = await admin.auth.admin.updateUserById(authId, { password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true, password: newPassword };
}

// ─── Roles & Permissions ──────────────────────────────────────────────────

export async function addCustomRole(name: string, permissionIds: string[]) {
    // Check uniqueness
    const { data: exists } = await admin.from('roles').select('id').ilike('name', name).single();
    if (exists) return { success: false, error: 'Role name already exists' };

    const { data: role, error: roleErr } = await admin.from('roles').insert({ name, is_custom: true }).select().single();
    if (roleErr) return { success: false, error: roleErr.message };

    if (permissionIds.length > 0) {
        const pPayloads = permissionIds.map(p => ({ role_id: role.id, permission_id: p }));
        const { error: pErr } = await admin.from('role_permissions').insert(pPayloads);
        if (pErr) return { success: false, error: pErr.message };
    }

    revalidatePath('/staff/admin');
    return { success: true };
}

export async function updateRolePermissions(roleId: string, permissionIds: string[]) {
    // Verify it exists and whether we can edit
    const { data: role } = await admin.from('roles').select('is_custom').eq('id', roleId).single();
    if (!role) return { success: false, error: 'Role not found' };

    // Clear old perms
    const { error: delErr } = await admin.from('role_permissions').delete().eq('role_id', roleId);
    if (delErr) return { success: false, error: delErr.message };

    // Insert new perms
    if (permissionIds.length > 0) {
        const pPayloads = permissionIds.map(p => ({ role_id: roleId, permission_id: p }));
        const { error: insErr } = await admin.from('role_permissions').insert(pPayloads);
        if (insErr) return { success: false, error: insErr.message };
    }

    revalidatePath('/staff/admin');
    return { success: true };
}

export async function deleteCustomRole(roleId: string) {
    // Check if staff are tied to this role
    const { count } = await admin.from('staff_users').select('id', { count: 'exact', head: true }).eq('role_id', roleId).eq('is_active', true);
    if (count && count > 0) return { success: false, error: `${count} staff member(s) are assigned to this role. Reassign them before deleting.` };

    const { data: role } = await admin.from('roles').select('is_custom').eq('id', roleId).single();
    if (!role) return { success: false, error: 'Role not found' };
    if (!role.is_custom) return { success: false, error: 'Base roles cannot be deleted' };

    const { error } = await admin.from('roles').delete().eq('id', roleId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/staff/admin');
    return { success: true };
}
