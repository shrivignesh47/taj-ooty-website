const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '../../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        }
        env[key] = value;
    }
});

const ws = require('ws');

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: { persistSession: false },
        realtime: {
            transport: ws
        }
    }
);

async function cleanDuplicates() {
    try {
        console.log('Fetching all menu items...');
        const { data: menuItems, error } = await supabase
            .from('menu_items')
            .select('id, name, category_id')
            .order('name');

        if (error) throw error;

        const seen = new Set();
        const duplicateIds = [];

        menuItems.forEach(item => {
            const key = `${item.name.toLowerCase().trim()}_${item.category_id}`;
            if (seen.has(key)) {
                duplicateIds.push(item.id);
            } else {
                seen.add(key);
            }
        });

        console.log(`Found ${duplicateIds.length} duplicate items to delete.`);

        if (duplicateIds.length > 0) {
            // Delete in batches of 100 to avoid request size limits
            const batchSize = 100;
            for (let i = 0; i < duplicateIds.length; i += batchSize) {
                const batch = duplicateIds.slice(i, i + batchSize);
                console.log(`Deleting batch ${i / batchSize + 1} (${batch.length} items)...`);
                const { error: delErr } = await supabase
                    .from('menu_items')
                    .delete()
                    .in('id', batch);
                if (delErr) throw delErr;
            }
            console.log('Deduplication completed successfully!');
        } else {
            console.log('No duplicates found.');
        }

    } catch (e) {
        console.error('Error during clean duplicates:', e.message);
    }
}

cleanDuplicates();
