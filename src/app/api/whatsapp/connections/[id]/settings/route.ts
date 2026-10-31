import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) return NextResponse.json({ error: "Invalid connection" }, { status: 400 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const enabled = (payload as { ai_enabled?: unknown } | null)?.ai_enabled;
  if (typeof enabled !== "boolean") return NextResponse.json({ error: "ai_enabled must be boolean" }, { status: 400 });
  // Enabling automation is deliberately blocked until a verified outbound engine,
  // durable rate limiting, consent, and human handoff are operational.
  if (enabled) return NextResponse.json({ error: "Automatic replies are not yet available. This safety lock cannot be overridden." }, { status: 409 });
  const { data, error } = await db.from("whatsapp_connections")
    .update({ ai_enabled: false, updated_at: new Date().toISOString() })
    .eq("id", id).eq("owner_user_id", user.id).select("id,ai_enabled").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to update connection" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  return NextResponse.json({ connection: data });
}
