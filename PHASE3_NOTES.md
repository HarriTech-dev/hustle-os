# Phase 3 — opt-in public marketplace

Adds /shop (public catalogue), owner publishing/unpublishing at /marketplace, and migration 006_public_marketplace.sql.

## Deployment checklist
1. Backup Supabase and test on staging first.
2. Apply migration 006 in Supabase SQL editor, after 001–005. This creates a new table; it does not alter existing inventory or subscription data.
3. Confirm public read of published listings, denial of private listing reads, and inability of another user to modify someone else's listing.
4. Run npm install, npm run build, and end-to-end tests before deploying. These tests have not been completed in this environment.
5. Publishing a listing publicly exposes the provided WhatsApp number. Do not enter a personal number unless you intend it to be public.
6. This is contact-to-order only: no checkout, escrow, or verified seller status is provided.

## Security caveats
- Public catalogue uses a dedicated listing table rather than exposing private inventory.
- The database currently does not automatically sync inventory changes to already published listing snapshots. Owners can republish to refresh product information.
- Public marketplace currently lists up to 60 newest listings and has no moderation, abuse reporting, or search/pagination.
