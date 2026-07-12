import { verifyStaff } from '@/features/ordering/actions/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardGate() {
    const auth = await verifyStaff();
    if (!auth.success || !auth.user) {
        redirect('/staff/login');
    }

    const { permissions, roleName } = auth.user;
    const rName = roleName?.toLowerCase() ?? '';

    // Route based on role name first
    if (rName === 'admin') redirect('/staff/admin');
    if (rName === 'cashier') redirect('/staff/billing');
    if (rName === 'waiter') redirect('/staff/orders');
    if (rName === 'kitchen') redirect('/staff/kitchen');

    // Fallback based on permissions array
    if (permissions.some(p => ['manage_staff', 'view_revenue', 'manage_roles'].includes(p))) {
        redirect('/staff/admin');
    }
    if (permissions.some(p => ['view_kitchen_queue', 'update_prep_status'].includes(p))) {
        redirect('/staff/kitchen');
    }
    if (permissions.some(p => ['view_billing', 'generate_bills'].includes(p))) {
        redirect('/staff/billing');
    }
    if (permissions.some(p => ['view_orders', 'confirm_orders', 'edit_orders', 'manage_tables'].includes(p))) {
        redirect('/staff/orders');
    }

    // Default fallback to sign out if nothing is allowed
    redirect('/staff/login?error=NoPrivileges');
}
