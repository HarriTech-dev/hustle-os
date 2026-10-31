# Phase 6 — CRM customer editing and invoice lookup

- Extends Phase 5. Existing data, authentication and Paystack code retained.
- Customer name links to `/customers/[id]`; editing uses an authenticated server action with owner-scoped update.
- Invoice history uses case-insensitive email matching because legacy invoices lack `customer_id`. It is informational and may be incomplete.
- No schema changes or destructive migrations.
- Production build and Supabase integration tests are still required before deployment.
