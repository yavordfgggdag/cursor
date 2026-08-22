import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getServiceSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSiteUrl(req?: Request) {
  const configured = process.env.SITE_URL || process.env.URL;
  if (configured) return configured.replace(/\/$/, "");
  if (req) {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  }
  return "https://ai-course-funnel.netlify.app";
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function auditLog(
  sb: SupabaseClient,
  action: string,
  meta: Record<string, unknown> = {},
  actorId?: string | null,
) {
  await sb.from("audit_logs").insert({
    actor_id: actorId || null,
    action,
    entity_type: (meta.entity_type as string) || null,
    entity_id: meta.entity_id ? String(meta.entity_id) : null,
    metadata: meta,
  });
}
