# Phase 7: OpenAI chatbot and deployment readiness

## New module
- `/chatbot`: authenticated user-facing AI chatbot.
- `/api/ai/chat`: authenticated server-only OpenAI Responses API call.
- Set `OPENAI_API_KEY` as a Vercel server environment variable; **never** prefix it with `NEXT_PUBLIC_`.
- Optional `OPENAI_MODEL` (defaults to `gpt-4.1-mini`; ensure your account has model access).
- Chatbot sends only the submitted message; it does not read customer, inventory, or payment data.
- `store: false` requests that OpenAI not store the response; check applicable provider retention policies separately.
- The in-memory rate limit is only a basic per-instance throttle. Configure durable edge/Redis rate limiting and spending limits before public rollout.

## WhatsApp
- The existing marketplace uses `wa.me` click-to-chat links for customer inquiries. This does not send automated WhatsApp messages.
- To build automated WhatsApp Business chatbot messaging, obtain Meta Cloud API credentials, a verified phone number ID, webhook verify token, app secret, and approved templates where required. Do not add these secrets to the browser.
- Verify incoming webhook signatures, deduplicate message IDs, respect opt-in and the WhatsApp messaging window, and implement queue/retry and abuse protection.

## Deployment gates
1. Back up production Supabase. Create a separate staging project and apply migrations in order through `006_public_marketplace.sql`.
2. Configure Supabase URL and anon key (public), service role key (server only), Paystack keys and plan codes (server only), `NEXT_PUBLIC_SITE_URL`, and `OPENAI_API_KEY` (server only).
3. Run `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm audit` in network-enabled CI. This archive has not passed those checks.
4. Test registration, login, profile creation, RLS cross-account access, inventory create, marketplace publish/unpublish, WhatsApp links, chatbot authentication, and payment test-mode webhooks.
5. Deploy to a Vercel Preview URL first; verify all flows before promoting to production.

**Do not treat this package as production-verified.** Local dependency installation timed out in the build environment. No production database or Vercel deployment was changed.
