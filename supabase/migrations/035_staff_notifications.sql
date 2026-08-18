-- Create staff_notifications table for broadcast and role-targeted push alerts
CREATE TABLE IF NOT EXISTS staff_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name TEXT NOT NULL,
    sender_role TEXT DEFAULT 'Staff',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT DEFAULT 'all',
    priority TEXT DEFAULT 'normal',
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read staff_notifications"
    ON staff_notifications FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert staff_notifications"
    ON staff_notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update staff_notifications"
    ON staff_notifications FOR UPDATE USING (true);
