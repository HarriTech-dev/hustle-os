-- Phase 9: additive, tenant-isolated WhatsApp connection and inbox foundation.
-- Apply only after testing on staging. No existing tables or rows are deleted.
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL UNIQUE,
  display_phone_number text,
  business_account_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','paused','disconnected')),
  ai_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, owner_user_id)
);
CREATE INDEX IF NOT EXISTS whatsapp_connections_owner_idx ON public.whatsapp_connections(owner_user_id);
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  provider_message_id text NOT NULL,
  customer_wa_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_type text NOT NULL DEFAULT 'text',
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, provider_message_id)
);
CREATE INDEX IF NOT EXISTS whatsapp_messages_inbox_idx ON public.whatsapp_messages(connection_id, customer_wa_id, created_at DESC);
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_connections, public.whatsapp_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.whatsapp_connections, public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_connections, public.whatsapp_messages TO service_role;
DROP POLICY IF EXISTS whatsapp_connection_owner_read ON public.whatsapp_connections;
CREATE POLICY whatsapp_connection_owner_read ON public.whatsapp_connections FOR SELECT TO authenticated USING (owner_user_id = (select auth.uid()));
DROP POLICY IF EXISTS whatsapp_message_owner_read ON public.whatsapp_messages;
CREATE POLICY whatsapp_message_owner_read ON public.whatsapp_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.whatsapp_connections c WHERE c.id = connection_id AND c.owner_user_id = (select auth.uid())));
-- Connection provisioning must be performed through a trusted server-side onboarding flow.
-- Never allow browser clients to claim arbitrary Meta phone_number_id values.
