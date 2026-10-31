# Phase 10 — Tenant-scoped WhatsApp inbox preview

## Added
- `/whatsapp` authenticated, read-only inbox preview for tenant-owned connections and last 100 messages.
- Sidebar link and explicit empty/error states.
- No client-side service role access; Supabase RLS policies from migration 007 still apply.

## Not implemented
- Meta Embedded Signup / business connection wizard, token exchange, outbound messaging, OpenAI auto-replies, shared staff inbox, message pagination, message retention controls.
- No production or Meta integration verification; do not represent this as a functioning AI WhatsApp chatbot.

## Deployment gate
- Test migration 007 on staging and validate cross-tenant isolation with two accounts.
- Run `npm ci` after generating/committing a verified lockfile, `npm run build`, and test authenticated inbox with actual Meta test messages.
- Ensure access tokens are never exposed to browsers or checked into git.
- No changes to live accounts, WhatsApp numbers, or databases are performed by this package.
