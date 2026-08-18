"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Send, CheckCheck, X, Megaphone, ShieldAlert, Sparkles, Filter, CheckCircle2, User, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import {
    sendStaffNotification, fetchStaffNotifications, markNotificationAsRead,
    markAllNotificationsAsRead, deleteNotification, clearAllNotifications, StaffNotificationItem
} from '@/features/ordering/actions/notificationActions';
import { supabase } from '@/features/ordering/lib/supabase';
import { toast } from '@/features/ordering/lib/toast';

interface Props {
    currentStaffId?: string;
    currentRoleName?: string;
}

// Crisp Web Audio API Chime Synthesizer
function playNotificationChime(isUrgent = false) {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (isUrgent) {
            // Urgent 3-tone siren chime
            [523.25, 659.25, 783.99].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
                gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.12);
                osc.stop(ctx.currentTime + idx * 0.12 + 0.25);
            });
        } else {
            // Soft pleasant 2-tone chime
            [587.33, 880].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
                gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.1);
                osc.stop(ctx.currentTime + idx * 0.1 + 0.2);
            });
        }
    } catch (_) {}
}

function getTimeAgo(dateStr: string) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

export function NotificationCenter({ currentStaffId = 'cashier_desk', currentRoleName = 'Cashier' }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [notifications, setNotifications] = useState<StaffNotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'urgent'>('all');

    // Floating System Push Banner State
    const [activeBanner, setActiveBanner] = useState<StaffNotificationItem | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetRole, setTargetRole] = useState('all');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

    const popoverRef = useRef<HTMLDivElement>(null);
    const knownIdsRef = useRef<Set<string>>(new Set());
    const isFirstLoadRef = useRef(true);

    const loadNotifications = useCallback(async () => {
        const res = await fetchStaffNotifications();
        if (res.success && res.data) {
            setNotifications(res.data);

            // On first load, populate known IDs without popping system banner
            if (isFirstLoadRef.current) {
                res.data.forEach(item => knownIdsRef.current.add(item.id));
                isFirstLoadRef.current = false;
                return;
            }

            // Detect newly arrived notifications
            for (const item of res.data) {
                if (!knownIdsRef.current.has(item.id)) {
                    knownIdsRef.current.add(item.id);

                    const roleLower = currentRoleName.toLowerCase();
                    const isTarget = item.target_role === 'all' || item.target_role === roleLower || roleLower === 'admin';

                    if (isTarget) {
                        setActiveBanner(item);
                        playNotificationChime(item.priority === 'urgent');

                        // Auto dismiss system banner after 8 seconds
                        setTimeout(() => {
                            setActiveBanner(curr => (curr?.id === item.id ? null : curr));
                        }, 8000);
                        break;
                    }
                }
            }
        }
    }, [currentRoleName]);

    useEffect(() => {
        setLoading(true);
        loadNotifications().then(() => setLoading(false));

        // Real-time subscription for instant notification push alerts without background polling spam
        const channel = supabase
            .channel('staff-activity-notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_activity_log', filter: 'action=eq.STAFF_NOTIFICATION' }, () => {
                loadNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadNotifications]);

    // Click outside to dismiss popover
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Role-filtered notifications
    const relevantNotifications = notifications.filter(n => {
        const roleLower = currentRoleName.toLowerCase();
        if (roleLower === 'admin') return true;
        if (n.target_role === 'all') return true;
        return n.target_role === roleLower;
    });

    const displayNotifications = relevantNotifications.filter(n => {
        if (filterTab === 'unread') return !n.read_by.includes(currentStaffId);
        if (filterTab === 'urgent') return n.priority === 'urgent';
        return true;
    });

    const unreadCount = relevantNotifications.filter(n => !n.read_by.includes(currentStaffId)).length;

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_by: [...n.read_by, currentStaffId] } : n));
        await markNotificationAsRead(id, currentStaffId);
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read_by: [...n.read_by, currentStaffId] })));
        await markAllNotificationsAsRead(currentStaffId);
        toast.success('All notifications marked as read');
    };

    const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setNotifications(prev => prev.filter(n => n.id !== id));
        await deleteNotification(id);
        toast.success('Notification deleted');
    };

    const handleClearAll = async () => {
        if (notifications.length === 0) return;
        if (!confirm('Are you sure you want to clear and delete all notifications?')) return;
        setNotifications([]);
        await clearAllNotifications();
        toast.success('All notifications cleared');
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            toast.warning('Please enter both title and message');
            return;
        }

        setSending(true);
        const res = await sendStaffNotification({
            title,
            message,
            targetRole,
            priority
        });
        setSending(false);

        if (!res.success) {
            toast.error(res.error || 'Failed to send notification');
        } else {
            toast.success('Broadcast notification sent successfully!');
            setTitle('');
            setMessage('');
            setTargetRole('all');
            setPriority('normal');
            setShowSendModal(false); // CLOSE MODAL IMMEDIATELY
            await loadNotifications();
        }
    };

    return (
        <>
            {/* ── 1. FLOATING SYSTEM PUSH NOTIFICATION BANNER (OS-STYLE TOP RIGHT) ── */}
            <AnimatePresence>
                {activeBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="fixed top-4 right-4 z-[9999] w-96 max-w-[calc(100vw-2rem)] bg-[#350C0C]/95 text-[#F6EEDF] border-2 border-[#C9974A] shadow-2xl backdrop-blur-xl rounded-2xl overflow-hidden p-4"
                    >
                        {/* Banner Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#C9974A]/30 text-xs">
                            <div className="flex items-center gap-1.5 font-black text-[#C9974A] uppercase tracking-wider text-[10px]">
                                <Megaphone className="w-3.5 h-3.5 animate-pulse" /> Taj POS System Push Alert
                            </div>
                            <button
                                onClick={() => setActiveBanner(null)}
                                className="text-[#F6EEDF]/60 hover:text-white transition-colors p-0.5 rounded-md hover:bg-white/10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Banner Content */}
                        <div className="mt-3 flex gap-3 items-start">
                            <div className="shrink-0 mt-0.5">
                                {activeBanner.priority === 'urgent' ? (
                                    <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg border border-red-400 animate-bounce">
                                        <ShieldAlert className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className="w-9 h-9 rounded-xl bg-[#C9974A] text-[#4E1414] flex items-center justify-center shadow-lg border border-[#F6EEDF]/40">
                                        <Megaphone className="w-5 h-5" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <h4 className="font-extrabold text-sm text-[#F6EEDF] truncate leading-tight">
                                        {activeBanner.title}
                                    </h4>
                                    <span className="text-[9px] font-extrabold text-[#C9974A] whitespace-nowrap bg-black/40 px-1.5 py-0.5 rounded-full">
                                        {getTimeAgo(activeBanner.created_at)}
                                    </span>
                                </div>

                                <p className="text-xs text-[#F6EEDF]/90 leading-snug break-words font-medium">
                                    {activeBanner.message}
                                </p>

                                <div className="flex items-center gap-2 pt-2 flex-wrap">
                                    <span className="bg-white/10 border border-white/20 text-[#F6EEDF] text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <User className="w-2.5 h-2.5 text-[#C9974A]" /> {activeBanner.sender_name} ({activeBanner.sender_role})
                                    </span>
                                    {activeBanner.target_role !== 'all' && (
                                        <span className="bg-[#C9974A] text-[#4E1414] text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                            Target: {activeBanner.target_role}
                                        </span>
                                    )}
                                    {activeBanner.priority === 'urgent' && (
                                        <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                                            🚨 URGENT
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Banner Action Buttons */}
                        <div className="mt-3.5 pt-2 border-t border-[#C9974A]/20 flex justify-between items-center gap-2 text-xs">
                            <button
                                onClick={() => {
                                    handleMarkAsRead(activeBanner.id);
                                    setActiveBanner(null);
                                }}
                                className="flex-1 bg-[#C9974A] hover:bg-[#b58338] text-[#4E1414] font-black py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                                <CheckCheck className="w-3.5 h-3.5" /> Mark Read
                            </button>
                            <button
                                onClick={() => setActiveBanner(null)}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[#F6EEDF] font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Dismiss
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* ── 2. HEADER NOTIFICATION TRIGGER BUTTON & POPOVER DRAWER ── */}
            <div className="relative" ref={popoverRef}>

                {/* Bell Icon Trigger */}
                <button
                    onClick={() => {
                        setIsOpen(prev => {
                            if (!prev) loadNotifications();
                            return !prev;
                        });
                    }}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#C9974A] relative transition-all cursor-pointer group"
                    title="Staff Push Notification Center"
                >
                    <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center border-2 border-[#4E1414] animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Notification Feed Drawer */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border-2 border-[#C9974A]/40 overflow-hidden z-50 text-[#4E1414]"
                        >
                            {/* Drawer Header */}
                            <div className="bg-[#4E1414] text-[#F6EEDF] px-4 py-3.5 flex items-center justify-between border-b border-[#C9974A]/30">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-xl bg-[#C9974A] text-[#4E1414] flex items-center justify-center font-black">
                                        <Megaphone className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#F6EEDF]">Staff Push Alerts</h3>
                                        <p className="text-[10px] text-[#C9974A] font-semibold">{unreadCount} unread notifications</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => { setShowSendModal(true); setIsOpen(false); }}
                                        className="bg-[#C9974A] hover:bg-[#b58338] text-[#4E1414] text-[10px] font-black px-2.5 py-1 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                    >
                                        <Send className="w-3 h-3" /> Broadcast
                                    </button>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="text-[#C9974A] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                                            title="Mark all as read"
                                        >
                                            <CheckCheck className="w-4 h-4" />
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={handleClearAll}
                                            className="text-red-400 hover:text-red-200 p-1 rounded-lg hover:bg-white/10 transition-colors"
                                            title="Clear and delete all notifications"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex items-center gap-1 p-2 bg-[#F6EEDF]/40 border-b border-stone-200 text-[11px] font-bold text-stone-600">
                                <button
                                    onClick={() => setFilterTab('all')}
                                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${filterTab === 'all' ? 'bg-[#4E1414] text-[#F6EEDF]' : 'hover:bg-white'}`}
                                >
                                    All ({relevantNotifications.length})
                                </button>
                                <button
                                    onClick={() => setFilterTab('unread')}
                                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${filterTab === 'unread' ? 'bg-[#4E1414] text-[#F6EEDF]' : 'hover:bg-white'}`}
                                >
                                    Unread ({unreadCount})
                                </button>
                                <button
                                    onClick={() => setFilterTab('urgent')}
                                    className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${filterTab === 'urgent' ? 'bg-red-600 text-white' : 'hover:bg-white'}`}
                                >
                                    Urgent ({relevantNotifications.filter(n => n.priority === 'urgent').length})
                                </button>
                            </div>

                            {/* Notification List */}
                            <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100 taj-scrollbar-dark">
                                {displayNotifications.map(item => {
                                    const isUnread = !item.read_by.includes(currentStaffId);
                                    const isUrgent = item.priority === 'urgent';

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleMarkAsRead(item.id)}
                                            className={`p-3.5 transition-all cursor-pointer flex gap-3 items-start border-l-4
                                                ${isUnread
                                                    ? isUrgent ? 'border-l-red-600 bg-red-50/50 hover:bg-red-50' : 'border-l-[#C9974A] bg-[#F6EEDF]/40 hover:bg-[#F6EEDF]/70'
                                                    : 'border-l-transparent bg-white hover:bg-stone-50'}`}
                                        >
                                            <div className="shrink-0 mt-0.5">
                                                {isUrgent ? (
                                                    <div className="w-8 h-8 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shadow-2xs">
                                                        <ShieldAlert className="w-4 h-4 animate-bounce" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-xl bg-[#C9974A]/15 border border-[#C9974A]/30 text-[#4E1414] flex items-center justify-center shadow-2xs">
                                                        <Megaphone className="w-4 h-4 text-[#C9974A]" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 space-y-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <span className="font-extrabold text-xs text-[#4E1414] truncate">{item.title}</span>
                                                        {isUnread && (
                                                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 animate-ping" />
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] font-extrabold text-stone-400 whitespace-nowrap">
                                                        {getTimeAgo(item.created_at)}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-stone-700 leading-snug break-words font-medium">{item.message}</p>

                                                <div className="flex items-center justify-between gap-2 pt-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="bg-stone-100 border border-stone-200 text-stone-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                            From: {item.sender_name} ({item.sender_role})
                                                        </span>
                                                        {item.target_role !== 'all' && (
                                                            <span className="bg-amber-100 text-amber-900 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                                                To: {item.target_role}
                                                            </span>
                                                        )}
                                                        {isUrgent && (
                                                            <span className="bg-red-100 text-red-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                                                URGENT
                                                            </span>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={(e) => handleDeleteSingle(e, item.id)}
                                                        className="text-stone-400 hover:text-red-600 p-1 rounded-md hover:bg-stone-200/60 transition-colors shrink-0"
                                                        title="Delete this notification"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {displayNotifications.length === 0 && !loading && (
                                    <div className="p-10 text-center text-stone-400 text-xs font-semibold space-y-2">
                                        <Sparkles className="w-6 h-6 mx-auto text-[#C9974A] opacity-60" />
                                        <p>No notifications matching filter.</p>
                                        <p className="text-[10px] text-stone-400 font-normal">Click "Broadcast" to send an alert to your staff team.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            {/* ── 3. SEND BROADCAST NOTIFICATION MODAL ── */}
            <AnimatePresence>
                {showSendModal && (
                    <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white border-2 border-[#C9974A] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-[#4E1414]"
                        >
                            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-2xl bg-[#4E1414] flex items-center justify-center shadow-md">
                                        <Megaphone className="w-5 h-5 text-[#C9974A]" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-[#4E1414] text-base leading-none">Broadcast Push Notification</h3>
                                        <p className="text-[10px] font-bold text-[#C9974A] uppercase tracking-wider mt-1">Sends live push alert to logged-in staff</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowSendModal(false)} className="text-stone-400 hover:text-stone-600 p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSendNotification} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-extrabold text-[#4E1414] mb-1">Notification Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Assemble in main room / Table 4 Urgent"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#4E1414] focus:bg-white outline-none focus:border-[#C9974A] transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-extrabold text-[#4E1414] mb-1">Message Content</label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Type alert message to broadcast across POS sessions..."
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-medium text-[#4E1414] focus:bg-white outline-none focus:border-[#C9974A] transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-extrabold text-stone-600 mb-1">Target Role</label>
                                        <select
                                            value={targetRole}
                                            onChange={e => setTargetRole(e.target.value)}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-[#4E1414] outline-none cursor-pointer focus:border-[#C9974A]"
                                        >
                                            <option value="all">All Staff Members</option>
                                            <option value="cashier">Cashiers Only</option>
                                            <option value="waiter">Waiters Only</option>
                                            <option value="kitchen">Kitchen Staff</option>
                                            <option value="admin">Admins Only</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-extrabold text-stone-600 mb-1">Priority Level</label>
                                        <select
                                            value={priority}
                                            onChange={e => setPriority(e.target.value as any)}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-[#4E1414] outline-none cursor-pointer focus:border-[#C9974A]"
                                        >
                                            <option value="normal">Normal Announcement</option>
                                            <option value="urgent">🚨 Urgent System Alert</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowSendModal(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-[#4E1414] hover:bg-stone-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sending}
                                        className="flex-1 bg-[#4E1414] hover:bg-[#350C0C] text-[#F6EEDF] text-xs font-black py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <Send className="w-3.5 h-3.5 text-[#C9974A]" />
                                        {sending ? 'Broadcasting...' : 'Send Push Notification'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
