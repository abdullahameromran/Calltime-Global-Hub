import { supabase } from "./supabase";

export type PersonRole =
  | "artist"
  | "crew"
  | "supplier_staff"
  | "guest"
  | "admin_staff";

export type EventRecord = {
  id: string;
  name: string;
  city: string | null;
  venue_name: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
};

export type EventRole = {
  id: string;
  label: string;
  role_type: PersonRole;
};

export type AssignmentRecord = {
  id: string;
  status: string;
  call_time: string | null;
  person_id: string;
  people: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    primary_role: PersonRole | null;
  };
  event_roles: EventRole | null;
  flights: Array<Record<string, unknown>>;
  ground_transport: Array<Record<string, unknown>>;
  hotel_bookings: Array<Record<string, unknown>>;
  accreditations: Array<Record<string, unknown>>;
};

export async function loadWorkspace(preferredEventId?: string | null) {
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id,name,city,venue_name,starts_at,ends_at,timezone")
    .order("created_at", { ascending: false });
  if (eventsError) throw eventsError;

  const activeEvent = (
    events?.find((item) => item.id === preferredEventId) ?? events?.[0] ?? null
  ) as EventRecord | null;
  if (!activeEvent) return { events: [] as EventRecord[], activeEvent, roles: [], assignments: [] };

  const [rolesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("event_roles")
      .select("id,label,role_type")
      .eq("event_id", activeEvent.id)
      .order("label"),
    supabase
      .from("event_assignments")
      .select(`
        id,status,call_time,person_id,
        people!inner(id,full_name,email,phone,primary_role),
        event_roles(id,label,role_type),
        flights(*),ground_transport(*),hotel_bookings(*),accreditations(*)
      `)
      .eq("event_id", activeEvent.id)
      .order("created_at", { ascending: false }),
  ]);

  if (rolesResult.error) throw rolesResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;
  return {
    events: (events ?? []) as EventRecord[],
    activeEvent,
    roles: (rolesResult.data ?? []) as EventRole[],
    assignments: (assignmentsResult.data ?? []) as unknown as AssignmentRecord[],
  };
}

export async function createEvent(input: {
  name: string;
  city: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
}) {
  const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from("events")
    .insert({
      name: input.name,
      city: input.city || null,
      venue_name: input.venueName || null,
      starts_at: new Date(input.startsAt).toISOString(),
      ends_at: new Date(input.endsAt).toISOString(),
      timezone: input.timezone,
      slug,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function createRole(eventId: string, label: string, roleType: PersonRole) {
  const { data, error } = await supabase
    .from("event_roles")
    .insert({ event_id: eventId, label, role_type: roleType })
    .select("id,label,role_type")
    .single();
  if (error) throw error;
  return data as EventRole;
}

export async function createPersonAssignment(input: {
  eventId: string;
  roleId: string;
  roleType: PersonRole;
  fullName: string;
  email?: string;
  phone?: string;
  callTime?: string;
  organizationName?: string;
}) {
  let personId: string | undefined;
  if (input.email) {
    const { data } = await supabase
      .from("people")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();
    personId = data?.id;
  }

  if (!personId) {
    const { data, error } = await supabase
      .from("people")
      .insert({
        full_name: input.fullName,
        email: input.email || null,
        phone: input.phone || null,
        primary_role: input.roleType,
      })
      .select("id")
      .single();
    if (error) throw error;
    personId = data.id;
  }

  let organizationId: string | null = null;
  if (input.organizationName?.trim()) {
    const name = input.organizationName.trim();
    const { data: existing } = await supabase
      .from("organizations").select("id").ilike("name", name).maybeSingle();
    if (existing) organizationId = existing.id;
    else {
      const { data: created, error: organizationError } = await supabase
        .from("organizations").insert({ name }).select("id").single();
      if (organizationError) throw organizationError;
      organizationId = created.id;
    }
    const { error: membershipError } = await supabase.from("person_organizations").upsert({
      person_id: personId,
      organization_id: organizationId,
    });
    if (membershipError) throw membershipError;
  }

  const { data, error } = await supabase
    .from("event_assignments")
    .insert({
      event_id: input.eventId,
      person_id: personId,
      event_role_id: input.roleId,
      organization_id: organizationId,
      status: "confirmed",
      call_time: input.callTime ? new Date(input.callTime).toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function updatePersonAssignment(input: {
  assignmentId: string;
  personId: string;
  roleId: string;
  roleType: PersonRole;
  fullName: string;
  email?: string;
  phone?: string;
  callTime?: string;
}) {
  const { error: personError } = await supabase.from("people").update({
    full_name: input.fullName,
    email: input.email || null,
    phone: input.phone || null,
    primary_role: input.roleType,
  }).eq("id", input.personId);
  if (personError) throw personError;

  const { error: assignmentError } = await supabase.from("event_assignments").update({
    event_role_id: input.roleId,
    call_time: input.callTime ? new Date(input.callTime).toISOString() : null,
  }).eq("id", input.assignmentId);
  if (assignmentError) throw assignmentError;
}

export async function updateAssignmentStatus(id: string, status: string) {
  const { error } = await supabase.from("event_assignments").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function addFlight(assignmentId: string, values: Record<string, unknown>, recordId?: string) {
  const query = recordId
    ? supabase.from("flights").update(values).eq("id", recordId)
    : supabase.from("flights").insert({ assignment_id: assignmentId, ...values });
  const { error } = await query;
  if (error) throw error;
}

export async function addTransport(assignmentId: string, values: Record<string, unknown>, recordId?: string) {
  const query = recordId
    ? supabase.from("ground_transport").update(values).eq("id", recordId)
    : supabase.from("ground_transport").insert({ assignment_id: assignmentId, ...values });
  const { error } = await query;
  if (error) throw error;
}

export async function addHotel(assignmentId: string, values: Record<string, unknown>, recordId?: string) {
  const query = recordId
    ? supabase.from("hotel_bookings").update(values).eq("id", recordId)
    : supabase.from("hotel_bookings").insert({ assignment_id: assignmentId, ...values });
  const { error } = await query;
  if (error) throw error;
}

export async function generatePersonalLink(assignmentId: string) {
  const { data, error } = await supabase.functions.invoke("generate-personal-link", {
    body: { assignmentId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { url: string; expiresAt: string };
}

export function parseCsv(text: string) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];
  const headers = rows[0].split(",").map((value) => value.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const cells = row.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}
