import { ConnectionControl } from "@/components/whatsapp/connection-control";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export const dynamic = "force-dynamic";

export default async function WhatsAppInboxPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await db.from("business_settings").select("business_name").eq("user_id", user.id).maybeSingle();
  const { data: connections, error: connectionError } = await db.from("whatsapp_connections")
    .select("id,display_phone_number,status,ai_enabled,created_at")
    .eq("owner_user_id", user.id).order("created_at", { ascending: false }).limit(20);
  const ids = (connections ?? []).map(c => c.id);
  const { data: messages, error: messageError } = ids.length
    ? await db.from("whatsapp_messages").select("id,connection_id,customer_wa_id,direction,body,message_type,created_at")
        .in("connection_id", ids).order("created_at", { ascending: false }).limit(100)
    : { data: [], error: null };
  type WhatsAppConnectionSummary = {
    id: string;
    display_phone_number: string | null;
  };
  const byId = new Map<string, WhatsAppConnectionSummary>(
    (connections ?? []).map((c) => [
      c.id,
      { id: c.id, display_phone_number: c.display_phone_number },
    ])
  );
  return <DashboardLayout user={user} businessName={business?.business_name}>
    <section className="space-y-6">
      <header><h1 className="text-3xl font-bold">WhatsApp inbox</h1>
      <p className="text-sm text-muted-foreground mt-2">Read-only preview of messages received through approved Meta Cloud API connections. Automatic replies and human sending are not enabled yet.</p></header>
      {(connectionError || messageError) && <div role="alert" className="rounded-lg border border-red-300 p-4">WhatsApp records could not be loaded. Verify migration 007 and your account permissions.</div>}
      {!connectionError && <div className="grid gap-3 sm:grid-cols-2">{(connections ?? []).map(c =>
        <div className="rounded-lg border p-4" key={c.id}><h2 className="font-semibold">{c.display_phone_number || "Unlabelled connection"}</h2>
        <p className="text-sm">Connection: {c.status}</p><ConnectionControl id={c.id} initiallyEnabled={c.ai_enabled === true} /></div>)}
        {!connections?.length && <div className="rounded-lg border p-4">No connected numbers. An administrator must complete official Meta onboarding before messages can appear. Never paste access tokens into this page.</div>}</div>}
      <h2 className="text-xl font-semibold">Recent incoming messages</h2>
      <div className="space-y-3">{(messages ?? []).map(m => <article key={m.id} className="rounded-lg border p-4 space-y-1">
        <p className="text-xs text-muted-foreground">{byId.get(m.connection_id)?.display_phone_number || "Business number"} · {m.customer_wa_id} · {new Date(m.created_at).toLocaleString()}</p>
        <p className="text-xs font-semibold">{m.direction === "inbound" ? "Customer" : "Business"} · {m.message_type}</p>
        <p className="whitespace-pre-wrap break-words">{m.body ?? "Non-text message (content not stored)"}</p></article>)}
        {!messages?.length && !messageError && <p className="text-sm text-muted-foreground">No messages received yet.</p>}</div>
    </section>
  </DashboardLayout>;
}
