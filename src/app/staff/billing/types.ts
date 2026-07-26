export interface CashierOrderItem {
    id: string;
    qty: number;
    price_at_order: number;
    notes?: string | null;
    discount_percent?: number | null;
    discount_reason?: string | null;
    menu_items: { name: string; is_veg: boolean; id: string } | null;
}

export interface CashierOrder {
    id: string;
    status: string;
    created_at: string;
    customer_name: string;
    customer_phone?: string | null;
    table_id: string | null;
    restaurant_tables: { table_no: number; id: string } | null;
    order_items: CashierOrderItem[];
    source?: string;
    token_no?: string | null;
}

export interface TableView {
    id: string;
    table_no: number;
    status: 'Empty' | 'Occupied' | 'Awaiting Settlement';
    currentBill: number;
    customer_name?: string;
    customer_phone?: string;
    orders: CashierOrder[];
    latestStatus: string;
}

export interface DayStats {
    revenue: number;
    bills: number;
    avgBill: number;
    activeTables: number;
    cashSales: number;
    cardSales: number;
    upiSales: number;
}

export interface PettyCashEntry {
    id: string;
    purpose: string;
    amount: number;
    created_at: string;
}

export interface GuestRecord {
    name: string;
    phone: string;
    totalVisits: number;
    totalSpent: number;
    lastVisit?: string;
}

export interface StaffUser {
    id: string;
    name: string;
    is_active: boolean;
    phone?: string | null;
    auth_id?: string | null;
    role_id?: string;
    created_at?: string;
    roles?: {
        name: string;
    } | null;
}

export interface AttendanceLog {
    id: string;
    staff_id: string;
    clock_in: string;
    clock_out: string | null;
    staff_name: string;
}

export type MainView = 'bento' | 'tables' | 'takeaway' | 'history' | 'reports' | 'online_orders' | 'stock_inventory' | 'kitchen_tickets' | 'staff_roster' | 'crm_customers' | 'table_config' | 'gst_settings';
export type PayMethod = 'cash' | 'card' | 'upi' | 'split';

export interface ActiveStaffUser {
    id: string;
    name: string;
    roleName: string;
    permissions: string[];
    phone?: string | null;
    auth_id?: string | null;
}

export interface BillingWorkspaceNavProps {
    activeView: MainView;
    onViewChange: (view: MainView) => void;
    onOpenShift: () => void;
    activeTableCount: number;
    pendingSettlementCount: number;
    onlineOrderCount: number;
    stats?: any;
}
