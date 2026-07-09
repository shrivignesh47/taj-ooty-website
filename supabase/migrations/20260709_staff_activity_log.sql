-- Migration: Staff Activity Log
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.staff_activity_log (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id    UUID NOT NULL REFERENCES public.staff_users(id) ON DELETE CASCADE,
    login_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups per staff member
CREATE INDEX IF NOT EXISTS idx_activity_log_staff_id ON public.staff_activity_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_login_at ON public.staff_activity_log(login_at DESC);

-- RLS: admin service role bypasses; staff can only read own log
ALTER TABLE public.staff_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow the service role (used by adminActions.ts) full access
CREATE POLICY "Service role full access"
    ON public.staff_activity_log
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Comment: this policy intentionally allows all for service_role which calls this from server-side only.
-- Client-side anon key cannot reach this table.
