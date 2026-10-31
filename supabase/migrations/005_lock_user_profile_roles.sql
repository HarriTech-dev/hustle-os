-- Prevent authenticated users from assigning themselves privileged profile roles.
-- The current application has no trusted role-management workflow, so existing
-- profiles are normalized to owner. Introduce a separate admin-only workflow before
-- adding manager/staff/admin assignment features.
UPDATE public.user_profiles SET role = 'owner' WHERE role <> 'owner';

-- Remove table-wide write grants, then allow only ordinary profile fields.
REVOKE ALL PRIVILEGES ON TABLE public.user_profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT (role), UPDATE (role) ON TABLE public.user_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_profiles TO authenticated;
GRANT INSERT (id, email, name, avatar_url) ON TABLE public.user_profiles TO authenticated;
GRANT UPDATE (name, avatar_url) ON TABLE public.user_profiles TO authenticated;

-- Recreate the owner-scoped policies defensively. Column privileges prevent role
-- changes; RLS still constrains rows to the signed-in user's own profile.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Prevent concurrent/repeated checkout requests from creating multiple pending
-- monthly subscriptions for the same user. Keep the newest pending attempt if the
-- table already contains duplicates from the earlier implementation.
ALTER TABLE public.subscription_payment_attempts
  ADD COLUMN IF NOT EXISTS authorization_url TEXT;
WITH ranked_pending AS (
  SELECT id, row_number() OVER (
    PARTITION BY user_id ORDER BY created_at DESC, id DESC
  ) AS row_number
  FROM public.subscription_payment_attempts
  WHERE status = 'pending'
)
UPDATE public.subscription_payment_attempts p
SET status = 'failed', updated_at = NOW()
FROM ranked_pending r
WHERE p.id = r.id AND r.row_number > 1;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payment_attempts_one_pending_per_user
  ON public.subscription_payment_attempts(user_id)
  WHERE status = 'pending';
