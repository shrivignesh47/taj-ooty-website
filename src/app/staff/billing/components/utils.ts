import { CashierOrder, CashierOrderItem } from '../types';

export function orderItemTotal(i: { price_at_order: number; qty: number; discount_percent?: number | null }) {
    const disc = (i.discount_percent && i.discount_percent > 0) ? Number(i.discount_percent) : 0;
    return i.price_at_order * i.qty * (1 - disc / 100);
}

export function orderTotal(order: CashierOrder) {
    if (!order || !order.order_items) return 0;
    return order.order_items.reduce((s, i) => s + orderItemTotal(i), 0);
}

export function fmt(n: number) {
    return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
