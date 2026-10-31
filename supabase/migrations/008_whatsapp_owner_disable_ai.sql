-- Phase 11: owner can disable AI automation only; no user may enable it.
-- This migration is additive and does not alter existing messages or billing.
REVOKE UPDATE ON public.whatsapp_connections FROM authenticated;
GRANT UPDATE (ai_enabled, updated_at) ON public.whatsapp_connections TO authenticated;
DROP POLICY IF EXISTS whatsapp_owner_disable_ai ON public.whatsapp_connections;
CREATE POLICY whatsapp_owner_disable_ai ON public.whatsapp_connections
  FOR UPDATE TO authenticated
  USING (owner_user_id = (select auth.uid()))
  WITH CHECK (owner_user_id = (select auth.uid()) AND ai_enabled = false);
-- Note: this does not permit claiming or provisioning phone IDs.
