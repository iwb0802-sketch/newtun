
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (user_id uuid, email text, role public.app_role, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id AS user_id,
           u.email::text,
           COALESCE(r.role, 'free'::public.app_role) AS role,
           u.created_at
    FROM auth.users u
    LEFT JOIN public.user_roles r ON r.user_id = u.id
    ORDER BY u.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_users_with_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;
