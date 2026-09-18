import { handleOptions, json, randomToken, sha256 } from "../_shared/http.ts";
import { adminClient, requestClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const caller = requestClient(authorization);
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const admin = adminClient();
    const { data: adminUser } = await admin
      .from("admin_users")
      .select("id")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!adminUser) return json({ error: "Admin access required" }, 403);

    const { assignmentId, expiresInHours = 168 } = await request.json();
    if (!assignmentId) return json({ error: "assignmentId is required" }, 400);

    const { data: assignment, error: assignmentError } = await caller
      .from("event_assignments")
      .select("id")
      .eq("id", assignmentId)
      .single();
    if (assignmentError || !assignment) return json({ error: "Assignment not found" }, 404);

    await admin
      .from("personal_links")
      .update({ revoked: true })
      .eq("assignment_id", assignmentId)
      .eq("revoked", false);

    const rawToken = randomToken();
    const tokenHash = await sha256(rawToken);
    const expiresAt = new Date(
      Date.now() + Math.min(Math.max(Number(expiresInHours), 1), 720) * 3600_000,
    ).toISOString();

    const { error: insertError } = await admin.from("personal_links").insert({
      assignment_id: assignmentId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    await admin.rpc("ensure_accreditation", { target_assignment_id: assignmentId });

    const requestOrigin = request.headers.get("Origin");
    const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? requestOrigin ?? "http://localhost:3000")
      .replace(/\/$/, "");
    return json({ url: `${siteUrl}/p/${rawToken}`, expiresAt });
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to generate personal link" }, 500);
  }
});
