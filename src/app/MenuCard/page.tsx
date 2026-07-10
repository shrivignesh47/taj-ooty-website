import React from 'react';
import { getLiveCatalog } from '@/features/ordering/api/getCatalog';
import { SaaSMenuClient } from '@/features/ordering/components/SaaSMenuClient';
import { supabaseAdmin } from '@/features/ordering/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export default async function MenuCardPage({ searchParams }: { searchParams: Promise<{ table?: string }> }) {
    const resolvedParams = await searchParams;
    const catalog = await getLiveCatalog();

    let initialTableNo: number | undefined = undefined;
    if (resolvedParams.table) {
        try {
            const { data } = await supabaseAdmin
                .from('restaurant_tables')
                .select('table_no')
                .eq('id', resolvedParams.table)
                .single();
            if (data) initialTableNo = data.table_no;
        } catch (e) {
            console.error("Invalid table ID");
        }
    }

    return (
        <main className="min-h-screen bg-[#F6EEDF] selection:bg-[#4E1414] selection:text-[red]">
            <SaaSMenuClient catalog={catalog} initialTableNo={initialTableNo} />
        </main>
    );
}
