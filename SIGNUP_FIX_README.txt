HustleOS AI - Signup diagnostics patch

Changed: src/components/auth/register-form.tsx

- Display Supabase signup errors instead of redirecting.
- Handle email-confirmation signups (no session) without redirecting to protected onboarding.
- Only write user_profiles with an authenticated session; check and report write errors.
- Include live auth callback redirect for email confirmation.
- Prevent double submits and always clear loading state.

Before deployment:
1. Verify Vercel NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY correspond to the same Supabase project.
2. Supabase Auth URL Configuration must allow https://hustle-os-fm8q.vercel.app/auth/callback (with query parameters).
3. Confirm Auth email sending is available; the previously observed email rate limit can still block signups.
4. If the account is created without a session, the profile must be created after confirmation/sign-in by a trusted server-side workflow or during onboarding. This patch deliberately does not bypass RLS.
5. Test with a NEW email and check Authentication > Users and Auth Logs.

No Supabase SQL changes, secrets, or Paystack changes are included.
