# HustleOS AI — Auth recovery patch

## Changes
- Password-reset email now uses `/reset-password` as its exact allowed redirect URL, instead of an unallowlisted callback URL with query parameters.
- Reset page handles PKCE `code`, recovery `token_hash`, and browser implicit token fragments, then allows password update.
- Signup confirmation redirect uses exact allowlisted `/auth/callback` URL.
- Password-reset request now displays the actual Supabase error (including rate limits).

## Required Supabase configuration
Site URL: https://hustle-os-fm8q.vercel.app
Allowed redirect URLs:
- https://hustle-os-fm8q.vercel.app/auth/callback
- https://hustle-os-fm8q.vercel.app/reset-password

In Authentication > Email Templates > Reset Password, use the Supabase `{{ .ConfirmationURL }}` link (not a hard-coded localhost or login link). Check template URLs and Supabase Auth logs if the recovery email still redirects to login.

## Verify registration
In Authentication > Users, check whether a fresh account appears and whether `email_confirmed_at` is populated. An absent user indicates signup failure; the updated registration form should display the Supabase error. If it is present but unconfirmed, confirm the email before login. If the account exists but user_profiles is missing, inspect RLS and profile creation. Do not run database changes without reviewing logs.

## Deployment
Upload changed files to GitHub, redeploy Vercel, request a NEW recovery email, and test in the same browser without opening old reset links.

## Limitations
No live Supabase credentials were available and this patch has not been tested against the deployed app. The project dependencies were not installed in this environment, so no production build was run.
