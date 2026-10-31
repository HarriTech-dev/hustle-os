import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const limits = new Map<string, { count: number; reset: number }>();

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const now = Date.now();
  const current = limits.get(user.id);
  const entry = !current || current.reset < now ? { count: 0, reset: now + 60_000 } : current;
  if (++entry.count > 8) return NextResponse.json({ error: "Please wait a minute before sending more messages" }, { status: 429 });
  limits.set(user.id, entry);
  if (Number(request.headers.get("content-length") || 0) > 12_000) return NextResponse.json({ error: "Message too large" }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message !== "string" || !message.trim() || message.length > 2500) return NextResponse.json({ error: "Enter a message under 2500 characters" }, { status: 400 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "AI chatbot is not configured" }, { status: 503 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", max_output_tokens: 500,
        instructions: "You are HustleOS AI's helpful business assistant. Give practical, concise business guidance. Never claim access to private business records or real-time information. Do not ask for passwords, payment card details, or API keys.",
        input: message.trim(), store: false }),
    });
    if (!response.ok) return NextResponse.json({ error: "AI service temporarily unavailable" }, { status: 502 });
    const data = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const answer = data.output?.flatMap(x => x.content || []).filter(x => x.type === "output_text").map(x => x.text || "").join("\n") || "No response returned.";
    return NextResponse.json({ answer });
  } catch { return NextResponse.json({ error: "AI request timed out or failed" }, { status: 502 }); }
  finally { clearTimeout(timeout); }
}
