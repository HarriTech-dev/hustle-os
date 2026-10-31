# Phase 5 — Customer entry

This increment adds authenticated customer creation to the existing Customers page.

- Uses the existing `customers` table and owner-scoped Supabase RLS; no new SQL migration.
- The server action derives `user_id` from the verified session, not user-submitted fields.
- Validates name/email, bounds input lengths, and displays success/error states.
- Leaves existing customers, invoices, balances, and billing untouched.

## Limitations

No production build or Supabase end-to-end test has been completed in this environment. Do not deploy without staging validation. This phase does not add customer editing, deletion, communication history, or advanced CRM workflows.
