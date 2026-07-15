-- Add foreign key constraints on role_permissions table to establish schema relationships
ALTER TABLE public.role_permissions
ADD CONSTRAINT fk_role_permissions_roles
FOREIGN KEY (role_id) REFERENCES public.roles(id)
ON DELETE CASCADE;

ALTER TABLE public.role_permissions
ADD CONSTRAINT fk_role_permissions_permissions
FOREIGN KEY (permission_id) REFERENCES public.permissions(id)
ON DELETE CASCADE;
