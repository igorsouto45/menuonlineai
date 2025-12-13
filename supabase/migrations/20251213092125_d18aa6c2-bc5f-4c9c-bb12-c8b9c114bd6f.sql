-- Ensure admin role exists in the has_role function
-- The function already exists, so we just need to ensure the admin user gets the admin role

-- Note: The user will be created via the auth signup, and we'll add them to user_roles with admin role
-- First, let's create a function to promote a user to admin by email
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from profiles
  SELECT id INTO target_user_id FROM public.profiles WHERE email = user_email;
  
  IF target_user_id IS NOT NULL THEN
    -- Insert or update the user role to admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  END IF;
END;
$$;