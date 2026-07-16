const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
    "http://localhost:54321",
    "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
    {
        auth: { persistSession: false },
        realtime: {
            transport: ws
        }
    }
);

async function test() {
    try {
        console.log('Logging in as cashier...');
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
            email: 'admin@taj.com',
            password: 'password123'
        });
        if (loginErr) {
            console.error('Login error:', loginErr);
            return;
        }
        console.log('Logged in successfully. User ID:', loginData.user.id);

        console.log('Fetching live orders with restaurant_tables join...');
        const { data: liveOrders, error: liveErr } = await supabase
            .from('orders')
            .select(`
                *,
                restaurant_tables (*),
                order_items (
                    *,
                    menu_items (name, is_veg, category_id)
                )
            `);

        if (liveErr) {
            console.error('KDS fetch error:', liveErr);
        } else {
            console.log('Successfully fetched live orders size:', liveOrders.length);
            if (liveOrders.length > 0) {
                console.log('Sample order sample item:', liveOrders[0].order_items?.[0]);
            }
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

test();
