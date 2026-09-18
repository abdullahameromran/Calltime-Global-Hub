import { createClient } from "npm:@supabase/supabase-js@2";

function firstConfiguredKey(newName: string, legacyName: string) {
  const modern = Deno.env.get(newName);
  if (modern) {
    const parsed = JSON.parse(modern) as Record<string, string>;
    const key = parsed.default ?? Object.values(parsed)[0];
    if (key) return key;
  }

  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  throw new Error(`Missing ${newName} or ${legacyName}`);
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    firstConfiguredKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function requestClient(authorization: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    firstConfiguredKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"),
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
