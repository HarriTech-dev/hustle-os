import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta verifies the challenge during webhook registration.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected || q.get("hub.mode") !== "subscribe" || q.get("hub.verify_token") !== expected) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(q.get("hub.challenge") ?? "", { status: 200 });
}

export async function POST(req: NextRequest) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const raw = Buffer.from(await req.arrayBuffer());
  if (raw.length > 1_000_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const supplied = signature.startsWith("sha256=") ? signature.slice(7) : "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  if (!/^[a-f0-9]{64}$/i.test(supplied) || !timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload: any;
  try { payload = JSON.parse(raw.toString("utf8")); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (payload?.object !== "whatsapp_business_account") return NextResponse.json({ received: true });
  const db = createAdminClient();
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const phoneId = value?.metadata?.phone_number_id;
      if (typeof phoneId !== "string") continue;
      const { data: connection, error } = await db.from("whatsapp_connections").select("id").eq("phone_number_id", phoneId).eq("status", "connected").maybeSingle();
      if (error) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
      if (!connection) continue; // Unknown/unapproved business numbers cannot write messages.
      for (const msg of value.messages ?? []) {
        if (typeof msg.id !== "string" || typeof msg.from !== "string") continue;
        const { error: insertError } = await db.from("whatsapp_messages").upsert({
          connection_id: connection.id, provider_message_id: msg.id,
          customer_wa_id: msg.from, direction: "inbound", message_type: String(msg.type ?? "unknown").slice(0, 50),
          body: typeof msg.text?.body === "string" ? msg.text.body.slice(0, 10000) : null,
        }, { onConflict: "connection_id,provider_message_id", ignoreDuplicates: true });
        if (insertError) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
