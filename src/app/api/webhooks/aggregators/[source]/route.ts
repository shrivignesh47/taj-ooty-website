import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/features/ordering/lib/supabaseAdmin';
import crypto from 'crypto';

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
    if (!signature || !secret) return false;
    try {
        const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ source: string }> }
) {
    const { source: rawSource } = await params;
    const source = rawSource?.toLowerCase(); // 'swiggy' | 'zomato'
    if (source !== 'swiggy' && source !== 'zomato') {
        return NextResponse.json({ error: 'Invalid aggregator source' }, { status: 400 });
    }

    const secret = source === 'swiggy'
        ? process.env.SWIGGY_WEBHOOK_SECRET
        : process.env.ZOMATO_WEBHOOK_SECRET;

    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-swiggy-signature') || req.headers.get('x-zomato-signature');

    // Verification check (bypassed if secret is not set in dev environment)
    if (secret && !verifySignature(rawBody, signature, secret)) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const orderIdExt = (payload.order_id || payload.orderId || `EXT-${Date.now()}`) as string;
    const customer = payload.customer as { name?: string; phone?: string } | undefined;
    const customerName = customer?.name || (payload.customer_name as string) || 'Online Customer';
    const customerPhone = customer?.phone || (payload.customer_phone as string) || null;
    const items = (payload.items || payload.order_items || []) as Record<string, unknown>[];

    // Insert order into orders table via supabaseAdmin
    const { data: orderData, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert({
            source,
            status: 'pending',
            customer_name: customerName,
            customer_phone: customerPhone,
            token_no: String(orderIdExt).slice(-6)
        })
        .select('id')
        .single();

    if (orderErr || !orderData) {
        return NextResponse.json({ error: `Order creation failed: ${orderErr?.message}` }, { status: 500 });
    }

    // Match menu items and create order_items
    if (Array.isArray(items) && items.length > 0) {
        const { data: menuItems } = await supabaseAdmin.from('menu_items').select('id, name, price');
        const menuMap = new Map<string, { id: string; price: number }>();
        (menuItems || []).forEach(m => menuMap.set(m.name.toLowerCase(), { id: m.id, price: Number(m.price) }));

        const orderItemRows = items.map((item: Record<string, unknown>) => {
            const nameKey = String(item.name || item.item_name || '').toLowerCase();
            const matched = menuMap.get(nameKey);
            return {
                order_id: orderData.id,
                menu_item_id: matched ? matched.id : null,
                qty: Number(item.quantity || item.qty || 1),
                price_at_order: matched ? matched.price : Number(item.price || 100),
                notes: (item.instructions || item.notes || null) as string | null
            };
        });

        await supabaseAdmin.from('order_items').insert(orderItemRows);
    }

    // Log activity
    await supabaseAdmin.from('staff_activity_log').insert({
        action: 'ONLINE_ORDER_WEBHOOK_RECEIVED',
        details: { source, external_order_id: orderIdExt, internal_order_id: orderData.id }
    });

    return NextResponse.json({
        received: true,
        source,
        order_id: orderData.id,
        external_order_id: orderIdExt
    });
}
