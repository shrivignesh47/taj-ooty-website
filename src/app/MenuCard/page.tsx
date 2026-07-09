import React from 'react';
import { getLiveCatalog } from '@/features/ordering/api/getCatalog';
import { SaaSMenuClient } from '@/features/ordering/components/SaaSMenuClient';

// Ensure this route is dynamic since it serves live DB content and shouldn't be statically cached permanently at build
export const dynamic = 'force-dynamic';

export default async function MenuCardPage() {
    const catalog = await getLiveCatalog();

    return (
        <main className="min-h-screen bg-[#F6EEDF] selection:bg-[#4E1414] selection:text-[#F6EEDF]">
            <SaaSMenuClient catalog={catalog} />
        </main>
    );
}
