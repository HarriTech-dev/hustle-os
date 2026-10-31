-- Secure Paystack monthly subscriptions for HustleOS AI.
-- Run after 003_secure_subscription_writes.sql. Keep this migration under version control.

-- A single authoritative subscription row per account. If old duplicates exist, retain the newest row.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY user_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
  ) AS row_number
  FROM public.subscriptions
)
DELETE FROM public.subscriptions s USING ranked r
WHERE s.id = r.id AND r.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_row_per_user
  ON public.subscriptions(user_id);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider_reference TEXT;

CREATE TABLE IF NOT EXISTS public.subscription_payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('growth', 'pro')),
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency TEXT NOT NULL CHECK (currency = 'NGN'),
  customer_email TEXT NOT NULL,
  paystack_plan_code TEXT NOT NULL,
  paystack_subscription_code TEXT UNIQUE,
  paystack_next_payment_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  provider_transaction_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS subscription_payment_attempts_user_created
  ON public.subscription_payment_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscription_payment_attempts_pending
  ON public.subscription_payment_attempts(status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.subscription_payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.subscription_payment_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.subscription_payment_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.subscriptions TO service_role;

-- Reassert that browser roles cannot change entitlements. Authenticated SELECT remains
-- subject to the own-row RLS policy created by migration 003.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

-- Atomically consumes a pending payment attempt and activates its subscription.
-- The caller must verify the Paystack transaction through Paystack's API first.
CREATE OR REPLACE FUNCTION public.apply_verified_subscription_payment(
  p_reference TEXT,
  p_provider_transaction_id TEXT,
  p_verified_amount_kobo INTEGER,
  p_verified_currency TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment public.subscription_payment_attempts%ROWTYPE;
  expected_amount INTEGER;
  now_utc TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO payment
  FROM public.subscription_payment_attempts
  WHERE reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown payment reference';
  END IF;

  IF payment.status = 'succeeded' THEN
    RETURN FALSE;
  END IF;

  IF payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment attempt is not pending';
  END IF;

  expected_amount := CASE payment.plan
    WHEN 'growth' THEN 990000
    WHEN 'pro' THEN 2490000
    ELSE NULL
  END;

  IF expected_amount IS NULL
     OR payment.amount_kobo <> expected_amount
     OR p_verified_amount_kobo <> expected_amount
     OR p_verified_currency <> 'NGN'
     OR payment.currency <> p_verified_currency
     OR p_provider_transaction_id IS NULL
     OR length(p_provider_transaction_id) = 0 THEN
    RAISE EXCEPTION 'Verified payment does not match the expected plan';
  END IF;

  UPDATE public.subscription_payment_attempts
  SET status = 'succeeded',
      provider_transaction_id = p_provider_transaction_id,
      verified_at = now_utc,
      updated_at = now_utc
  WHERE id = payment.id;

  INSERT INTO public.subscriptions (
    user_id, plan, status, current_period_start, current_period_end,
    cancel_at_period_end, payment_provider, payment_provider_reference, payment_provider_subscription_id,
    created_at, updated_at
  ) VALUES (
    payment.user_id, payment.plan, 'active', now_utc,
    COALESCE(payment.paystack_next_payment_date, now_utc + INTERVAL '1 month'), FALSE, 'paystack', payment.reference, payment.paystack_subscription_code,
    now_utc, now_utc
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = 'active',
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = FALSE,
    payment_provider = 'paystack',
    payment_provider_reference = EXCLUDED.payment_provider_reference,
    payment_provider_subscription_id = COALESCE(EXCLUDED.payment_provider_subscription_id, public.subscriptions.payment_provider_subscription_id),
    updated_at = EXCLUDED.updated_at;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_verified_subscription_payment(TEXT, TEXT, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_subscription_payment(TEXT, TEXT, INTEGER, TEXT)
  TO service_role;

COMMENT ON FUNCTION public.apply_verified_subscription_payment(TEXT, TEXT, INTEGER, TEXT) IS
  'Internal only. Call from trusted server code after verifying the matching Paystack transaction. Atomically applies a payment once.';


-- Idempotency ledger for subsequent monthly subscription charges.
CREATE TABLE IF NOT EXISTS public.subscription_renewal_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  provider_transaction_id TEXT NOT NULL UNIQUE,
  subscription_code TEXT NOT NULL,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency TEXT NOT NULL CHECK (currency = 'NGN'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.subscription_renewal_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.subscription_renewal_payments FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.subscription_renewal_payments TO service_role;

CREATE OR REPLACE FUNCTION public.apply_verified_subscription_renewal(
  p_reference TEXT,
  p_provider_transaction_id TEXT,
  p_subscription_code TEXT,
  p_verified_amount_kobo INTEGER,
  p_verified_currency TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  sub public.subscriptions%ROWTYPE;
  expected_amount INTEGER;
BEGIN
  SELECT * INTO sub FROM public.subscriptions
  WHERE payment_provider = 'paystack'
    AND payment_provider_subscription_id = p_subscription_code
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown Paystack subscription'; END IF;

  expected_amount := CASE sub.plan WHEN 'growth' THEN 990000 WHEN 'pro' THEN 2490000 ELSE NULL END;
  IF expected_amount IS NULL OR p_verified_amount_kobo <> expected_amount OR p_verified_currency <> 'NGN' THEN
    RAISE EXCEPTION 'Renewal payment does not match subscription plan';
  END IF;

  INSERT INTO public.subscription_renewal_payments(reference, provider_transaction_id, subscription_code, amount_kobo, currency)
  VALUES (p_reference, p_provider_transaction_id, p_subscription_code, p_verified_amount_kobo, p_verified_currency)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE public.subscriptions SET
    status = 'active',
    current_period_start = GREATEST(COALESCE(current_period_end, NOW()), NOW()),
    current_period_end = GREATEST(COALESCE(current_period_end, NOW()), NOW()) + INTERVAL '1 month',
    payment_provider_reference = p_reference,
    updated_at = NOW()
  WHERE id = sub.id;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_verified_subscription_renewal(TEXT, TEXT, TEXT, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_subscription_renewal(TEXT, TEXT, TEXT, INTEGER, TEXT) TO service_role;
