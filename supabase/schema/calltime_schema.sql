-- =====================================================================
-- CALLTIME — SUPABASE / POSTGRES SCHEMA
-- Event operations platform: people, events, logistics & accreditation
-- =====================================================================
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. Designed to support Phase 1 (core), Phase 2
-- (integrations/reporting) and Phase 3 (multi-event/automation) without
-- a structural rebuild.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid(), digest()
create extension if not exists "citext";     -- case-insensitive email/text

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------
create type person_role_type as enum (
  'artist',
  'crew',
  'supplier_staff',
  'guest',
  'admin_staff'
);

create type assignment_status as enum (
  'invited',
  'confirmed',
  'arrived',
  'accredited',
  'departed',
  'cancelled'
);

create type accreditation_status as enum (
  'pending',
  'ready',
  'issued',
  'revoked'
);

create type travel_direction as enum (
  'arrival',
  'departure'
);

create type transport_status as enum (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'delayed'
);

create type hotel_booking_status as enum (
  'requested',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled'
);

create type notification_channel as enum (
  'sms',
  'email',
  'whatsapp',
  'push'
);

create type notification_status as enum (
  'queued',
  'sent',
  'failed'
);

create type alert_severity as enum (
  'info',
  'warning',
  'critical'
);

create type admin_role as enum (
  'super_admin',      -- full platform access, all events
  'event_admin',      -- manages a specific event
  'accreditation_staff', -- on-site scanning only
  'supplier_admin'    -- manages their own org's staff only
);

-- ---------------------------------------------------------------------
-- 2. CORE IDENTITY — CT Global ID
-- ---------------------------------------------------------------------
-- One permanent record per human, reused across every event.
create table people (
  id                uuid primary key default gen_random_uuid(),   -- CT Global ID
  full_name         text not null,
  email             citext,
  phone             text,
  nationality       text,
  passport_number   text,                -- encrypted at the application layer; see notes at bottom
  date_of_birth     date,
  preferred_language text default 'en',  -- 'en' | 'ar'
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index people_email_idx on people (email) where email is not null;
create index people_full_name_idx on people using gin (to_tsvector('simple', full_name));

comment on table people is 'Permanent CT Global ID record. One row per human, reused across events.';

-- ---------------------------------------------------------------------
-- 3. ORGANIZATIONS — agencies / suppliers / vendors
-- ---------------------------------------------------------------------
create table organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null default 'supplier',  -- 'supplier' | 'agency' | 'production_company' | 'venue'
  contact_email citext,
  contact_phone text,
  created_at    timestamptz not null default now()
);

-- A person can belong to an organization (e.g. a supplier's staff member)
create table person_organizations (
  person_id       uuid not null references people(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  title           text,               -- their role/title within the org
  created_at      timestamptz not null default now(),
  primary key (person_id, organization_id)
);

-- ---------------------------------------------------------------------
-- 4. EVENTS
-- ---------------------------------------------------------------------
create table events (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug         text unique not null,          -- used in personal-link URLs
  venue_name    text,
  venue_address text,
  city          text,
  country       text,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  timezone      text not null default 'Asia/Dubai',
  brand_logo_url text,                          -- Phase 3 white-labelling
  brand_primary_color text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint events_dates_check check (ends_at >= starts_at)
);

create index events_active_idx on events (is_active, starts_at);

-- Event-specific role/job definitions (e.g. "Lighting Crew", "VIP Guest")
create table event_roles (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  role_type  person_role_type not null,
  label      text not null,                 -- human-readable role name shown in admin UI
  created_at timestamptz not null default now(),
  unique (event_id, label)
);

-- ---------------------------------------------------------------------
-- 5. EVENT ASSIGNMENTS — the core join between a person and an event
-- ---------------------------------------------------------------------
create table event_assignments (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  person_id       uuid not null references people(id) on delete cascade,
  event_role_id   uuid references event_roles(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,   -- if attending on behalf of a supplier
  status          assignment_status not null default 'invited',
  call_time       timestamptz,               -- when they are expected on site
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (event_id, person_id)               -- one assignment row per person per event (multi-role handled via event_roles)
);

create index event_assignments_event_idx on event_assignments (event_id, status);
create index event_assignments_person_idx on event_assignments (person_id);

comment on table event_assignments is 'Links a CT Global ID to a specific event + role. This is the backbone every logistics table hangs off.';

-- ---------------------------------------------------------------------
-- 6. PERSONAL LINKS — passwordless access tokens
-- ---------------------------------------------------------------------
create table personal_links (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references event_assignments(id) on delete cascade,
  token_hash     text not null unique,     -- sha256 hash of the token; raw token never stored
  expires_at     timestamptz not null,
  last_accessed_at timestamptz,
  access_count   integer not null default 0,
  revoked        boolean not null default false,
  created_at     timestamptz not null default now()
);

create index personal_links_assignment_idx on personal_links (assignment_id);

comment on table personal_links is 'Passwordless access token per assignment. Store only a hash of the token (see app-layer notes).';

-- ---------------------------------------------------------------------
-- 7. TRAVEL — FLIGHTS
-- ---------------------------------------------------------------------
create table flights (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references event_assignments(id) on delete cascade,
  direction      travel_direction not null,
  airline        text,
  flight_number  text,
  origin_airport text,
  destination_airport text,
  scheduled_at   timestamptz not null,
  estimated_at   timestamptz,               -- updated by live status sync (Phase 2)
  actual_at      timestamptz,
  status         text default 'scheduled',  -- free-text status from airline feed (Phase 2 integration)
  source         text not null default 'manual', -- 'manual' | 'integration:<provider>'
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index flights_assignment_idx on flights (assignment_id, direction);

-- ---------------------------------------------------------------------
-- 8. TRAVEL — GROUND TRANSPORT
-- ---------------------------------------------------------------------
create table ground_transport (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references event_assignments(id) on delete cascade,
  pickup_location text,
  dropoff_location text,
  scheduled_pickup_at timestamptz not null,
  vehicle_reference text,        -- e.g. car/van plate or booking ref
  driver_name    text,
  driver_phone   text,
  status         transport_status not null default 'scheduled',
  source         text not null default 'manual',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index ground_transport_assignment_idx on ground_transport (assignment_id);

-- ---------------------------------------------------------------------
-- 9. HOTEL BOOKINGS
-- ---------------------------------------------------------------------
create table hotel_bookings (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references event_assignments(id) on delete cascade,
  hotel_name     text not null,
  room_type      text,
  confirmation_number text,
  check_in_date  date not null,
  check_out_date date not null,
  status         hotel_booking_status not null default 'requested',
  source         text not null default 'manual',   -- 'manual' | 'integration:pms'
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint hotel_dates_check check (check_out_date >= check_in_date)
);

create index hotel_bookings_assignment_idx on hotel_bookings (assignment_id);

-- ---------------------------------------------------------------------
-- 10. ACCREDITATION
-- ---------------------------------------------------------------------
create table accreditations (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null unique references event_assignments(id) on delete cascade,
  qr_code_value   text not null unique,     -- opaque signed value embedded in the QR image
  status          accreditation_status not null default 'pending',
  badge_type      text,                     -- e.g. 'All Access', 'Backstage', 'General'
  issued_at       timestamptz,
  issued_by       uuid,                     -- references admin_users.id (on-site staff who scanned)
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index accreditations_status_idx on accreditations (status);

-- Scan log — every scan attempt, not just the successful issue
create table accreditation_scans (
  id              uuid primary key default gen_random_uuid(),
  accreditation_id uuid not null references accreditations(id) on delete cascade,
  scanned_by      uuid,                     -- references admin_users.id
  scan_result     text not null,            -- 'success' | 'already_issued' | 'invalid' | 'revoked'
  scanned_at      timestamptz not null default now(),
  location_label  text                      -- e.g. 'Main Gate', 'Backstage Entrance'
);

create index accreditation_scans_accreditation_idx on accreditation_scans (accreditation_id);

-- ---------------------------------------------------------------------
-- 11. ADMIN USERS — internal/ops accounts (linked to Supabase auth)
-- ---------------------------------------------------------------------
create table admin_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        admin_role not null default 'event_admin',
  organization_id uuid references organizations(id),  -- set for supplier_admin role
  created_at  timestamptz not null default now()
);

-- Which events a given admin can manage (many-to-many; super_admin bypasses this)
create table admin_event_access (
  admin_id uuid not null references admin_users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  primary key (admin_id, event_id)
);

-- ---------------------------------------------------------------------
-- 12. NOTIFICATIONS (Phase 2)
-- ---------------------------------------------------------------------
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references event_assignments(id) on delete cascade,
  channel        notification_channel not null,
  subject        text,
  body           text not null,
  status         notification_status not null default 'queued',
  related_table  text,          -- e.g. 'flights', 'ground_transport', 'hotel_bookings'
  related_id     uuid,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz
);

create index notifications_assignment_idx on notifications (assignment_id, created_at desc);

-- ---------------------------------------------------------------------
-- 13. AUTOMATED ALERTS (Phase 3)
-- ---------------------------------------------------------------------
create table alerts (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  assignment_id  uuid references event_assignments(id) on delete cascade,
  severity       alert_severity not null default 'warning',
  rule_code      text not null,      -- e.g. 'NOT_ACCREDITED_2H_BEFORE_CALL'
  message        text not null,
  acknowledged_by uuid references admin_users(id),
  acknowledged_at timestamptz,
  created_at     timestamptz not null default now()
);

create index alerts_event_idx on alerts (event_id, acknowledged_at);

-- ---------------------------------------------------------------------
-- 14. AUDIT LOG
-- ---------------------------------------------------------------------
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,                 -- admin_users.id, null if system-generated
  action      text not null,        -- e.g. 'assignment.status_changed'
  table_name  text not null,
  record_id   uuid not null,
  old_values  jsonb,
  new_values  jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_record_idx on audit_log (table_name, record_id);

-- =====================================================================
-- 15. UPDATED_AT TRIGGER HELPER
-- =====================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_people_updated_at before update on people
  for each row execute function set_updated_at();
create trigger trg_events_updated_at before update on events
  for each row execute function set_updated_at();
create trigger trg_event_assignments_updated_at before update on event_assignments
  for each row execute function set_updated_at();
create trigger trg_flights_updated_at before update on flights
  for each row execute function set_updated_at();
create trigger trg_ground_transport_updated_at before update on ground_transport
  for each row execute function set_updated_at();
create trigger trg_hotel_bookings_updated_at before update on hotel_bookings
  for each row execute function set_updated_at();

-- =====================================================================
-- 16. HELPER VIEW — full logistics snapshot per assignment
-- (this is what the mobile personal-link profile page reads from)
-- =====================================================================
create or replace view assignment_profile_view as
select
  ea.id                as assignment_id,
  ea.event_id,
  e.name               as event_name,
  e.venue_name,
  e.starts_at           as event_starts_at,
  p.id                 as person_id,
  p.full_name,
  p.preferred_language,
  er.label              as role_label,
  ea.status             as assignment_status,
  ea.call_time,
  acc.qr_code_value,
  acc.status             as accreditation_status,
  (select jsonb_agg(f.* order by f.scheduled_at)
     from flights f where f.assignment_id = ea.id)              as flights,
  (select jsonb_agg(g.* order by g.scheduled_pickup_at)
     from ground_transport g where g.assignment_id = ea.id)      as ground_transport,
  (select jsonb_agg(h.* order by h.check_in_date)
     from hotel_bookings h where h.assignment_id = ea.id)         as hotel_bookings
from event_assignments ea
join events e on e.id = ea.event_id
join people p on p.id = ea.person_id
left join event_roles er on er.id = ea.event_role_id
left join accreditations acc on acc.assignment_id = ea.id;

-- =====================================================================
-- 17. ROW LEVEL SECURITY
-- =====================================================================
-- Personal-link access is handled by a token-verifying Edge Function
-- using the service role key (bypasses RLS by design), NOT by end-user
-- Supabase auth sessions. RLS below governs the admin dashboard only.

alter table people enable row level security;
alter table organizations enable row level security;
alter table person_organizations enable row level security;
alter table events enable row level security;
alter table event_roles enable row level security;
alter table event_assignments enable row level security;
alter table personal_links enable row level security;
alter table flights enable row level security;
alter table ground_transport enable row level security;
alter table hotel_bookings enable row level security;
alter table accreditations enable row level security;
alter table accreditation_scans enable row level security;
alter table admin_users enable row level security;
alter table admin_event_access enable row level security;
alter table notifications enable row level security;
alter table alerts enable row level security;
alter table audit_log enable row level security;

-- Helper: is the current auth.uid() a super_admin?
create or replace function is_super_admin()
returns boolean as $$
  select exists (
    select 1 from admin_users au
    where au.id = auth.uid() and au.role = 'super_admin'
  );
$$ language sql security definer stable;

-- Helper: does the current admin have access to a given event?
create or replace function has_event_access(target_event_id uuid)
returns boolean as $$
  select
    is_super_admin()
    or exists (
      select 1 from admin_event_access aea
      where aea.admin_id = auth.uid() and aea.event_id = target_event_id
    );
$$ language sql security definer stable;

-- admin_users: admins can see their own row; super_admins see all
create policy admin_users_self_select on admin_users
  for select using (id = auth.uid() or is_super_admin());
create policy admin_users_super_admin_manage on admin_users
  for all using (is_super_admin()) with check (is_super_admin());

-- events: visible/manageable only if the admin has access
create policy events_select on events
  for select using (has_event_access(id));
create policy events_modify on events
  for all using (has_event_access(id)) with check (has_event_access(id));

-- event_roles
create policy event_roles_access on event_roles
  for all using (has_event_access(event_id)) with check (has_event_access(event_id));

-- event_assignments
create policy event_assignments_access on event_assignments
  for all using (has_event_access(event_id)) with check (has_event_access(event_id));

-- flights / ground_transport / hotel_bookings / accreditations:
-- scoped via their parent assignment's event
create policy flights_access on flights
  for all using (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  ) with check (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  );

create policy ground_transport_access on ground_transport
  for all using (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  ) with check (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  );

create policy hotel_bookings_access on hotel_bookings
  for all using (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  ) with check (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  );

create policy accreditations_access on accreditations
  for all using (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  ) with check (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  );

create policy accreditation_scans_access on accreditation_scans
  for all using (
    has_event_access((
      select ea.event_id from event_assignments ea
      join accreditations acc on acc.assignment_id = ea.id
      where acc.id = accreditation_id
    ))
  );

-- people / organizations / person_organizations: readable by any admin,
-- writable by any admin (cross-event identity data is shared by design)
create policy people_read on people for select using (auth.uid() is not null);
create policy people_write on people for insert with check (auth.uid() is not null);
create policy people_update on people for update using (auth.uid() is not null);

create policy organizations_read on organizations for select using (auth.uid() is not null);
create policy organizations_write on organizations for all using (auth.uid() is not null);

create policy person_organizations_read on person_organizations for select using (auth.uid() is not null);
create policy person_organizations_write on person_organizations for all using (auth.uid() is not null);

-- personal_links / notifications / alerts / audit_log: scoped via event
create policy personal_links_access on personal_links
  for all using (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  );

create policy notifications_access on notifications
  for all using (
    has_event_access((select event_id from event_assignments where id = assignment_id))
  );

create policy alerts_access on alerts
  for all using (has_event_access(event_id));

create policy audit_log_super_admin_only on audit_log
  for select using (is_super_admin());

-- =====================================================================
-- 18. APPLICATION-LAYER NOTES (not enforced by SQL — implement in app/Edge Functions)
-- =====================================================================
-- • Personal link tokens: generate a random 32-byte token client-side/Edge
--   Function, store only sha256(token) in personal_links.token_hash, and
--   verify by hashing the incoming token and comparing. Never store the
--   raw token.
-- • Sensitive fields (passport_number) should be encrypted at the
--   application layer (e.g. via pgsodium/Vault or KMS) rather than
--   stored as plain text, even though the column is text here.
-- • Personal-link profile reads (assignment_profile_view) should go
--   through a Supabase Edge Function using the service role key after
--   verifying the token — end users never get a Supabase auth session.
-- • Multi-event scale (Phase 3): this schema already supports it —
--   `people` is shared, `event_assignments` is per-event, and
--   `admin_event_access` scopes admin visibility per event.
-- =====================================================================
