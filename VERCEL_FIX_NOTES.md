# Vercel NOT_FOUND fix and security review notes

## Applied changes

- Removed `basePath: "/nextjs"` from `next.config.ts`. This setting makes Next.js serve the application under `/nextjs` rather than the domain root, which commonly causes a 404 when opening the normal Vercel project URL at `/`.
- Removed `assetPrefix: "/nextjs"` because it was paired with the Replit-style base path and would incorrectly prefix static asset URLs for a normal root-domain deployment.
- Removed the hard-coded Turbopack root `/home/runner/workspace`, which is environment-specific and not appropriate for a normal Vercel build. Next.js can infer the project root.
- Strengthened `.gitignore` to ignore `.env*` files by default while allowing `.env.example`, and ignore `.vercel`.

## Security review findings

- No obvious hardcoded API-key/private-key/password literals were detected by a basic pattern scan of the supplied archive. This is not a guarantee that the archive or its history is secret-free; the archive did not include Git history.
- Supabase browser configuration uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are intended to be public client values; never put a Supabase service-role key or other privileged secret in a `NEXT_PUBLIC_` variable. Keep privileged keys server-only.
- The RLS migration currently allows an authenticated user to INSERT and UPDATE their own `subscriptions` row. If subscription plan/status controls paid features, this can let users grant themselves a higher plan. Move subscription writes to a trusted server/payment-webhook path and remove client INSERT/UPDATE policies after confirming the app's subscription flow. This was flagged but not automatically changed because it requires confirming the intended billing flow and applying a database migration to the live Supabase project.
- `src/lib/supabase/server.ts` silently falls back to placeholder Supabase credentials when environment variables are missing. This can mask a misconfigured deployment and lead to confusing runtime failures. Configure both environment variables in Vercel; consider failing clearly at runtime rather than using placeholder credentials.

## Required Vercel environment variables

Set these in Vercel Project Settings → Environment Variables for the environments you deploy:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (used by the server action for Google OAuth callback URL)

Use the actual values from your Supabase project and deployed site; do not commit them to the repository. Configure the Google OAuth redirect URL in Supabase to include `https://YOUR_DOMAIN/auth/callback`.

## Verification

1. Deploy this version to a Preview deployment.
2. Open `/` and confirm it redirects to `/login`.
3. Open `/login` and `/register`; verify static assets load.
4. Test sign-in, sign-up, OAuth callback, and protected routes with valid Supabase configuration.
5. If the Vercel deployment still returns 404, inspect the deployment's Build and Output logs and confirm the deployed commit contains these configuration changes.
