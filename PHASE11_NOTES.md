# Phase 11: WhatsApp safety controls

Added authenticated, tenant-scoped disable-only AI switch and migration 008. This is NOT a WhatsApp onboarding wizard, outbound messaging engine, or working AI auto-responder. Do not deploy to production until the build, database policies, and integration tests pass.

Security: server rejects requests to enable automation; only the signed-in connection owner can disable it; database policy enforces owner and false state. Existing records are not deleted.

Before deployment: apply 007 then 008 on a disposable staging Supabase project; test owner vs other owner; test disabled and enabled cases; verify Vercel preview build; configure webhook secrets server-side. Current application also has an in-memory OpenAI rate limiter and no official Meta onboarding flow. These are release blockers.
