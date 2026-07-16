-- Insert view_menu permission key
INSERT INTO public.permissions (key) VALUES ('view_menu')
ON CONFLICT (key) DO NOTHING;

-- Grant view_menu permission to the admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.key = 'view_menu'
ON CONFLICT DO NOTHING;
