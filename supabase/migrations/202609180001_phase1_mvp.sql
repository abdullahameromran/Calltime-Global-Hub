-- Calltime Phase 1 MVP hardening and personal-link session exchange.
-- Apply after schema/calltime_schema.sql.

alter table public.people
  add column if not exists primary_role public.person_role_type;

alter table public.personal_links
  add column if not exists redeemed_at timestamptz;

-- Pin the search path on the two security-definer helpers created by the base
-- schema. This prevents object-shadowing attacks while policies run them.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au
    where au.id = (select auth.uid()) and au.role = 'super_admin'
  );
$$;

create or replace function public.has_event_access(target_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.is_super_admin()
    or exists (
      select 1 from public.admin_event_access aea
      where aea.admin_id = (select auth.uid())
        and aea.event_id = target_event_id
    );
$$;

revoke all on function public.is_super_admin() from public;
revoke all on function public.has_event_access(uuid) from public;
grant execute on function public.is_super_admin() to authenticated, service_role;
grant execute on function public.has_event_access(uuid) to authenticated, service_role;

create table if not exists public.personal_link_sessions (
  id uuid primary key default gen_random_uuid(),
  personal_link_id uuid not null references public.personal_links(id) on delete cascade,
  session_hash text not null unique,
  expires_at timestamptz not null,
  last_accessed_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists personal_link_sessions_link_idx
  on public.personal_link_sessions(personal_link_id, expires_at);

alter table public.personal_link_sessions enable row level security;
revoke all on table public.personal_link_sessions from anon, authenticated;
grant all on table public.personal_link_sessions to service_role;

-- The personal profile view is service-role only. Public clients use the
-- personal-profile Edge Function after token exchange.
revoke all on table public.assignment_profile_view from anon, authenticated;
grant select on table public.assignment_profile_view to service_role;

-- Explicit grants for the authenticated admin dashboard. RLS still decides
-- which rows each administrator may access.
grant select, insert, update on table public.people to authenticated;
grant select, insert, update on table public.organizations to authenticated;
grant select, insert, update, delete on table public.person_organizations to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.event_roles to authenticated;
grant select, insert, update, delete on table public.event_assignments to authenticated;
grant select, insert, update, delete on table public.flights to authenticated;
grant select, insert, update, delete on table public.ground_transport to authenticated;
grant select, insert, update, delete on table public.hotel_bookings to authenticated;
grant select, insert, update on table public.accreditations to authenticated;
grant select, insert on table public.accreditation_scans to authenticated;
grant select on table public.admin_users to authenticated;
grant select on table public.admin_event_access to authenticated;

-- Membership is readable by the member and manageable by super admins.
drop policy if exists admin_event_access_select on public.admin_event_access;
create policy admin_event_access_select on public.admin_event_access
  for select to authenticated
  using (admin_id = (select auth.uid()) or public.is_super_admin());

drop policy if exists admin_event_access_manage on public.admin_event_access;
create policy admin_event_access_manage on public.admin_event_access
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Keep the non-secret QR payload opaque and random. The physical scanner
-- identifies an accreditation row, never a person ID or sequential value.
create or replace function public.ensure_accreditation(target_assignment_id uuid)
returns public.accreditations
language plpgsql
security invoker
set search_path = ''
as $$
declare result public.accreditations;
begin
  insert into public.accreditations (assignment_id, qr_code_value, status)
  values (target_assignment_id, encode(extensions.gen_random_bytes(24), 'hex'), 'ready')
  on conflict (assignment_id) do update
    set assignment_id = excluded.assignment_id
  returning * into result;
  return result;
end;
$$;

grant execute on function public.ensure_accreditation(uuid) to authenticated;

comment on table public.personal_link_sessions is
  'Short-lived sessions created after a one-time personal link is redeemed. Only hashes are stored.';

-- Atomically claim a one-time link and create its browser session. Doing this
-- in one transaction prevents two simultaneous requests from redeeming the
-- same URL.
create or replace function public.redeem_personal_link(
  p_token_hash text,
  p_session_hash text,
  p_session_expires_at timestamptz
)
returns table (link_id uuid, assignment_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_link_id uuid;
  claimed_assignment_id uuid;
begin
  update public.personal_links
  set redeemed_at = now(), last_accessed_at = now(), access_count = access_count + 1
  where token_hash = p_token_hash
    and revoked = false
    and redeemed_at is null
    and expires_at > now()
  returning id, personal_links.assignment_id
  into claimed_link_id, claimed_assignment_id;

  if claimed_link_id is null then
    return;
  end if;

  insert into public.personal_link_sessions (personal_link_id, session_hash, expires_at)
  values (claimed_link_id, p_session_hash, p_session_expires_at);

  return query select claimed_link_id, claimed_assignment_id;
end;
$$;

revoke all on function public.redeem_personal_link(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.redeem_personal_link(text, text, timestamptz) to service_role;

-- Bootstrap a brand-new workspace without ever shipping an admin password.
-- The first Auth user becomes super_admin; all later users must be explicitly
-- added by that administrator. An advisory lock prevents concurrent first-user
-- signups from creating multiple super admins.
create or replace function public.bootstrap_first_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(728194501);

  if not exists (select 1 from public.admin_users) then
    insert into public.admin_users (id, full_name, role)
    values (
      new.id,
      coalesce(
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Calltime Administrator'
      ),
      'super_admin'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.bootstrap_first_admin() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_bootstrap_admin on auth.users;
create trigger on_auth_user_created_bootstrap_admin
  after insert on auth.users
  for each row execute function public.bootstrap_first_admin();
