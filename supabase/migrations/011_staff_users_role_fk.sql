-- Add missing foreign key constraint between staff_users and roles
ALTER TABLE public.staff_users
ADD CONSTRAINT fk_staff_users_roles
FOREIGN KEY (role_id) REFERENCES public.roles(id)
ON DELETE SET NULL;
