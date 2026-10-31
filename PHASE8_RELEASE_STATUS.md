# Phase 8 release gate — NOT CLEARED FOR PRODUCTION

## Verified in this environment
- Source archive extracted successfully.
- Static project structure and presence of expected API routes checked with `node scripts/preflight.mjs`.
- No `.env` secret files found in extracted source tree by preflight script.

## Attempted but blocked
- `npm install --no-audit --no-fund --prefer-offline` exceeded the available execution timeout. Dependencies were not installed.
- Consequently `npm run build`, TypeScript compilation, linting, and `npm audit` could not be completed.

## Security and integration issues to resolve
1. AI route uses an in-memory Map for per-user rate limiting; this is not distributed across Vercel instances. Replace with a shared durable limiter (for example managed Redis or database-backed counters) before exposing paid AI usage broadly.
2. OpenAI API endpoint has not been exercised against a configured test key. Set `OPENAI_API_KEY` as a server-only Vercel environment variable; never `NEXT_PUBLIC_OPENAI_API_KEY`.
3. Marketplace `/shop` uses a Supabase client that may be session-aware. Verify anonymous browsing and RLS policies in a clean browser after applying migration 006 to staging.
4. WhatsApp click-to-chat links are present, but automated WhatsApp Cloud API messaging/webhooks are NOT implemented.
5. Paystack live transaction/webhook flows and Supabase RLS must be tested in staging. Never apply unreviewed migrations directly to production.
6. The source has no package lockfile. Generate and commit `package-lock.json` with a successful install to make builds reproducible.

## Release procedure
1. Create a staging Supabase project and Vercel Preview environment with test credentials.
2. In a network-enabled shell run: `npm install && npm run lint && npx tsc --noEmit && npm run build && npm audit`.
3. Apply pending SQL migrations in order to staging only; inspect data changes and test RLS as anonymous, normal user and service role.
4. Test signup, login, product creation, marketplace publication, chatbot, invoice/customer actions, and Paystack test-mode payments.
5. Configure shared AI rate limiting, production logging and monitoring, and WhatsApp Cloud API only after Meta credentials are available.
6. Promote the tested Vercel Preview deployment to production after all gates pass.

This package does not change production database records or claim successful deployment testing.
