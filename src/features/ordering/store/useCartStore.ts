import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string; // unique mapping ID for the cart (e.g. menu_item_id + notes)
    menu_item_id: string;
    name: string;
    price: number;
    qty: number;
    notes?: string;
}

export interface CustomerSession {
    name: string;
    phone: string;
    table_no: number;
    active_order_id?: string; // Set when they submit the first batch
}

interface CartStore {
    customer: CustomerSession | null;
    items: CartItem[];
    setCustomer: (session: CustomerSession) => void;
    setActiveOrder: (orderId: string) => void;
    clearActiveOrder: () => void;
    addItem: (item: Omit<CartItem, 'id'>) => void;
    removeItem: (id: string) => void;
    updateQty: (id: string, qty: number) => void;
    clearCart: () => void;
    isOnboarded: boolean;
    setOnboarded: (status: boolean) => void;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set) => ({
            customer: null,
            items: [],
            isOnboarded: false,

            setOnboarded: (status) => set({ isOnboarded: status }),
            setCustomer: (session) => set({ customer: session }),

            setActiveOrder: (orderId) => set((state) => ({ 
                customer: state.customer ? { ...state.customer, active_order_id: orderId } : null 
            })),

            clearActiveOrder: () => set((state) => ({
                customer: state.customer ? { ...state.customer, active_order_id: undefined } : null
            })),

            addItem: (item) => set((state) => {
                // Find if identical item + notes already exists
                const existingIdx = state.items.findIndex(
                    (i) => i.menu_item_id === item.menu_item_id && i.notes === item.notes
                );

                if (existingIdx !== -1) {
                    const newItems = [...state.items];
                    newItems[existingIdx].qty += item.qty;
                    return { items: newItems };
                }

                // Generate unique ID based on item + timestamp for generic cart handling
                const id = `${item.menu_item_id}-${Date.now()}`;
                return { items: [...state.items, { ...item, id }] };
            }),

            removeItem: (id) => set((state) => ({
                items: state.items.filter((i) => i.id !== id)
            })),

            updateQty: (id, qty) => set((state) => {
                if (qty <= 0) {
                    return { items: state.items.filter((i) => i.id !== id) };
                }
                return {
                    items: state.items.map((i) => i.id === id ? { ...i, qty } : i)
                };
            }),

            clearCart: () => set({ items: [] }),
        }),
        {
            name: 'taj-ooty-ordering-storage',
        }
    )
);
