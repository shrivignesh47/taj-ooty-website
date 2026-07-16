export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'billed' | 'cancelled' | 'on_hold';

export interface Role {
    id: string;
    name: string;
    is_custom: boolean;
    created_at: string;
}

export interface Permission {
    id: string;
    key: string;
}

export interface RolePermission {
    role_id: string;
    permission_id: string;
}

export interface StaffUser {
    id: string;
    auth_id: string | null;
    name: string;
    phone: string | null;
    role_id: string;
    is_active: boolean;
    created_at: string;
}

export interface RestaurantTable {
    id: string;
    table_no: number;
    qr_code_url: string | null;
    assigned_waiter_id: string | null;
}

export interface Category {
    id: string;
    name: string;
    sort_order: number;
}

export interface MenuItem {
    id: string;
    category_id: string;
    name: string;
    price: number;
    image_url: string | null;
    is_available: boolean;
    stock_qty: number | null;
}

export interface Order {
    id: string;
    table_id: string;
    customer_name: string;
    customer_phone: string;
    status: OrderStatus;
    waiter_id: string | null;
    created_at: string;
    token_no?: string | null;
    source?: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id: string;
    qty: number;
    notes: string | null;
    price_at_order: number;
}

export interface OrderStatusHistory {
    id: string;
    order_id: string;
    status: string;
    changed_by: string | null;
    changed_at: string;
}

export interface Bill {
    id: string;
    order_id: string;
    total: number;
    cashier_id: string | null;
    paid_at: string | null;
}
