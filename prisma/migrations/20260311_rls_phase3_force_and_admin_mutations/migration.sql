ALTER TABLE public."Profile" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."Favorite" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."WatchProgress" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."MaterializedSummary" FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Profile'
      AND policyname = 'profile_admin_update_all'
  ) THEN
    EXECUTE '
      CREATE POLICY profile_admin_update_all
      ON public."Profile"
      FOR UPDATE
      TO authenticated
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user())
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
      AND tablename = 'Profile'
      AND policyname = 'profile_admin_delete_all'
  ) THEN
    EXECUTE '
      CREATE POLICY profile_admin_delete_all
      ON public."Profile"
      FOR DELETE
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
      AND policyname = 'favorite_admin_manage_all'
  ) THEN
    EXECUTE '
      CREATE POLICY favorite_admin_manage_all
      ON public."Favorite"
      FOR ALL
      TO authenticated
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user())
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
      AND policyname = 'watch_progress_admin_manage_all'
  ) THEN
    EXECUTE '
      CREATE POLICY watch_progress_admin_manage_all
      ON public."WatchProgress"
      FOR ALL
      TO authenticated
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user())
    ';
  END IF;
END
$$;
