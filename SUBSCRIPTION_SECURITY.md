# HustleOS AI — Secure Paystack monthly subscriptions

## What is implemented

- Monthly Growth and Pro checkout is initialized on the server. The browser sends only the plan identifier; the server owns the plan prices and Paystack plan codes.
- The Paystack secret key and Supabase service-role key are server-only. Never prefix either with `NEXT_PUBLIC_`.
- The checkout route authenticates the user and stores a server-created, unique payment reference before calling Paystack.
- The callback verification route authenticates the user, confirms ownership of the reference, and verifies the transaction directly with Paystack.
- The webhook verifies `x-paystack-signature` against the exact raw request body using HMAC-SHA512 and then independently verifies the transaction with Paystack.
- Activation checks success status, unique reference, plan-specific amount in kobo, NGN currency, customer email when returned, and the configured Paystack test/live domain.
- The SQL function locks a payment attempt and atomically consumes it once. Duplicate callback/webhook processing does not grant a second subscription period.
- Recurring charge success events are verified and recorded in a unique renewal ledger before the subscription period is extended. Failed-invoice events mark the matching subscription `past_due` when the provider subscription code is available.
- Browser roles cannot write subscription entitlements or read other users' subscriptions. Payment attempt and renewal ledger tables have no browser-role privileges.

## Required manual setup before checkout can work

1. Apply migrations in order to the correct Supabase project:
   - `supabase/migrations/003_secure_subscription_writes.sql`
   - `supabase/migrations/004_paystack_secure_subscriptions.sql`
   - `supabase/migrations/005_lock_user_profile_roles.sql`
2. In Paystack Dashboard, create monthly recurring plans for Growth (NGN 9,900/month) and Pro (NGN 24,900/month). Configure the matching plan codes in Vercel. Checkout fetches each plan from Paystack and refuses to start unless its amount and monthly interval match the expected price.
3. Configure these Vercel environment variables in Preview/staging first:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)
   - `PAYSTACK_SECRET_KEY` (server only; start with `sk_test_...`)
   - `PAYSTACK_GROWTH_PLAN_CODE`
   - `PAYSTACK_PRO_PLAN_CODE`
   - `PAYSTACK_EXPECTED_DOMAIN=test`
4. Set Paystack's test-mode webhook URL to `https://YOUR_HOST/api/payments/paystack/webhook`. Use the same secret key's test environment for checkout and webhook signature verification.
5. Confirm the plan codes are configured for the expected currency and exact monthly amounts. The code rejects payment amounts that do not match the server's NGN amounts.
6. Run tests below in test mode before adding live credentials. Set `PAYSTACK_EXPECTED_DOMAIN=live` and the live secret key only after the integration has been reviewed and tested.

## Important recurring billing notes

- The code expects Paystack's `subscription.create` event to link the provider subscription code to the matching payment attempt using the customer's email and plan code. It fails closed when more than one unmatched checkout could match. If Paystack's event shape or delivery ordering differs for the merchant account, inspect Paystack's webhook delivery logs and test the mapping before going live.
- A renewal is extended only when a `charge.success` webhook includes a subscription code that matches a known HustleOS subscription, and the transaction verification API confirms its reference, amount, currency, and success status.
- If a renewal event cannot be matched safely, the webhook does not grant time. Investigate and reconcile it rather than manually changing a subscription row from the browser.
- Cancellation/disable events should be wired to the exact Paystack subscription code before offering self-service cancellation. Do not allow a browser to set `status`, `plan`, or billing dates directly.
- This code uses monthly plan lengths; it does not prorate upgrades or handle refunds/disputes automatically. Add those workflows before broad production use.

## Security verification checklist

- [ ] Unauthenticated `POST /api/payments/paystack/initialize` returns 401.
- [ ] Sending `{"plan":"enterprise"}` returns 400.
- [ ] Browser requests cannot choose amount, currency, user ID, subscription status, or period end; those fields are ignored/not accepted.
- [ ] Authenticated users cannot insert/update/delete `public.subscriptions` through the Supabase anon/authenticated roles.
- [ ] Authenticated users cannot set or update `user_profiles.role`; migration 005 grants only ordinary profile-field writes and normalizes existing roles to `owner`.
- [ ] Concurrent checkout requests reuse one pending checkout and cannot create multiple pending recurring subscriptions for the same user.
- [ ] A tampered webhook signature returns 401.
- [ ] A valid signature with a failed, wrong-amount, wrong-currency, wrong-reference, or wrong-domain transaction does not activate a plan.
- [ ] Replaying the same successful webhook does not extend a period twice.
- [ ] A payment reference belonging to another user cannot be verified through the callback route.
- [ ] Test-mode recurring charge success renews exactly one month; failed invoice event marks the matching subscription `past_due`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY` are not present in any client bundle, Git history, logs, or `NEXT_PUBLIC_` variables.

## Deploy carefully

Apply migrations to staging first and inspect the current subscriptions table before production. Migration 004 keeps the newest row when old duplicate subscriptions exist so it can enforce one row per user. Back up the database before applying it. A successful source build does not prove Paystack webhook delivery or live billing is working; complete the test-mode checklist and inspect Paystack's webhook delivery history.
