CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Profile"
    WHERE id = auth.uid()::text
      AND role = 'ADMIN'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Profile'
      AND policyname = 'profile_admin_select_all'
  ) THEN
    EXECUTE '
      CREATE POLICY profile_admin_select_all
      ON public."Profile"
      FOR SELECT
      TO authenticated
      USING (public.is_admin_user())
    ';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Favorite'
      AND policyname = 'favorite_admin_select_all'
  ) THEN
    EXECUTE '
      CREATE POLICY favorite_admin_select_all
      ON public."Favorite"
      FOR SELECT
      TO authenticated
      USING (public.is_admin_user())
    ';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'WatchProgress'
      AND policyname = 'watch_progress_admin_select_all'
  ) THEN
    EXECUTE '
      CREATE POLICY watch_progress_admin_select_all
      ON public."WatchProgress"
      FOR SELECT
      TO authenticated
      USING (public.is_admin_user())
    ';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'MaterializedSummary'
      AND policyname = 'materialized_summary_admin_select_all'
  ) THEN
    EXECUTE '
      CREATE POLICY materialized_summary_admin_select_all
      ON public."MaterializedSummary"
      FOR SELECT
      TO authenticated
      USING (public.is_admin_user())
    ';
  END IF;
END
$$;
