# Phase 4 — incremental feature restoration

Added authenticated `/advisor` and `/debtors` pages and sidebar links. Advisor is **rule-based**, not a generative AI integration. It reads user-scoped Supabase inventory, invoices, and transactions without using privileged service credentials. Debtors uses existing invoice data, with no schema changes or destructive writes. Existing billing and auth files are untouched.

## Before production
- Run `npm install`, `npm run build`, and tests in a network-enabled environment.
- Validate RLS for inventory, invoices, transactions and business_settings with two distinct test users.
- Check invoice status semantics against actual business workflows; verify currency handling and pagination for large datasets.
- Test on staging with a backed-up database. No SQL migration is required for Phase 4.
- This is not yet a full LLM advisor or CRM debt management module.
