-- HustleOS AI: lock subscription changes to trusted server-side code only.
-- Apply this migration to the Supabase project before deploying the UI changes.
-- The browser uses the anon key; authenticated users may read only their own row.
-- No client role may insert, update, delete, or truncate subscription records.

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Remove every existing policy on this table so an older permissive policy cannot
-- accidentally continue allowing subscription writes.
DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.subscriptions',
      existing_policy.policyname
    );
  END LOOP;
END
$$;

-- Remove table-level privileges from browser-facing roles, then grant back only
-- the read privilege required by the subscription settings page.
REVOKE ALL PRIVILEGES ON TABLE public.subscriptions FROM anon, authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

CREATE POLICY "Authenticated users can read their own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.subscriptions IS
  'Subscription entitlements are read-only to browser clients. Only trusted server-side code using a protected service role or a restricted database function may modify rows after verified payment/provider events.';
