-- Opt-in public marketplace. Never expose the private inventory or business_settings tables.
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
 description text,
 price numeric(12,2) NOT NULL CHECK (price >= 0),
 currency text NOT NULL,
 whatsapp_number text NOT NULL CHECK (whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
 is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,inventory_id)
);
CREATE INDEX IF NOT EXISTS marketplace_listings_public_idx ON public.marketplace_listings(created_at DESC) WHERE is_published = true;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_listings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.marketplace_listings TO anon,authenticated;
GRANT INSERT(owner_id,inventory_id,title,description,price,currency,whatsapp_number,is_published) ON public.marketplace_listings TO authenticated;
GRANT UPDATE(title,description,price,currency,whatsapp_number,is_published,updated_at) ON public.marketplace_listings TO authenticated;
GRANT DELETE ON public.marketplace_listings TO authenticated;
CREATE POLICY marketplace_public_read ON public.marketplace_listings FOR SELECT TO anon,authenticated USING (is_published OR owner_id = (SELECT auth.uid()));
CREATE POLICY marketplace_owner_insert ON public.marketplace_listings FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.inventory i WHERE i.id = inventory_id AND i.user_id = (SELECT auth.uid())));
CREATE POLICY marketplace_owner_update ON public.marketplace_listings FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.inventory i WHERE i.id = inventory_id AND i.user_id = (SELECT auth.uid())));
CREATE POLICY marketplace_owner_delete ON public.marketplace_listings FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));
