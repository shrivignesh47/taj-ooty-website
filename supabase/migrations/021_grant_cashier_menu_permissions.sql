-- Grant menu management permissions to the cashier role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'cashier' AND p.key IN ('edit_menu', 'view_menu')
ON CONFLICT DO NOTHING;
