const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
    await client.connect();

    const sql = `
    CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id uuid REFERENCES public.staff_users(id) ON DELETE CASCADE UNIQUE,
      visible_widgets jsonb NOT NULL DEFAULT '[]',
      widget_order jsonb NOT NULL DEFAULT '[]',
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "staff can manage own dashboard prefs" ON public.dashboard_preferences;
    CREATE POLICY "staff can manage own dashboard prefs" ON public.dashboard_preferences
      FOR ALL USING (
        auth.role() = 'authenticated' AND (
          staff_id IN (SELECT id FROM public.staff_users WHERE auth_id = auth.uid()) OR
          EXISTS (SELECT 1 FROM public.staff_users WHERE auth_id = auth.uid())
        )
      );

    -- Allow anon and service role for fallback/dev
    DROP POLICY IF EXISTS "public read access dashboard_preferences" ON public.dashboard_preferences;
    CREATE POLICY "public read access dashboard_preferences" ON public.dashboard_preferences
      FOR SELECT USING (true);
    `;

    await client.query(sql);
    console.log("DASHBOARD_PREFERENCES TABLE CREATED SUCCESSFULLY");
    await client.end();
}

run().catch(err => {
    console.error("MIGRATION ERROR:", err);
    process.exit(1);
});
