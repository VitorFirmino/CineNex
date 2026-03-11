-- These policies assume tables live in the public schema with Prisma's quoted model names.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Profile'
      AND policyname = 'profile_select_own'
  ) THEN
    EXECUTE '
      CREATE POLICY profile_select_own
      ON public."Profile"
      FOR SELECT
      TO authenticated
      USING (id = auth.uid()::text)
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
      AND policyname = 'profile_insert_own'
  ) THEN
    EXECUTE '
      CREATE POLICY profile_insert_own
      ON public."Profile"
      FOR INSERT
      TO authenticated
      WITH CHECK (id = auth.uid()::text)
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
      AND policyname = 'profile_update_own'
  ) THEN
    EXECUTE '
      CREATE POLICY profile_update_own
      ON public."Profile"
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid()::text)
      WITH CHECK (id = auth.uid()::text)
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
      AND policyname = 'favorite_manage_own'
  ) THEN
    EXECUTE '
      CREATE POLICY favorite_manage_own
      ON public."Favorite"
      FOR ALL
      TO authenticated
      USING ("profileId" = auth.uid()::text)
      WITH CHECK ("profileId" = auth.uid()::text)
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
      AND policyname = 'watch_progress_manage_own'
  ) THEN
    EXECUTE '
      CREATE POLICY watch_progress_manage_own
      ON public."WatchProgress"
      FOR ALL
      TO authenticated
      USING ("profileId" = auth.uid()::text)
      WITH CHECK ("profileId" = auth.uid()::text)
    ';
  END IF;
END
$$;

-- No policy is created for "MaterializedSummary" in phase 1.
-- Once RLS is enabled there, authenticated/anon clients will have no row access by default.
