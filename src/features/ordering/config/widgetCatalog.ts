export interface WidgetItem {
    id: string;
    label: string;
    description: string;
    default: boolean;
}

export type StaffRole = 'admin' | 'cashier' | 'waiter' | 'kitchen';

export const WIDGET_CATALOG: Record<StaffRole, WidgetItem[]> = {
    cashier: [
        { id: 'floor_map', label: 'Dine-In Floor Map', description: 'Interactive table floor plan for billing & occupancy', default: true },
        { id: 'takeaway_desk', label: 'Takeaway & Counter Express', description: 'Counter takeaway order queue & quick creator', default: true },
        { id: 'kot_monitor', label: 'Live Kitchen Tickets Queue', description: 'Realtime KOT preparation monitor & status controls', default: true },
        { id: 'aggregator_gates', label: 'Aggregator Gates (Swiggy/Zomato)', description: 'Third-party delivery order sync & status alerts', default: true },
        { id: 'cash_register', label: 'Cash Drawer Register', description: 'Shift float balancing & cash drawer status', default: true },
        { id: 'stock_availability', label: 'Menu Stock Availability', description: 'Instant item stock toggles & limited quantities', default: false },
        { id: 'staff_attendance', label: 'Staff Attendance Register', description: 'Shift clock-in & clock-out register', default: false },
        { id: 'trending_dish', label: 'Popular Trending Dish', description: 'Realtime top seller dish analytics', default: false },
    ],
    admin: [
        { id: 'admin_revenue_stats', label: 'Revenue & Financial Metrics', description: 'Shift gross sales, payment breakdown & total bills', default: true },
        { id: 'admin_live_tables', label: 'Live Restaurant Floor Map', description: 'Realtime dining floor map & occupancy monitoring', default: true },
        { id: 'admin_staff_management', label: 'Staff Roster & Roles', description: 'Manage staff credentials, permissions & roles', default: true },
        { id: 'admin_kot_monitor', label: 'Kitchen KOT Tickets Monitor', description: 'Realtime kitchen prep queue supervision', default: true },
        { id: 'admin_menu_stock', label: 'Menu Stock Availability', description: 'Global item stock management & pricing', default: true },
        { id: 'admin_top_items', label: 'Trending Popular Dishes', description: 'Top performing dishes by quantity & revenue', default: true },
        { id: 'admin_activity_log', label: 'Audit Activity Logs', description: 'Security audit trail of discounts & staff actions', default: false },
    ],
    waiter: [
        { id: 'waiter_tables_grid', label: 'My Assigned Tables Map', description: 'Interactive table grid for table selection & order entry', default: true },
        { id: 'waiter_active_orders', label: 'My Active Guest Orders', description: 'Live status of guest orders assigned to you', default: true },
        { id: 'waiter_kot_ready', label: 'Kitchen Ready Pickup Alerts', description: 'Instant notifications when kitchen marks dish ready', default: true },
        { id: 'waiter_quick_order', label: 'New Order Creator', description: 'Quick item picker for taking guest orders', default: true },
    ],
    kitchen: [
        { id: 'kitchen_kot_queue', label: 'Live KOT Preparation Queue', description: 'Realtime order tickets grouped by table & elapsed time', default: true },
        { id: 'kitchen_preparing_summary', label: 'In-Preparation Summary', description: 'Items currently being cooked on kitchen stations', default: true },
        { id: 'kitchen_all_day_counts', label: 'All-Day Item Quantities', description: 'Aggregated item portion counts for current shift', default: true },
        { id: 'kitchen_stock_toggle', label: 'Quick Menu Stock Out', description: 'Quickly mark depleted menu items out of stock', default: false },
    ]
};

export function normalizeStaffRole(roleName: string): StaffRole {
    const key = roleName.trim().toLowerCase();
    if (key in WIDGET_CATALOG) return key as StaffRole;
    return 'cashier';
}

export function getDefaultPreferences(role: StaffRole): { visible: string[]; order: string[] } {
    const catalog = WIDGET_CATALOG[role] || WIDGET_CATALOG.cashier;
    const defaults = catalog.filter(w => w.default).map(w => w.id);
    const fullOrder = catalog.map(w => w.id);
    return {
        visible: defaults,
        order: fullOrder
    };
}
