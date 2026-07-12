/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/features/ordering/lib/supabase';
import { 
    Inbox, Utensils, History, ChefHat, User, Settings, Bell, CheckCircle2, 
    X, Trash2, Plus, Minus, Send, Search, Printer, AlertTriangle, 
    Loader2, Volume2, VolumeX, Edit3, ClipboardList, Info, LogOut, Phone, Shield, Clock, Download 
} from 'lucide-react';
import { acceptAndConfirmOrder, cancelOrder, markOrderServed, sendTableToCashier, addItemsToOrder, updateOrderItemQty, deleteOrderItem } from '@/features/ordering/actions/waiterActions';
import { updateStaffSelf, resetStaffPassword } from '@/features/ordering/actions/staffActions';
import { logoutStaff, verifyStaff } from '@/features/ordering/actions/auth';
import { MenuCatalog, getLiveCatalog } from '@/features/ordering/api/getCatalog';

type LiveOrder = {
    id: string;
    table_id: string | null;
    waiter_id: string | null;
    customer_name: string;
    customer_phone: string;
    status: string;
    created_at: string;
    restaurant_tables: { id: string; table_no: number } | null;
    order_items: {
        id: string;
        order_id: string;
        menu_item_id: string;
        qty: number;
        price_at_order: number;
        status: string;
        notes: string | null;
        menu_items: { name: string } | null;
    }[];
    order_status_history?: { status: string; changed_at: string }[];
};

type RestaurantTable = {
    id: string;
    table_no: number;
    created_at: string;
};

function playPingSound() {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.error('Audio beep failed', e);
    }
}

function ElapsedTimer({ createdAt }: { createdAt: string }) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const update = () => {
            const diff = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 1000);
            setSeconds(Math.max(0, diff));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [createdAt]);

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const isOverdue = seconds >= 300; // 5 minutes

    return (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isOverdue ? 'bg-red-600 text-white animate-pulse' : 'bg-[#C9974A]/20 text-[#4E1414]'}`}>
            {label}
        </span>
    );
}

export function WaiterDash({ activeUser, catalog }: { activeUser: any, catalog?: MenuCatalog }) {
    const [userPermissions, setUserPermissions] = useState<string[]>(activeUser.permissions || []);
    const [tab, setTab] = useState<'incoming' | 'tables' | 'history' | 'kitchen' | 'settings'>(() => {
        const isAdmin = activeUser.roleName?.toLowerCase() === 'admin';
        const hasConfirm = isAdmin || activeUser.permissions?.includes('confirm_orders');
        const hasView = isAdmin || activeUser.permissions?.includes('view_orders');
        return hasConfirm ? 'incoming' : (hasView ? 'tables' : 'settings');
    });

    const [ordersList, setOrdersList] = useState<LiveOrder[]>([]);
    const [tablesList, setTablesList] = useState<RestaurantTable[]>([]);
    const [posCatalog, setPosCatalog] = useState<MenuCatalog | null>(catalog || null);
    
    // Realtime connection states
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'subscribed' | 'error'>('connecting');
    const [loading, setLoading] = useState(true);

    // UI Preferences
    const [fontSize, setFontSize] = useState<'S' | 'M' | 'L'>('M');
    const [soundAlerts, setSoundAlerts] = useState(true);
    const [newOrderSound, setNewOrderSound] = useState(true);

    // Bottom drawers / modals state
    const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);
    const [showConfirmDrawer, setShowConfirmDrawer] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('Customer changed mind');
    const [rejectCustomReason, setRejectCustomReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Edit Order drawer state (for initial confirmation)
    const [drawerItems, setDrawerItems] = useState<any[]>([]);
    const [menuSearchQuery, setMenuSearchQuery] = useState('');

    // Add / Edit Active Order drawer state (for existing active orders)
    const [showEditActiveDrawer, setShowEditActiveDrawer] = useState(false);
    const [editingActiveOrder, setEditingActiveOrder] = useState<LiveOrder | null>(null);
    const [editExistingItems, setEditExistingItems] = useState<any[]>([]);
    const [newItemsToAdd, setNewItemsToAdd] = useState<any[]>([]);
    const [editActiveSearchQuery, setEditActiveSearchQuery] = useState('');

    // Notification dropdown state
    const [showNotifications, setShowNotifications] = useState(false);

    // History filter
    const [historyPeriod, setHistoryPeriod] = useState<'today' | 'yesterday' | 'week'>('today');
    const [expandedHistoryOrder, setExpandedHistoryOrder] = useState<string | null>(null);

    // Assigned Table Detail Modal
    const [selectedTable, setSelectedTable] = useState<any | null>(null);

    // Sound effects triggers
    const prevPendingCount = useRef(0);

    const hasPerm = useCallback((requiredPerm: string) => {
        if (!activeUser) return false;
        if (activeUser.roleName?.toLowerCase() === 'admin') return true;
        return userPermissions.includes(requiredPerm);
    }, [activeUser, userPermissions]);

    // Data fetcher
    const fetchData = useCallback(async () => {
        try {
            const [ordersRes, tablesRes] = await Promise.all([
                supabase
                    .from('orders')
                    .select(`
                        *,
                        restaurant_tables (*),
                        order_items (
                            *,
                            menu_items (name)
                        ),
                        order_status_history (
                            status,
                            changed_at
                        )
                    `)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('restaurant_tables')
                    .select('*')
                    .order('table_no')
            ]);

            if (ordersRes.data) setOrdersList(ordersRes.data as unknown as LiveOrder[]);
            if (tablesRes.data) setTablesList(tablesRes.data as unknown as RestaurantTable[]);
        } catch (err) {
            console.error('Failed to sync waiter data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load initial data and catalog
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
        if (!posCatalog) {
            getLiveCatalog().then(setPosCatalog);
        }

        // Initialize preferences from localStorage
        const storedSize = localStorage.getItem('font_size');
        if (storedSize === 'S' || storedSize === 'M' || storedSize === 'L') setFontSize(storedSize);

        const storedAlerts = localStorage.getItem('sound_alerts_enabled');
        if (storedAlerts !== null) setSoundAlerts(storedAlerts !== 'false');

        const storedNewOrder = localStorage.getItem('new_order_sound_enabled');
        if (storedNewOrder !== null) setNewOrderSound(storedNewOrder !== 'false');
    }, [fetchData, posCatalog]);

    // Realtime channel subscriptions
    useEffect(() => {
        const updatePermissions = async () => {
            const res = await verifyStaff();
            if (res.success && res.user) {
                const newPerms = res.user.permissions || [];
                setUserPermissions(newPerms);

                const isAdmin = activeUser.roleName?.toLowerCase() === 'admin';
                if (!isAdmin) {
                    setTab(currentTab => {
                        if (currentTab === 'kitchen' && !newPerms.includes('view_kitchen_queue')) {
                            const hasConfirm = newPerms.includes('confirm_orders');
                            const hasView = newPerms.includes('view_orders');
                            return hasConfirm ? 'incoming' : (hasView ? 'tables' : 'settings');
                        }
                        if (currentTab === 'incoming' && !newPerms.includes('confirm_orders')) {
                            const hasView = newPerms.includes('view_orders');
                            return hasView ? 'tables' : 'settings';
                        }
                        return currentTab;
                    });
                }
            }
        };

        // Realtime channels
        const channelPending = supabase.channel('waiter-pending')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchData(); updatePermissions(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => { fetchData(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history' }, () => { fetchData(); });

        const channelActive = supabase.channel('waiter-active')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchData(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => { fetchData(); });

        const channelTables = supabase.channel('waiter-tables')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => { fetchData(); });

        channelPending.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                setRealtimeStatus('subscribed');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                setRealtimeStatus('error');
            }
        });

        channelActive.subscribe();
        channelTables.subscribe();

        return () => {
            supabase.removeChannel(channelPending);
            supabase.removeChannel(channelActive);
            supabase.removeChannel(channelTables);
        };
    }, [fetchData, activeUser.roleName]);

    // Play new order alerts
    useEffect(() => {
        const pendingCount = ordersList.filter(o => o.status === 'pending').length;
        if (pendingCount > prevPendingCount.current) {
            if (soundAlerts && newOrderSound) {
                playPingSound();
            }
        }
        prevPendingCount.current = pendingCount;
    }, [ordersList, soundAlerts, newOrderSound]);

    // Derived states
    const pendingOrders = useMemo(() => ordersList.filter(o => o.status === 'pending'), [ordersList]);
    const activeOrders = useMemo(() => ordersList.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status)), [ordersList]);
    const myActiveOrders = useMemo(() => activeOrders.filter(o => o.waiter_id === activeUser.id), [activeOrders, activeUser.id]);

    const historyOrders = useMemo(() => {
        return ordersList.filter(o => {
            if (!['billed', 'cancelled', 'served'].includes(o.status)) return false;
            
            const date = new Date(o.created_at);
            const now = new Date();
            
            if (historyPeriod === 'today') {
                return date.toDateString() === now.toDateString();
            } else if (historyPeriod === 'yesterday') {
                const yesterday = new Date();
                yesterday.setDate(now.getDate() - 1);
                return date.toDateString() === yesterday.toDateString();
            } else {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);
                return date >= oneWeekAgo;
            }
        });
    }, [ordersList, historyPeriod]);

    // Group active tables
    const tablesWithStatus = useMemo(() => {
        return tablesList.map(table => {
            const activeForTable = ordersList.filter(o => o.table_id === table.id && !['billed', 'cancelled'].includes(o.status));
            
            let status: 'Empty' | 'Occupied' | 'Served' | 'Needs Bill' = 'Empty';
            let customerName = '';
            let oldestCreatedAt = '';

            if (activeForTable.length > 0) {
                // Find oldest timestamp
                const sorted = [...activeForTable].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                oldestCreatedAt = sorted[0].created_at;
                customerName = sorted[0].customer_name;

                const allServed = activeForTable.every(o => o.status === 'served');
                const hasReady = activeForTable.some(o => o.status === 'ready');
                
                if (allServed) {
                    status = 'Needs Bill';
                } else if (hasReady) {
                    status = 'Served';
                } else {
                    status = 'Occupied';
                }
            }

            return {
                ...table,
                status,
                customerName,
                oldestCreatedAt,
                orders: activeForTable
            };
        });
    }, [tablesList, ordersList]);

    // Handle Confirm Drawer State
    const openConfirmDrawer = (order: LiveOrder) => {
        setSelectedOrder(order);
        setDrawerItems(order.order_items.map(item => ({
            id: item.id,
            menu_item_id: item.menu_item_id,
            qty: item.qty,
            notes: item.notes,
            price: item.price_at_order,
            name: item.menu_items?.name || 'Unknown item'
        })));
        setMenuSearchQuery('');
        setShowConfirmDrawer(true);
    };

    const handleUpdateItemQty = (index: number, newQty: number) => {
        if (newQty <= 0) {
            setDrawerItems(drawerItems.filter((_, idx) => idx !== index));
        } else {
            setDrawerItems(drawerItems.map((item, idx) => idx === index ? { ...item, qty: newQty } : item));
        }
    };

    const handleRemoveDrawerItem = (index: number) => {
        setDrawerItems(drawerItems.filter((_, idx) => idx !== index));
    };

    const handleAddCatalogItem = (menuItem: any) => {
        const existingIdx = drawerItems.findIndex(i => i.menu_item_id === menuItem.id);
        if (existingIdx >= 0) {
            handleUpdateItemQty(existingIdx, drawerItems[existingIdx].qty + 1);
        } else {
            setDrawerItems([...drawerItems, {
                menu_item_id: menuItem.id,
                qty: 1,
                price: menuItem.price,
                name: menuItem.name
            }]);
        }
    };

    const submitConfirm = async () => {
        if (!selectedOrder) return;
        if (drawerItems.length === 0) {
            alert('Order cannot be empty. Please add items or reject the order.');
            return;
        }

        setSubmitting(true);
        const res = await acceptAndConfirmOrder(
            selectedOrder.id,
            activeUser.id,
            selectedOrder.restaurant_tables?.table_no,
            drawerItems
        );

        if (res.success) {
            setShowConfirmDrawer(false);
            fetchData();
        } else {
            alert(res.error || 'Failed to confirm order');
        }
        setSubmitting(false);
    };

    // Rejection handlers
    const openRejectModal = (order: LiveOrder) => {
        setSelectedOrder(order);
        setRejectReason('Customer changed mind');
        setRejectCustomReason('');
        setShowRejectModal(true);
    };

    const submitReject = async () => {
        if (!selectedOrder) return;
        setSubmitting(true);
        const finalReason = rejectReason === 'Other' ? rejectCustomReason : rejectReason;
        const res = await cancelOrder(selectedOrder.id, activeUser.id, finalReason);
        if (res.success) {
            setShowRejectModal(false);
            fetchData();
        } else {
            alert(res.error || 'Failed to reject order');
        }
        setSubmitting(false);
    };

    // Serving handlers
    const handleMarkServed = async (orderId: string) => {
        setSubmitting(true);
        const res = await markOrderServed(orderId, activeUser.id);
        if (res.success) {
            fetchData();
        } else {
            alert(res.error || 'Failed to mark as served');
        }
        setSubmitting(false);
    };

    // Active Order Add/Edit handlers
    const openEditActiveOrderDrawer = (order: LiveOrder) => {
        setEditingActiveOrder(order);
        setEditExistingItems((order.order_items || []).map(item => ({
            id: item.id,
            menu_item_id: item.menu_item_id,
            qty: item.qty,
            notes: item.notes || '',
            price: item.price_at_order,
            name: item.menu_items?.name || 'Item',
            status: item.status
        })));
        setNewItemsToAdd([]);
        setEditActiveSearchQuery('');
        setShowEditActiveDrawer(true);
    };

    const handleUpdateExistingQty = async (index: number, newQty: number) => {
        const item = editExistingItems[index];
        if (!item) return;
        
        if (newQty <= 0) {
            setSubmitting(true);
            const res = await deleteOrderItem(item.id);
            if (res.success) {
                setEditExistingItems(editExistingItems.filter((_, idx) => idx !== index));
                fetchData();
            } else {
                alert(res.error || 'Failed to delete item');
            }
            setSubmitting(false);
        } else {
            setSubmitting(true);
            const res = await updateOrderItemQty(item.id, newQty);
            if (res.success) {
                setEditExistingItems(editExistingItems.map((it, idx) => idx === index ? { ...it, qty: newQty } : it));
                fetchData();
            } else {
                alert(res.error || 'Failed to update item quantity');
            }
            setSubmitting(false);
        }
    };

    const handleRemoveExistingItem = async (index: number) => {
        const item = editExistingItems[index];
        if (!item) return;
        setSubmitting(true);
        const res = await deleteOrderItem(item.id);
        if (res.success) {
            setEditExistingItems(editExistingItems.filter((_, idx) => idx !== index));
            fetchData();
        } else {
            alert(res.error || 'Failed to delete item');
        }
        setSubmitting(false);
    };

    const handleUpdateNewItemQty = (index: number, newQty: number) => {
        if (newQty <= 0) {
            setNewItemsToAdd(newItemsToAdd.filter((_, idx) => idx !== index));
        } else {
            setNewItemsToAdd(newItemsToAdd.map((item, idx) => idx === index ? { ...item, qty: newQty } : item));
        }
    };

    const handleAddNewItemToCart = (menuItem: any) => {
        const existingIdx = newItemsToAdd.findIndex(i => i.menu_item_id === menuItem.id);
        if (existingIdx >= 0) {
            handleUpdateNewItemQty(existingIdx, newItemsToAdd[existingIdx].qty + 1);
        } else {
            setNewItemsToAdd([...newItemsToAdd, {
                menu_item_id: menuItem.id,
                qty: 1,
                price: menuItem.price,
                name: menuItem.name,
                category_name: menuItem.categories?.name || 'Dish'
            }]);
        }
    };

    const submitAddNewItems = async () => {
        if (!editingActiveOrder) return;
        if (newItemsToAdd.length === 0) {
            setShowEditActiveDrawer(false);
            return;
        }

        setSubmitting(true);
        const res = await addItemsToOrder(
            editingActiveOrder.id,
            activeUser.id,
            newItemsToAdd.map(item => ({
                menu_item_id: item.menu_item_id,
                qty: item.qty,
                price_at_order: item.price
            }))
        );

        if (res.success) {
            setShowEditActiveDrawer(false);
            setNewItemsToAdd([]);
            fetchData();
        } else {
            alert(res.error || 'Failed to add items to order');
        }
        setSubmitting(false);
    };

    // Send table to cashier
    const handleSendTableToCashier = async (tableId: string) => {
        setSubmitting(true);
        const res = await sendTableToCashier(tableId, activeUser.id);
        if (res.success) {
            setSelectedTable(null);
            fetchData();
        } else {
            alert(res.error || 'Failed to send table billing.');
        }
        setSubmitting(false);
    };

    // CSV exporter
    const handleExportCSV = () => {
        const headers = ['Time', 'Table', 'Customer', 'Items Count', 'Total Amount', 'Status'];
        const rows = historyOrders.map(o => {
            const timeStr = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const total = o.order_items?.reduce((sum, i) => sum + (i.price_at_order * i.qty), 0) || 0;
            return [
                timeStr,
                `Table ${o.restaurant_tables?.table_no || '?'}`,
                o.customer_name,
                o.order_items?.reduce((sum, i) => sum + i.qty, 0) || 0,
                `INR ${total}`,
                o.status.toUpperCase()
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `waiter_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Search catalog items
    const filteredCatalogItems = useMemo(() => {
        if (!posCatalog || !menuSearchQuery) return [];
        return posCatalog.menuItems.filter((item: any) => 
            item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
            item.categories?.name?.toLowerCase().includes(menuSearchQuery.toLowerCase())
        );
    }, [posCatalog, menuSearchQuery]);

    // Active orders totals
    const historyRevenue = useMemo(() => {
        return historyOrders
            .filter(o => o.status === 'billed')
            .reduce((sum, o) => sum + (o.order_items?.reduce((s, i) => s + (i.price_at_order * i.qty), 0) || 0), 0);
    }, [historyOrders]);

    return (
        <div className={`
            ${fontSize === 'S' ? 'text-xs' : fontSize === 'L' ? 'text-base' : 'text-sm'}
            min-h-screen bg-[#F6EEDF] pb-24 font-sans antialiased text-[#241B15] transition-all duration-300
        `}>
            
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#350C0C] text-[#F6EEDF] px-4 py-3 flex justify-between items-center shadow-lg border-b border-[#C9974A]/30">
                <div className="flex items-center gap-2.5">
                    <div className="bg-[#C9974A] p-1.5 rounded-lg text-[#350C0C] font-black">
                        <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-display font-black text-base lg:text-lg tracking-tight leading-none text-white">Hotel Taj</h1>
                        <span className="text-[10px] font-bold tracking-wider text-[#C9974A] uppercase">Waiter Center</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Notification Bell */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors relative"
                        >
                            <Bell className="w-5 h-5 text-[#F6EEDF]" />
                            {pendingOrders.length > 0 && (
                                <span className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center animate-bounce">
                                    {pendingOrders.length}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-3 w-80 bg-white text-[#241B15] rounded-xl shadow-2xl border border-[#C9974A]/20 py-2 z-50">
                                <h3 className="px-4 py-1.5 font-black text-[#4E1414] border-b border-gray-100 text-xs uppercase tracking-wider">Pending Alerts</h3>
                                <div className="max-h-60 overflow-y-auto">
                                    {pendingOrders.map(order => (
                                        <div 
                                            key={order.id}
                                            onClick={() => {
                                                setTab('incoming');
                                                setShowNotifications(false);
                                                setTimeout(() => {
                                                    document.getElementById(`pending-order-${order.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 100);
                                            }}
                                            className="px-4 py-2 hover:bg-[#F6EEDF]/40 cursor-pointer border-b border-gray-50 last:border-0"
                                        >
                                            <p className="font-black text-xs">Table {order.restaurant_tables?.table_no || '?'}</p>
                                            <p className="text-[11px] text-gray-500">Customer: {order.customer_name}</p>
                                        </div>
                                    ))}
                                    {pendingOrders.length === 0 && (
                                        <p className="px-4 py-6 text-center text-xs text-gray-400 italic">No alerts right now.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Avatar / Waiter Profile trigger */}
                    <button 
                        onClick={() => setTab('settings')}
                        className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        <div className="w-8 h-8 rounded-full bg-[#C9974A] text-[#350C0C] flex items-center justify-center text-xs font-black uppercase ring-2 ring-[#C9974A]/30">
                            {activeUser.name ? activeUser.name.split(' ').map((w: string) => w.charAt(0)).join('').substring(0, 2) : 'WT'}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-xs font-black text-white">{activeUser.name}</p>
                            <span className="text-[9px] bg-[#C9974A]/20 text-[#C9974A] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">{activeUser.roleName || 'Staff'}</span>
                        </div>
                    </button>
                </div>
            </header>

            {/* Sticky Sub-Header Tab Switcher */}
            <div className="sticky top-[53px] z-30 bg-[#F6EEDF]/90 backdrop-blur-md py-2 border-b border-[#C9974A]/20 shadow-sm">
                <div className="mx-4 flex gap-1 bg-[#4E1414]/5 p-1 rounded-xl overflow-x-auto hide-scrollbar">
                    {hasPerm('confirm_orders') && (
                        <button 
                            onClick={() => setTab('incoming')}
                            className={`flex-1 min-w-[70px] px-2.5 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${tab === 'incoming' ? 'bg-[#4E1414] text-[#F6EEDF] shadow' : 'text-[#4E1414] hover:bg-[#4E1414]/10'}`}
                        >
                            <Inbox className="w-3.5 h-3.5" />
                            Queue
                            {realtimeStatus === 'subscribed' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block" />
                            )}
                            {pendingOrders.length > 0 && (
                                <span className="bg-red-600 text-white min-w-4 h-4 px-1 rounded-full text-[9px] flex items-center justify-center font-black">
                                    {pendingOrders.length}
                                </span>
                            )}
                        </button>
                    )}

                    {hasPerm('view_orders') && (
                        <>
                            <button 
                                onClick={() => setTab('tables')}
                                className={`flex-1 min-w-[70px] px-2.5 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${tab === 'tables' ? 'bg-[#4E1414] text-[#F6EEDF] shadow' : 'text-[#4E1414] hover:bg-[#4E1414]/10'}`}
                            >
                                <Utensils className="w-3.5 h-3.5" />
                                Tables
                            </button>
                            <button 
                                onClick={() => setTab('history')}
                                className={`flex-1 min-w-[70px] px-2.5 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${tab === 'history' ? 'bg-[#4E1414] text-[#F6EEDF] shadow' : 'text-[#4E1414] hover:bg-[#4E1414]/10'}`}
                            >
                                <History className="w-3.5 h-3.5" />
                                History
                            </button>
                        </>
                    )}

                    {hasPerm('view_kitchen_queue') && (
                        <button 
                            onClick={() => setTab('kitchen')}
                            className={`flex-1 min-w-[70px] px-2.5 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${tab === 'kitchen' ? 'bg-[#4E1414] text-[#F6EEDF] shadow' : 'text-[#4E1414] hover:bg-[#4E1414]/10'}`}
                        >
                            <ChefHat className="w-3.5 h-3.5" />
                            Kitchen
                        </button>
                    )}

                    <button 
                        onClick={() => setTab('settings')}
                        className={`flex-1 min-w-[70px] px-2.5 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${tab === 'settings' ? 'bg-[#4E1414] text-[#F6EEDF] shadow' : 'text-[#4E1414] hover:bg-[#4E1414]/10'}`}
                    >
                        <User className="w-3.5 h-3.5" />
                        Profile
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="px-4 py-4 max-w-7xl mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-[#4E1414]" />
                        <p className="text-sm font-bold text-[#4E1414] animate-pulse">Syncing orders...</p>
                    </div>
                ) : (
                    <>
                        {/* TAB 1: Queue */}
                        {tab === 'incoming' && (
                            <div className="space-y-8">
                                {/* Section A: Pending Orders */}
                                <div>
                                    <h2 className="text-xs font-black uppercase text-[#4E1414] tracking-widest mb-3 flex items-center gap-2">
                                        <Inbox className="w-4 h-4" /> Pending Approvals ({pendingOrders.length})
                                    </h2>

                                    {pendingOrders.length === 0 ? (
                                        <div className="bg-white border border-[#C9974A]/20 rounded-2xl p-8 text-center shadow-sm">
                                            <p className="text-sm text-[#4E1414] font-black">✅ All clear! No pending orders.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {pendingOrders.map(order => {
                                                const orderTotal = order.order_items?.reduce((sum, item) => sum + (item.price_at_order * item.qty), 0) || 0;
                                                return (
                                                    <div 
                                                        key={order.id} 
                                                        id={`pending-order-${order.id}`}
                                                        className="bg-white rounded-2xl p-4 border border-[#C9974A]/20 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                                                    >
                                                        <div>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <span className="text-sm font-black text-[#4E1414]">Table {order.restaurant_tables?.table_no || '?'}</span>
                                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{order.customer_name}</p>
                                                                    <p className="text-[10px] text-gray-400 font-medium">{order.customer_phone}</p>
                                                                </div>
                                                                <ElapsedTimer createdAt={order.created_at} />
                                                            </div>

                                                            <ul className="text-xs border-y border-gray-100 py-2.5 my-2.5 space-y-1">
                                                                {order.order_items.map((item, idx) => (
                                                                    <li key={idx} className="flex justify-between font-medium">
                                                                        <span className="text-gray-700">
                                                                            <b className="text-[#4E1414] mr-1">{item.qty}x</b> {item.menu_items?.name || 'Unknown item'}
                                                                        </span>
                                                                        <span className="text-gray-400 font-bold">₹{item.price_at_order * item.qty}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between items-center mb-4">
                                                                <span className="text-xs font-bold text-gray-400">Total Bill</span>
                                                                <span className="text-sm font-black text-[#4E1414]">₹{orderTotal}</span>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button 
                                                                    onClick={() => openRejectModal(order)}
                                                                    className="border border-red-200 hover:border-red-600 text-red-600 font-bold py-2 rounded-xl text-xs transition-colors"
                                                                >
                                                                    Reject
                                                                </button>
                                                                <button 
                                                                    onClick={() => openConfirmDrawer(order)}
                                                                    className="bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF] font-bold py-2 rounded-xl text-xs transition-colors shadow-sm"
                                                                >
                                                                    View & Confirm
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Section B: Active Orders */}
                                <div>
                                    <h2 className="text-xs font-black uppercase text-[#4E1414] tracking-widest mb-3 flex items-center gap-2">
                                        <Utensils className="w-4 h-4" /> Active Line ({myActiveOrders.length})
                                    </h2>

                                    {myActiveOrders.length === 0 ? (
                                        <div className="bg-white border border-[#C9974A]/20 rounded-2xl p-8 text-center shadow-sm">
                                            <p className="text-sm text-gray-400 italic">No active orders right now.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {myActiveOrders.map(order => {
                                                const orderTotal = order.order_items?.reduce((sum, item) => sum + (item.price_at_order * item.qty), 0) || 0;
                                                const readyCount = order.order_items?.filter(i => i.status === 'ready').length || 0;
                                                const allReady = order.order_items?.every(i => i.status === 'ready') || false;

                                                return (
                                                    <div 
                                                        key={order.id} 
                                                        className="bg-white rounded-2xl p-4 border border-[#C9974A]/20 shadow-sm flex flex-col justify-between"
                                                    >
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <div>
                                                                    <span className="text-sm font-black text-[#4E1414]">Table {order.restaurant_tables?.table_no || '?'}</span>
                                                                    <p className="text-[10px] text-gray-500 font-bold">{order.customer_name}</p>
                                                                </div>
                                                                <span className="text-[10px] font-bold uppercase bg-white border border-[#C9974A]/30 px-2.5 py-1 rounded-lg text-[#4E1414] shadow-sm">
                                                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>

                                                            {/* Stepper Progress */}
                                                            <div className="flex items-center justify-between mb-4 mt-2">
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold ${['confirmed','preparing','ready'].includes(order.status) ? 'bg-[#4E1414] text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                                                                    <span className="text-[9px] font-bold text-gray-400 mt-1">Confirmed</span>
                                                                </div>
                                                                <div className={`flex-1 h-0.5 mx-1 ${['preparing','ready'].includes(order.status) ? 'bg-[#4E1414]' : 'bg-gray-200'}`} />
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold ${['preparing','ready'].includes(order.status) ? 'bg-[#4E1414] text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                                                                    <span className="text-[9px] font-bold text-gray-400 mt-1">Preparing</span>
                                                                </div>
                                                                <div className={`flex-1 h-0.5 mx-1 ${order.status === 'ready' ? 'bg-[#4E1414]' : 'bg-gray-200'}`} />
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold ${order.status === 'ready' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                                                                    <span className="text-[9px] font-bold text-gray-400 mt-1">Ready</span>
                                                                </div>
                                                            </div>

                                                            <ul className="text-xs border-y border-gray-100 py-2.5 my-2.5 space-y-1">
                                                                {order.order_items.map((item, idx) => (
                                                                    <li key={idx} className="flex justify-between font-medium">
                                                                        <span>
                                                                            <b className="text-[#4E1414] mr-1">{item.qty}x</b> {item.menu_items?.name}
                                                                        </span>
                                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                                                            item.status === 'ready' ? 'bg-green-100 text-green-700' :
                                                                            item.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                                                                            'bg-gray-100 text-gray-500'
                                                                        }`}>
                                                                            {item.status}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        <div className="space-y-2 pt-2 border-t border-gray-100">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-bold text-gray-400">Total Bill</span>
                                                                <span className="text-sm font-black text-[#4E1414]">₹{orderTotal}</span>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    onClick={() => openEditActiveOrderDrawer(order)}
                                                                    className="bg-[#C9974A] hover:bg-[#b8863b] text-[#4E1414] font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-xs active:scale-95"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                                                    + Add / Edit Food
                                                                </button>

                                                                {order.status === 'ready' || allReady ? (
                                                                    <button 
                                                                        onClick={() => handleMarkServed(order.id)}
                                                                        disabled={submitting}
                                                                        className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 active:scale-95"
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        Mark Served
                                                                    </button>
                                                                ) : (
                                                                    <div className="text-center py-2 bg-gray-100 rounded-xl text-[10px] text-gray-500 font-bold flex items-center justify-center gap-1">
                                                                        <ChefHat className="w-3 h-3 text-orange-500 animate-pulse" />
                                                                        Prep ({readyCount}/{order.order_items.length})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: My Tables */}
                        {tab === 'tables' && (
                            <div>
                                <h2 className="text-xs font-black uppercase text-[#4E1414] tracking-widest mb-3 flex items-center gap-2">
                                    <Utensils className="w-4 h-4" /> Restaurant Floor Layout
                                </h2>

                                {tablesWithStatus.length === 0 ? (
                                    <div className="bg-white border border-[#C9974A]/20 rounded-2xl p-8 text-center shadow-sm">
                                        <p className="text-sm text-gray-400 italic">No tables assigned yet. Ask admin to assign tables.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {tablesWithStatus.map(table => {
                                            const hasActive = table.orders.length > 0;
                                            
                                            return (
                                                <div 
                                                    key={table.id}
                                                    onClick={() => {
                                                        if (hasActive) {
                                                            setSelectedTable(table);
                                                        }
                                                    }}
                                                    className={`rounded-2xl p-4 border transition-all relative flex flex-col justify-between text-left ${
                                                        hasActive ? 'cursor-pointer hover:-translate-y-1 shadow-sm' : ''
                                                    } ${
                                                        table.status === 'Empty' ? 'bg-white border-gray-200 opacity-60' :
                                                        table.status === 'Occupied' ? 'bg-amber-50/50 border-[#C9974A] shadow-sm' :
                                                        table.status === 'Served' ? 'bg-teal-50/50 border-teal-600/50 shadow-sm' :
                                                        'bg-red-50/50 border-red-600/50 shadow-sm'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-base font-black text-[#4E1414]">T-{table.table_no}</span>
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                                                table.status === 'Empty' ? 'bg-gray-100 text-gray-500' :
                                                                table.status === 'Occupied' ? 'bg-[#C9974A]/20 text-[#4E1414]' :
                                                                table.status === 'Served' ? 'bg-teal-100 text-teal-800' :
                                                                'bg-red-100 text-red-800 font-bold animate-pulse'
                                                            }`}>
                                                                {table.status}
                                                            </span>
                                                        </div>

                                                        {hasActive ? (
                                                            <div className="space-y-1 mt-3">
                                                                <p className="text-[10px] font-bold text-[#4E1414] truncate">{table.customerName}</p>
                                                                {table.oldestCreatedAt && (
                                                                    <p className="text-[9px] text-gray-400 font-medium">
                                                                        Occupied: {new Date(table.oldestCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 italic mt-4">Available</p>
                                                        )}
                                                    </div>

                                                    {table.status === 'Needs Bill' && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSendTableToCashier(table.id);
                                                            }}
                                                            disabled={submitting}
                                                            className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-1 rounded-lg text-[10px] transition-colors"
                                                        >
                                                            Send to Cashier
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: History */}
                        {tab === 'history' && (
                            <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 p-4 md:p-6 space-y-6">
                                {/* Summary banner */}
                                <div className="bg-[#F6EEDF]/40 border border-[#C9974A]/20 p-4 rounded-xl flex flex-wrap justify-between items-center gap-3">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Completed Sales Summary</p>
                                        <h3 className="font-display font-black text-lg text-[#4E1414]">
                                            Today: {historyOrders.filter(o => o.status === 'billed').length} orders · ₹{historyRevenue.toLocaleString()} total
                                        </h3>
                                    </div>
                                    <button 
                                        onClick={handleExportCSV}
                                        className="bg-[#4E1414] text-[#F6EEDF] hover:bg-[#350C0C] font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Export CSV
                                    </button>
                                </div>

                                {/* Date pills */}
                                <div className="flex gap-2 border-b border-gray-100 pb-4">
                                    {(['today', 'yesterday', 'week'] as const).map(p => (
                                        <button 
                                            key={p}
                                            onClick={() => setHistoryPeriod(p)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${historyPeriod === p ? 'bg-[#4E1414] text-[#F6EEDF]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[9px] tracking-wider pb-2">
                                                <th className="pb-3 font-bold">Time</th>
                                                <th className="pb-3 font-bold">Table</th>
                                                <th className="pb-3 font-bold">Customer</th>
                                                <th className="pb-3 font-bold">Items Count</th>
                                                <th className="pb-3 font-bold">Total</th>
                                                <th className="pb-3 font-bold text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {historyOrders.map(order => {
                                                const total = order.order_items?.reduce((sum, i) => sum + (i.price_at_order * i.qty), 0) || 0;
                                                const count = order.order_items?.reduce((sum, i) => sum + i.qty, 0) || 0;
                                                const isExpanded = expandedHistoryOrder === order.id;

                                                return (
                                                    <tr 
                                                        key={order.id}
                                                        onClick={() => setExpandedHistoryOrder(isExpanded ? null : order.id)}
                                                        className="hover:bg-gray-50/50 cursor-pointer"
                                                    >
                                                        <td className="py-3 font-medium text-gray-500">
                                                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="py-3 font-black text-[#4E1414]">T-{order.restaurant_tables?.table_no || '?'}</td>
                                                        <td className="py-3 font-medium text-gray-700">{order.customer_name}</td>
                                                        <td className="py-3 font-bold text-gray-500">{count} items</td>
                                                        <td className="py-3 font-black text-[#4E1414]">₹{total}</td>
                                                        <td className="py-3 text-right">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                                                                order.status === 'billed' ? 'bg-green-100 text-green-800' :
                                                                order.status === 'served' ? 'bg-teal-100 text-teal-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {order.status}
                                                            </span>

                                                            {/* Dropdown Items list inside expanding block */}
                                                            {isExpanded && (
                                                                <div className="text-left mt-2 bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1 block w-full max-w-sm absolute right-4 z-10 shadow-lg">
                                                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-1">Receipt details</p>
                                                                    {order.order_items.map((item, idx) => (
                                                                        <div key={idx} className="flex justify-between text-[11px] font-medium text-gray-600">
                                                                            <span>{item.qty}x {item.menu_items?.name}</span>
                                                                            <span>₹{item.price_at_order * item.qty}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {historyOrders.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-8 text-xs text-gray-400 italic">No orders found for this period.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: Kitchen View (read-only) */}
                        {tab === 'kitchen' && (
                            <div>
                                <h2 className="text-xs font-black uppercase text-[#4E1414] tracking-widest mb-3 flex items-center gap-2">
                                    <ChefHat className="w-4 h-4" /> My Tables KOT Monitor
                                </h2>

                                {myActiveOrders.length === 0 ? (
                                    <div className="bg-white border border-[#C9974A]/20 rounded-2xl p-8 text-center shadow-sm">
                                        <p className="text-sm text-gray-400 italic">No active kitchen orders for your tables.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {myActiveOrders.map(order => (
                                            <div 
                                                key={order.id} 
                                                className="bg-white rounded-2xl p-4 border border-[#C9974A]/20 shadow-sm relative overflow-hidden"
                                            >
                                                {/* Left indicator bar */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                                                    order.status === 'ready' ? 'bg-green-600' :
                                                    order.status === 'preparing' ? 'bg-orange-500' : 'bg-blue-600'
                                                }`} />

                                                <div className="pl-2">
                                                    <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                                                        <div>
                                                            <span className="text-sm font-black text-[#4E1414]">KOT T-{order.restaurant_tables?.table_no || '?'}</span>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{order.customer_name}</p>
                                                        </div>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                                                            order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                                            order.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {order.status}
                                                        </span>
                                                    </div>

                                                    <ul className="text-xs space-y-2 mt-3">
                                                        {order.order_items.map((item, idx) => (
                                                            <li key={idx} className="flex justify-between font-medium border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                                                                <span className="text-gray-700">
                                                                    <b className="text-[#4E1414] mr-1.5">{item.qty}x</b>{item.menu_items?.name}
                                                                </span>
                                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                                                    item.status === 'ready' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                                    item.status === 'preparing' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                                                    'bg-gray-50 text-gray-400'
                                                                }`}>
                                                                    {item.status}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    <button
                                                        onClick={() => openEditActiveOrderDrawer(order)}
                                                        className="w-full mt-3.5 bg-[#C9974A]/20 hover:bg-[#C9974A] text-[#4E1414] font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                                        + Add / Edit Food
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 5: Profile & Settings */}
                        {tab === 'settings' && (
                            <div className="max-w-md mx-auto">
                                <ProfilePanel 
                                    activeUser={activeUser}
                                    fontSize={fontSize}
                                    setFontSize={setFontSize}
                                    soundAlerts={soundAlerts}
                                    setSoundAlerts={setSoundAlerts}
                                    newOrderSound={newOrderSound}
                                    setNewOrderSound={setNewOrderSound}
                                    ordersCount={myActiveOrders.length}
                                />
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Bottom Confirm Drawer */}
            {showConfirmDrawer && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl border-t border-[#C9974A]/30 w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto flex flex-col justify-between shadow-2xl">
                        <div>
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                                <h3 className="font-display font-black text-base text-[#4E1414]">Review Order: Table {selectedOrder.restaurant_tables?.table_no || '?'}</h3>
                                <button onClick={() => setShowConfirmDrawer(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Editable items list */}
                            <div className="space-y-3">
                                {drawerItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0">
                                        <div className="text-xs">
                                            <p className="font-bold text-[#241B15]">{item.name}</p>
                                            <p className="text-[10px] text-gray-400">₹{item.price} each</p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center border border-gray-200 rounded-lg">
                                                <button 
                                                    onClick={() => handleUpdateItemQty(idx, item.qty - 1)}
                                                    className="px-2.5 py-1 text-gray-500 hover:bg-gray-50"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="px-3 text-xs font-bold text-[#4E1414]">{item.qty}</span>
                                                <button 
                                                    onClick={() => handleUpdateItemQty(idx, item.qty + 1)}
                                                    className="px-2.5 py-1 text-gray-500 hover:bg-gray-50"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <button 
                                                onClick={() => handleRemoveDrawerItem(idx)}
                                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add catalog items section */}
                            <div className="mt-6 border-t border-gray-100 pt-4">
                                <h4 className="text-xs font-black uppercase text-[#4E1414] mb-2 tracking-wider flex items-center gap-1.5">
                                    <Search className="w-3.5 h-3.5" /> Add items to order
                                </h4>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Search menu..."
                                        value={menuSearchQuery}
                                        onChange={e => setMenuSearchQuery(e.target.value)}
                                        className="w-full text-xs px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4E1414] pl-9"
                                    />
                                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                </div>

                                {menuSearchQuery && (
                                    <div className="mt-2 bg-gray-50 rounded-xl border border-gray-100 max-h-40 overflow-y-auto divide-y divide-gray-100 shadow-inner">
                                        {filteredCatalogItems.map((item: any) => (
                                            <div 
                                                key={item.id}
                                                onClick={() => handleAddCatalogItem(item)}
                                                className="px-4 py-2 hover:bg-[#F6EEDF]/40 cursor-pointer flex justify-between items-center text-xs"
                                            >
                                                <div>
                                                    <p className="font-bold text-[#241B15]">{item.name}</p>
                                                    <p className="text-[10px] text-gray-400">{item.categories?.name || 'Dish'}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[#4E1414]">₹{item.price}</span>
                                                    <span className="text-[10px] font-bold bg-[#C9974A]/20 text-[#4E1414] px-2 py-0.5 rounded">Add +</span>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredCatalogItems.length === 0 && (
                                            <p className="p-4 text-center text-xs text-gray-400 italic">No menu items match query.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center gap-3 shrink-0">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estimated bill</span>
                                <span className="text-lg font-black text-[#4E1414]">
                                    ₹{drawerItems.reduce((acc, i) => acc + (i.price * i.qty), 0)}
                                </span>
                            </div>

                            <button 
                                onClick={submitConfirm}
                                disabled={submitting}
                                className="bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF] font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Confirm & Send to Kitchen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Add/Edit Active Order Drawer */}
            {showEditActiveDrawer && editingActiveOrder && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl border-t border-[#C9974A]/30 w-full max-w-xl p-5 max-h-[90vh] overflow-y-auto flex flex-col justify-between shadow-2xl animate-slideUp">
                        <div>
                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                                <div>
                                    <span className="text-[10px] font-black tracking-widest text-[#C9974A] uppercase block">Add More Food / Edit KOT</span>
                                    <h3 className="font-display font-black text-lg text-[#4E1414]">Table {editingActiveOrder.restaurant_tables?.table_no || '?'} · {editingActiveOrder.customer_name}</h3>
                                </div>
                                <button onClick={() => setShowEditActiveDrawer(false)} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Existing Items in KOT */}
                            <div className="mb-6">
                                <h4 className="text-xs font-black uppercase text-[#4E1414] tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <ClipboardList className="w-4 h-4 text-[#C9974A]" /> Current Items (Already Sent to Kitchen)
                                </h4>
                                <div className="space-y-2 bg-gray-50/60 p-3 rounded-2xl border border-gray-100 max-h-48 overflow-y-auto">
                                    {editExistingItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-2xs border border-gray-100">
                                            <div className="flex-1 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-[#241B15]">{item.name}</span>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                        item.status === 'ready' ? 'bg-green-100 text-green-700' :
                                                        item.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400">₹{item.price} each</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50/50">
                                                    <button 
                                                        onClick={() => handleUpdateExistingQty(idx, item.qty - 1)}
                                                        disabled={submitting}
                                                        className="px-2 py-1 text-[#4E1414] hover:bg-gray-200 rounded-l-lg transition-colors disabled:opacity-50"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="px-2.5 text-xs font-black text-[#4E1414] min-w-[24px] text-center">{item.qty}</span>
                                                    <button 
                                                        onClick={() => handleUpdateExistingQty(idx, item.qty + 1)}
                                                        disabled={submitting}
                                                        className="px-2 py-1 text-[#4E1414] hover:bg-gray-200 rounded-r-lg transition-colors disabled:opacity-50"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <button 
                                                    onClick={() => handleRemoveExistingItem(idx)}
                                                    disabled={submitting}
                                                    className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Cancel / Remove Item"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {editExistingItems.length === 0 && (
                                        <p className="text-center text-xs text-gray-400 italic py-2">No active items.</p>
                                    )}
                                </div>
                            </div>

                            {/* New Items to Add Section */}
                            {newItemsToAdd.length > 0 && (
                                <div className="mb-6 bg-[#F6EEDF]/50 border-2 border-[#C9974A]/40 p-3.5 rounded-2xl animate-fadeIn">
                                    <h4 className="text-xs font-black uppercase text-[#4E1414] tracking-wider mb-2.5 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Utensils className="w-4 h-4 text-[#C9974A]" /> New Items to Send ({newItemsToAdd.reduce((sum, i) => sum + i.qty, 0)})
                                        </span>
                                        <span className="text-[#C9974A] font-black text-sm">
                                            +₹{newItemsToAdd.reduce((sum, i) => sum + (i.price * i.qty), 0)}
                                        </span>
                                    </h4>
                                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                        {newItemsToAdd.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-xs border border-[#C9974A]/20">
                                                <div className="flex-1 pr-2">
                                                    <span className="font-bold text-xs text-[#241B15] block">{item.name}</span>
                                                    <span className="text-[10px] font-bold text-[#C9974A]">₹{item.price} each</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center border border-[#C9974A]/30 rounded-lg bg-[#F6EEDF]/30">
                                                        <button 
                                                            onClick={() => handleUpdateNewItemQty(idx, item.qty - 1)}
                                                            className="px-2 py-1 text-[#4E1414] hover:bg-[#C9974A]/20 rounded-l-lg"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="px-2.5 text-xs font-black text-[#4E1414] min-w-[24px] text-center">{item.qty}</span>
                                                        <button 
                                                            onClick={() => handleUpdateNewItemQty(idx, item.qty + 1)}
                                                            className="px-2 py-1 text-[#4E1414] hover:bg-[#C9974A]/20 rounded-r-lg"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <button 
                                                        onClick={() => setNewItemsToAdd(newItemsToAdd.filter((_, i) => i !== idx))}
                                                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search and Browse Menu */}
                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-xs font-black uppercase text-[#4E1414] mb-2.5 tracking-wider flex items-center gap-1.5">
                                    <Search className="w-4 h-4 text-[#C9974A]" /> Browse & Add Menu Items
                                </h4>
                                <div className="relative mb-3">
                                    <input 
                                        type="text"
                                        placeholder="Search menu items or categories..."
                                        value={editActiveSearchQuery}
                                        onChange={e => setEditActiveSearchQuery(e.target.value)}
                                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4E1414] focus:ring-1 focus:ring-[#4E1414] pl-9 bg-gray-50/50 font-medium"
                                    />
                                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                    {editActiveSearchQuery && (
                                        <button onClick={() => setEditActiveSearchQuery('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 p-0.5">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Categories & Items Scroll */}
                                <div className="bg-gray-50/60 rounded-2xl border border-gray-100 max-h-52 overflow-y-auto divide-y divide-gray-100">
                                    {posCatalog?.categories?.map((cat: any) => {
                                        const catItems = posCatalog.menuItems.filter((m: any) => 
                                            m.category_id === cat.id && 
                                            (m.name.toLowerCase().includes(editActiveSearchQuery.toLowerCase()) ||
                                             cat.name.toLowerCase().includes(editActiveSearchQuery.toLowerCase()))
                                        );
                                        if (catItems.length === 0) return null;

                                        return (
                                            <div key={cat.id} className="pb-1">
                                                <div className="bg-gray-100/80 px-3 py-1.5 sticky top-0 z-10 border-b border-gray-200/60 flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase text-[#4E1414] tracking-wider">{cat.name}</span>
                                                    <span className="text-[9px] font-bold text-gray-500">{catItems.length} items</span>
                                                </div>
                                                <div className="divide-y divide-gray-100">
                                                    {catItems.map((item: any) => {
                                                        const addedCount = newItemsToAdd.find(i => i.menu_item_id === item.id)?.qty || 0;
                                                        return (
                                                            <div 
                                                                key={item.id}
                                                                onClick={() => handleAddNewItemToCart(item)}
                                                                className="px-3.5 py-2 hover:bg-[#F6EEDF]/40 cursor-pointer flex justify-between items-center transition-colors"
                                                            >
                                                                <div>
                                                                    <p className="font-bold text-xs text-[#241B15]">{item.name}</p>
                                                                    <p className="text-[11px] font-black text-[#C9974A]">₹{item.price}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {addedCount > 0 && (
                                                                        <span className="bg-[#4E1414] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                                            +{addedCount} added
                                                                        </span>
                                                                    )}
                                                                    <button className="bg-[#4E1414] text-[#F6EEDF] hover:bg-[#350C0C] w-7 h-7 rounded-lg flex items-center justify-center shadow-xs transition-transform active:scale-90">
                                                                        <Plus className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!posCatalog || posCatalog?.menuItems?.filter((m: any) => m.name.toLowerCase().includes(editActiveSearchQuery.toLowerCase())).length === 0) && (
                                        <div className="p-6 text-center text-xs text-gray-400 italic">
                                            No menu items found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center gap-3 shrink-0">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Updated Total Bill</span>
                                <span className="text-lg font-black text-[#4E1414]">
                                    ₹{editExistingItems.reduce((acc, i) => acc + (i.price * i.qty), 0) + newItemsToAdd.reduce((acc, i) => acc + (i.price * i.qty), 0)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowEditActiveDrawer(false)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
                                >
                                    Done
                                </button>
                                {newItemsToAdd.length > 0 && (
                                    <button 
                                        onClick={submitAddNewItems}
                                        disabled={submitting}
                                        className="bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF] font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Send {newItemsToAdd.reduce((sum, i) => sum + i.qty, 0)} New Items to Kitchen
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Reason Picker Modal */}
            {showRejectModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-red-100 space-y-4">
                        <div>
                            <h3 className="font-display font-black text-[#4E1414] text-base">Reject Order T-{selectedOrder.restaurant_tables?.table_no || '?'}</h3>
                            <p className="text-xs text-gray-400 font-medium">Please specify the cancellation reason to reject this order.</p>
                        </div>

                        <div className="space-y-2">
                            {['Customer changed mind', 'Item unavailable', 'Other'].map(reason => (
                                <label key={reason} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 hover:bg-[#F6EEDF]/20 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="reject_reason" 
                                        value={reason} 
                                        checked={rejectReason === reason} 
                                        onChange={() => setRejectReason(reason)}
                                        className="accent-[#4E1414]"
                                    />
                                    <span className="text-xs font-bold text-gray-700">{reason}</span>
                                </label>
                            ))}
                        </div>

                        {rejectReason === 'Other' && (
                            <textarea 
                                placeholder="Enter specific reason here..."
                                value={rejectCustomReason}
                                onChange={e => setRejectCustomReason(e.target.value)}
                                className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4E1414]"
                                rows={3}
                            />
                        )}

                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitReject}
                                disabled={submitting}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1"
                            >
                                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Details Modal for Active Tables */}
            {selectedTable && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#C9974A]/30 space-y-4">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                            <div>
                                <h3 className="font-display font-black text-[#4E1414] text-base">Table {selectedTable.table_no} Details</h3>
                                <p className="text-[10px] text-gray-400 font-medium">Customer: {selectedTable.customerName}</p>
                            </div>
                            <button onClick={() => setSelectedTable(null)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-60 overflow-y-auto divide-y divide-gray-100 pr-1">
                            {selectedTable.orders.map((order: any, idx: number) => (
                                <div key={order.id} className="pt-3 first:pt-0">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-2">
                                            Order KOT
                                            <button
                                                onClick={() => {
                                                    setSelectedTable(null);
                                                    openEditActiveOrderDrawer(order);
                                                }}
                                                className="bg-[#C9974A] hover:bg-[#b8863b] text-[#4E1414] text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors shadow-2xs"
                                            >
                                                <Plus className="w-3 h-3 stroke-[2.5]" />
                                                + Add / Edit
                                            </button>
                                        </span>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                                            order.status === 'ready' ? 'bg-green-100 text-green-700' :
                                            order.status === 'served' ? 'bg-teal-100 text-teal-800' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <ul className="space-y-1">
                                        {order.order_items.map((item: any, idy: number) => (
                                            <li key={idy} className="flex justify-between text-xs text-gray-700 font-medium">
                                                <span><b className="text-[#4E1414] mr-1">{item.qty}x</b> {item.menu_items?.name}</span>
                                                <span className="text-gray-400">₹{item.price_at_order * item.qty}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 pt-3 space-y-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total accumulated bill</span>
                                    <span className="text-base font-black text-[#4E1414]">
                                        ₹{selectedTable.orders.reduce((sum: number, o: any) => sum + o.order_items.reduce((s: number, i: any) => s + (i.price_at_order * i.qty), 0), 0)}
                                    </span>
                                </div>

                                {selectedTable.status === 'Needs Bill' && (
                                    <button 
                                        onClick={() => handleSendTableToCashier(selectedTable.id)}
                                        disabled={submitting}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                                    >
                                        Send to Cashier
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    const activeOrder = selectedTable.orders.find((o: any) => ['confirmed', 'preparing', 'ready', 'served'].includes(o.status)) || selectedTable.orders[0];
                                    if (activeOrder) {
                                        setSelectedTable(null);
                                        openEditActiveOrderDrawer(activeOrder);
                                    }
                                }}
                                className="w-full bg-[#C9974A] hover:bg-[#b8863b] text-[#4E1414] font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                            >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                                + Add More Food to Table {selectedTable.table_no}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// ----------------------------------------------------------------------
// FULL FEATURE REBUILD WAITER PROFILE PANEL
// ----------------------------------------------------------------------
function ProfilePanel({ 
    activeUser, fontSize, setFontSize, soundAlerts, setSoundAlerts, 
    newOrderSound, setNewOrderSound, ordersCount 
}: { 
    activeUser: any;
    fontSize: 'S' | 'M' | 'L';
    setFontSize: (size: 'S' | 'M' | 'L') => void;
    soundAlerts: boolean;
    setSoundAlerts: (on: boolean) => void;
    newOrderSound: boolean;
    setNewOrderSound: (on: boolean) => void;
    ordersCount: number;
}) {
    const [submitting, setSubmitting] = useState(false);
    
    // Forms state
    const [showEditName, setShowEditName] = useState(false);
    const [editName, setEditName] = useState(activeUser.name || '');

    const [showEditPhone, setShowEditPhone] = useState(false);
    const [editPhone, setEditPhone] = useState(activeUser.phone || '');

    const [showEditPwd, setShowEditPwd] = useState(false);
    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');

    const handleSaveName = async () => {
        if (!editName) return;
        setSubmitting(true);
        const res = await updateStaffSelf(activeUser.id, editName, activeUser.phone || '');
        setSubmitting(false);
        if (res.success) {
            setShowEditName(false);
            alert('Name Updated! Reload the page to apply.');
        } else {
            alert(res.error || 'Failed to update name');
        }
    };

    const handleSavePhone = async () => {
        if (!editPhone || editPhone.length < 10) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }
        setSubmitting(true);
        const res = await updateStaffSelf(activeUser.id, activeUser.name, editPhone);
        setSubmitting(false);
        if (res.success) {
            setShowEditPhone(false);
            alert('Phone Number Updated!');
        } else {
            alert(res.error || 'Failed to update phone number');
        }
    };

    const handleSavePassword = async () => {
        if (!newPwd || newPwd.length < 4) {
            alert('Password must be at least 4 characters long.');
            return;
        }
        if (newPwd !== confirmPwd) {
            alert('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        const { error } = await supabase.auth.updateUser({ password: newPwd });
        setSubmitting(false);

        if (!error) {
            setShowEditPwd(false);
            setNewPwd('');
            setConfirmPwd('');
            alert('Password changed successfully.');
        } else {
            alert(error.message);
        }
    };

    const handleFontSizeChange = (size: 'S' | 'M' | 'L') => {
        setFontSize(size);
        localStorage.setItem('font_size', size);
    };

    const handleSoundAlertsToggle = () => {
        const newVal = !soundAlerts;
        setSoundAlerts(newVal);
        localStorage.setItem('sound_alerts_enabled', String(newVal));
    };

    const handleNewOrderSoundToggle = () => {
        const newVal = !newOrderSound;
        setNewOrderSound(newVal);
        localStorage.setItem('new_order_sound_enabled', String(newVal));
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-[#C9974A]/20 overflow-hidden text-left flex flex-col justify-between">
            {/* Header / Avatar Initials circle */}
            <div className="bg-[#350C0C] p-6 text-center border-b border-[#C9974A]/30">
                <div className="w-16 h-16 rounded-full bg-[#C9974A] text-[#350C0C] flex items-center justify-center text-xl font-black mx-auto mb-3 shadow-md border-2 border-[#C9974A]/40 uppercase">
                    {activeUser.name ? activeUser.name.split(' ').map((w: string) => w.charAt(0)).join('').substring(0, 2) : 'WT'}
                </div>
                <h3 className="font-display font-black text-base text-white">{activeUser.name || 'Waiter Staff'}</h3>
                <span className="text-[10px] font-black uppercase text-[#C9974A] tracking-widest">{activeUser.roleName || 'WAITER'} · ACTIVE</span>
            </div>

            {/* Settings lists */}
            <div className="p-4 space-y-5 divide-y divide-gray-100">
                
                {/* Account Section */}
                <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase text-gray-400 tracking-wider">ACCOUNT INFORMATION</h4>
                    
                    {/* Display name */}
                    <div className="text-xs">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-gray-400 font-bold block text-[10px]">DISPLAY NAME</span>
                                <span className="font-bold text-gray-800">{activeUser.name}</span>
                            </div>
                            <button 
                                onClick={() => setShowEditName(!showEditName)}
                                className="text-xs font-black text-[#4E1414] hover:underline"
                            >
                                {showEditName ? 'Cancel' : 'Edit'}
                            </button>
                        </div>
                        {showEditName && (
                            <div className="flex gap-2 mt-2">
                                <input 
                                    type="text" 
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg outline-none text-xs"
                                />
                                <button 
                                    onClick={handleSaveName}
                                    disabled={submitting}
                                    className="bg-[#4E1414] text-[#F6EEDF] font-bold px-3 py-1.5 rounded-lg text-[10px]"
                                >
                                    Save
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Change password */}
                    <div className="text-xs pt-1">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-gray-400 font-bold block text-[10px]">PASSWORD OVERRIDES</span>
                                <span className="font-medium text-gray-500">••••••••</span>
                            </div>
                            <button 
                                onClick={() => setShowEditPwd(!showEditPwd)}
                                className="text-xs font-black text-[#4E1414] hover:underline"
                            >
                                {showEditPwd ? 'Cancel' : 'Change'}
                            </button>
                        </div>
                        {showEditPwd && (
                            <div className="mt-2 space-y-2 bg-[#F6EEDF]/20 p-3 rounded-xl border border-[#C9974A]/10">
                                <input 
                                    type="password" 
                                    placeholder="New Password"
                                    value={newPwd}
                                    onChange={e => setNewPwd(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg outline-none text-xs"
                                />
                                <input 
                                    type="password" 
                                    placeholder="Confirm Password"
                                    value={confirmPwd}
                                    onChange={e => setConfirmPwd(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg outline-none text-xs"
                                />
                                <button 
                                    onClick={handleSavePassword}
                                    disabled={submitting}
                                    className="w-full bg-[#4E1414] text-[#F6EEDF] font-bold py-1.5 rounded-lg text-[10px]"
                                >
                                    Update Password
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Change Phone Number */}
                    <div className="text-xs pt-1">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-gray-400 font-bold block text-[10px]">PHONE NUMBER</span>
                                <span className="font-bold text-gray-800">{activeUser.phone || 'Not provided'}</span>
                            </div>
                            <button 
                                onClick={() => setShowEditPhone(!showEditPhone)}
                                className="text-xs font-black text-[#4E1414] hover:underline"
                            >
                                {showEditPhone ? 'Cancel' : 'Edit'}
                            </button>
                        </div>
                        {showEditPhone && (
                            <div className="flex gap-2 mt-2">
                                <input 
                                    type="text" 
                                    value={editPhone}
                                    onChange={e => setEditPhone(e.target.value)}
                                    maxLength={10}
                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg outline-none text-xs"
                                />
                                <button 
                                    onClick={handleSavePhone}
                                    disabled={submitting}
                                    className="bg-[#4E1414] text-[#F6EEDF] font-bold px-3 py-1.5 rounded-lg text-[10px]"
                                >
                                    Save
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="pt-4 space-y-3">
                    <h4 className="text-[9px] font-black uppercase text-gray-400 tracking-wider">SYSTEM PREFERENCES</h4>
                    
                    {/* Sound Alerts */}
                    <div className="flex justify-between items-center text-xs">
                        <div>
                            <span className="font-bold text-gray-700">Sound Alerts</span>
                            <p className="text-[10px] text-gray-400 font-medium">Bypass alerts and system ticks</p>
                        </div>
                        <button 
                            onClick={handleSoundAlertsToggle}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${soundAlerts ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                            {soundAlerts ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* New Order sound */}
                    <div className="flex justify-between items-center text-xs pt-1">
                        <div>
                            <span className="font-bold text-gray-700">New Order Sound</span>
                            <p className="text-[10px] text-gray-400 font-medium">Play ping when customer places KOT</p>
                        </div>
                        <button 
                            onClick={handleNewOrderSoundToggle}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${newOrderSound ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                            {newOrderSound ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* Font Size switcher */}
                    <div className="flex justify-between items-center text-xs pt-1">
                        <div>
                            <span className="font-bold text-gray-700">Font Display Scale</span>
                            <p className="text-[10px] text-gray-400 font-medium">Toggle dashboard interface size</p>
                        </div>
                        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg border">
                            {(['S', 'M', 'L'] as const).map(size => (
                                <button
                                    key={size}
                                    onClick={() => handleFontSizeChange(size)}
                                    className={`px-2 py-1 rounded text-[10px] font-black transition-colors ${fontSize === size ? 'bg-white text-[#4E1414] shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Session Info Section */}
                <div className="pt-4 space-y-2">
                    <h4 className="text-[9px] font-black uppercase text-gray-400 tracking-wider">SESSION DATA</h4>
                    
                    <div className="flex justify-between text-[11px] font-medium text-gray-500">
                        <span>Logged in since:</span>
                        <span className="font-bold text-gray-700">9:00 AM</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-medium text-gray-500">
                        <span>Active orders:</span>
                        <span className="font-bold text-gray-700">{ordersCount}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-medium text-gray-500">
                        <span>Device OS:</span>
                        <span className="font-bold text-gray-700 truncate max-w-[200px]" title={typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'}>
                            {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'Node.js'}
                        </span>
                    </div>
                </div>

            </div>

            {/* Logout button */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <button 
                    onClick={async () => await logoutStaff()}
                    className="w-full border-2 border-red-600 hover:bg-red-50 text-red-600 font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>
        </div>
    );
}
