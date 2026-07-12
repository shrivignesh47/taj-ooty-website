-- Create staff attendance table for clock-in/clock-out tracking
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid REFERENCES public.staff_users(id) ON DELETE CASCADE,
    clock_in timestamp with time zone DEFAULT now() NOT NULL,
    clock_out timestamp with time zone,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Allow all staff to manage and view attendance logs
DROP POLICY IF EXISTS "allow_staff_select_attendance" ON public.staff_attendance;
CREATE POLICY "allow_staff_select_attendance" ON public.staff_attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_staff_insert_attendance" ON public.staff_attendance;
CREATE POLICY "allow_staff_insert_attendance" ON public.staff_attendance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_staff_update_attendance" ON public.staff_attendance;
CREATE POLICY "allow_staff_update_attendance" ON public.staff_attendance FOR UPDATE USING (true);
