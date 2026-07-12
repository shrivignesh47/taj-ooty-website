export interface CashierOrderItem {
    id: string;
    qty: number;
    price_at_order: number;
    notes?: string | null;
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

export type MainView = 'bento' | 'tables' | 'takeaway' | 'history' | 'reports';
export type PayMethod = 'cash' | 'card' | 'upi';
