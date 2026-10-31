# Phase 9: multi-tenant WhatsApp foundation (NOT production ready)

This is an additive starting point, not a completed WhatsApp chatbot. No number migration is needed or performed.

## Included
- Migration 007 creates owner-scoped WhatsApp connections and inbound message records with RLS.
- Webhook GET challenge verification and POST Meta HMAC signature verification.
- Webhook routes inbound messages only by an approved, connected Meta phone-number ID; duplicate message IDs are ignored.
- No API tokens are embedded in the source. Configure `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in server-only environment settings.

## Not yet implemented
- Secure embedded Meta signup / number connection ownership verification.
- Per-business credential lifecycle, encrypted token storage, and token rotation.
- Outbound replies, OpenAI automation, human handoff, queue/retry, and subscription/usage metering.
- Provider integration tests, build validation, monitoring, data retention policy, and account deletion flows.
- Tenant staff roles; owner-only read policies are deliberate.

## Before deployment
1. Back up the database; test migration 007 in a separate Supabase staging project.
2. Verify RLS using two separate user sessions and confirm cross-tenant reads fail.
3. Configure Meta webhook secret and verify token on a Vercel Preview environment.
4. Test signed/unsigned webhooks, duplicate deliveries, malformed payloads, and storage failures.
5. Do not use a real business phone number or migrate any existing account until onboarding, inbox, and rollback procedures are tested.

## Important design note
The current application's core records use user ownership rather than a mature organizations/memberships model. This phase deliberately aligns with that schema. A future organization/tenant model with membership permissions is required for multi-user businesses; do not grant access based only on a client-supplied business ID.
