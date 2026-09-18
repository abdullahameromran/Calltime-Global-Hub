import { handleOptions, json, randomToken, sha256 } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

const SESSION_HOURS = 12;

async function loadProfile(admin: ReturnType<typeof adminClient>, assignmentId: string) {
  const { data, error } = await admin
    .from("event_assignments")
    .select(`
      id, status, call_time,
      people!inner(id, full_name, preferred_language),
      events!inner(id, name, venue_name, venue_address, city, country, starts_at, ends_at, timezone, brand_logo_url, brand_primary_color),
      event_roles(label, role_type),
      flights(id, direction, airline, flight_number, origin_airport, destination_airport, scheduled_at, estimated_at, actual_at, status),
      ground_transport(id, pickup_location, dropoff_location, scheduled_pickup_at, vehicle_reference, driver_name, driver_phone, status),
      hotel_bookings(id, hotel_name, room_type, confirmation_number, check_in_date, check_out_date, status),
      accreditations(id, qr_code_value, status, badge_type, issued_at)
    `)
    .eq("id", assignmentId)
    .single();
  if (error) throw error;
  return data;
}

Deno.serve(async (request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await request.json();
    const admin = adminClient();

    if (body.action === "redeem") {
      if (typeof body.token !== "string" || body.token.length < 32) {
        return json({ error: "Invalid link" }, 400);
      }

      const tokenHash = await sha256(body.token);
      const sessionToken = randomToken();
      const sessionHash = await sha256(sessionToken);
      const sessionExpiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000).toISOString();

      const { data: claimed, error: claimError } = await admin.rpc("redeem_personal_link", {
        p_token_hash: tokenHash,
        p_session_hash: sessionHash,
        p_session_expires_at: sessionExpiresAt,
      });
      if (claimError) throw claimError;
      const link = claimed?.[0];
      if (!link) {
        return json({ error: "This link is invalid, expired, or has already been opened. Ask operations for a new link." }, 410);
      }

      return json({
        sessionToken,
        sessionExpiresAt,
        profile: await loadProfile(admin, link.assignment_id),
      });
    }

    if (body.action === "profile") {
      if (typeof body.sessionToken !== "string") return json({ error: "Session required" }, 401);
      const sessionHash = await sha256(body.sessionToken);
      const { data: session } = await admin
        .from("personal_link_sessions")
        .select("id, expires_at, revoked, personal_links!inner(assignment_id)")
        .eq("session_hash", sessionHash)
        .maybeSingle();

      if (!session || session.revoked || new Date(session.expires_at) <= new Date()) {
        return json({ error: "Your secure session has expired. Ask operations for a new link." }, 401);
      }

      await admin.from("personal_link_sessions")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", session.id);

      const relation = session.personal_links as unknown as { assignment_id: string };
      return json({ profile: await loadProfile(admin, relation.assignment_id) });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to load profile" }, 500);
  }
});
