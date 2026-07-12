import { CashierOrder } from '../types';

export function orderTotal(order: CashierOrder) {
    return order.order_items.reduce((s, i) => s + i.price_at_order * i.qty, 0);
}

export function fmt(n: number) {
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
