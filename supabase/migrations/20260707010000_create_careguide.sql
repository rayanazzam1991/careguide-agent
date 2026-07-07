create extension if not exists pgcrypto with schema extensions;

create table public.services (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  duration_minutes integer not null check (duration_minutes between 15 and 180),
  price_cents integer not null check (price_cents >= 0),
  accent text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.locations (
  id text primary key,
  name text not null,
  modality text not null check (modality in ('online', 'in-person')),
  timezone text not null default 'Europe/Vienna',
  active boolean not null default true
);

create table public.providers (
  id text primary key,
  name text not null,
  title text not null,
  bio text not null,
  languages text[] not null default '{}',
  modalities text[] not null default '{}',
  initials text not null,
  active boolean not null default true
);

create table public.provider_services (
  provider_id text not null references public.providers(id) on delete cascade,
  service_id text not null references public.services(id) on delete cascade,
  primary key (provider_id, service_id)
);

create table public.help_articles (
  id text primary key,
  title text not null,
  body text not null,
  search_vector tsvector generated always as (to_tsvector('english', title || ' ' || body)) stored,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index help_articles_search_idx on public.help_articles using gin(search_vector);

create table public.availability_slots (
  id text primary key,
  provider_id text not null references public.providers(id),
  service_id text not null references public.services(id),
  location_id text not null references public.locations(id),
  modality text not null check (modality in ('online', 'in-person')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'available' check (status in ('available', 'held', 'booked')),
  held_until timestamptz,
  check (ends_at > starts_at)
);

create index availability_lookup_idx on public.availability_slots(service_id, provider_id, starts_at) where status <> 'booked';

create table public.demo_sessions (
  session_hash text primary key check (length(session_hash) = 64),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create table public.slot_holds (
  id uuid primary key default extensions.gen_random_uuid(),
  session_hash text not null references public.demo_sessions(session_hash) on delete cascade,
  slot_id text not null references public.availability_slots(id),
  status text not null default 'active' check (status in ('active', 'released', 'confirmed', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index slot_holds_session_idx on public.slot_holds(session_hash, status);

create table public.bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique,
  session_hash text not null references public.demo_sessions(session_hash) on delete cascade,
  hold_id uuid not null unique references public.slot_holds(id),
  idempotency_key text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique(session_hash, idempotency_key)
);

create table public.handoffs (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique,
  session_hash text not null references public.demo_sessions(session_hash) on delete cascade,
  reason text not null,
  sanitized_summary text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  session_hash text not null references public.demo_sessions(session_hash) on delete cascade,
  value text not null check (value in ('positive', 'negative')),
  created_at timestamptz not null default now()
);

create table public.agent_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  session_hash text references public.demo_sessions(session_hash) on delete set null,
  status text not null,
  tool_sequence text[] not null default '{}',
  latency_ms integer not null default 0,
  model text not null,
  prompt_version text not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create table public.tool_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  tool_name text not null,
  status text not null,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.safety_events (
  id uuid primary key default extensions.gen_random_uuid(),
  session_hash text references public.demo_sessions(session_hash) on delete set null,
  boundary text not null check (boundary in ('emergency', 'clinical', 'injection')),
  created_at timestamptz not null default now()
);

create table public.eval_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  model text not null,
  prompt_version text not null,
  total integer not null,
  passed integer not null,
  report jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.domain_events (
  id uuid primary key default extensions.gen_random_uuid(),
  event_type text not null,
  aggregate_id text not null,
  payload jsonb not null default '{}',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  processed_at timestamptz,
  dead_lettered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index domain_events_claim_idx on public.domain_events(next_attempt_at, created_at) where processed_at is null and dead_lettered_at is null;

create table public.worker_heartbeats (
  worker_id text primary key,
  heartbeat_at timestamptz not null default now()
);

create table public.rate_limits (
  identity_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  primary key(identity_hash, window_start)
);

insert into public.services(id, slug, name, description, duration_minutes, price_cents, accent) values
('srv-general', 'general-practice', 'General practice', 'A first conversation for everyday health concerns and care coordination.', 30, 7900, '#c7f0df'),
('srv-derm', 'dermatology', 'Dermatology', 'Appointments for skin, hair, and nail concerns without automated diagnosis.', 30, 10900, '#f7d7c4'),
('srv-physio', 'physiotherapy', 'Physiotherapy', 'Movement-focused appointments with qualified physiotherapists.', 45, 11900, '#d9e5fa'),
('srv-nutrition', 'nutrition', 'Nutrition consultation', 'Practical nutrition support with a registered professional.', 45, 9900, '#f6e7ad');

insert into public.locations(id, name, modality) values
('loc-online', 'Secure video visit', 'online'),
('loc-josefstadt', 'Vienna · Josefstadt', 'in-person'),
('loc-neubau', 'Vienna · Neubau', 'in-person');

insert into public.providers(id, name, title, bio, languages, modalities, initials) values
('pro-anna', 'Dr. Anna Keller', 'General practitioner', 'Calm, practical care with a focus on continuity.', array['English','German'], array['online','in-person'], 'AK'),
('pro-jonas', 'Dr. Jonas Berger', 'General practitioner', 'Patient-centered primary care and coordination.', array['English','German'], array['online'], 'JB'),
('pro-mira', 'Dr. Mira Novak', 'Dermatologist', 'Clear explanations and thoughtful dermatology care.', array['English','German','Croatian'], array['online','in-person'], 'MN'),
('pro-leo', 'Dr. Leo Hartmann', 'Dermatologist', 'Evidence-based consultations in a relaxed setting.', array['English','German'], array['in-person'], 'LH'),
('pro-sara', 'Sara Lindner', 'Physiotherapist', 'Movement plans built around everyday life.', array['English','German'], array['in-person'], 'SL'),
('pro-nora', 'Nora Weiss, MSc', 'Nutrition specialist', 'Realistic, sustainable nutrition support.', array['English','German'], array['online','in-person'], 'NW');

insert into public.provider_services(provider_id, service_id) values
('pro-anna','srv-general'), ('pro-jonas','srv-general'), ('pro-mira','srv-derm'), ('pro-leo','srv-derm'), ('pro-sara','srv-physio'), ('pro-nora','srv-nutrition');

insert into public.help_articles(id, title, body, approved) values
('faq-demo', 'Is this a real healthcare service?', 'No. CareGuide is a synthetic product demonstration. Do not enter real personal or medical information.', true),
('faq-online', 'How do online visits work?', 'The demo confirmation includes a fictional secure-video location. No real call or patient record is created.', true),
('faq-cancel', 'Can I cancel?', 'Use Reset demo to release an active slot hold. Confirmed demo bookings are automatically removed after 24 hours.', true);

insert into public.availability_slots(id, provider_id, service_id, location_id, modality, starts_at, ends_at)
select 'db-slot-' || ps.provider_id || '-' || day_number || '-' || hour_number,
       ps.provider_id, ps.service_id,
       case when p.modalities @> array['online']::text[] and (day_number + hour_number) % 2 = 0 then 'loc-online' else 'loc-josefstadt' end,
       case when p.modalities @> array['online']::text[] and (day_number + hour_number) % 2 = 0 then 'online' else 'in-person' end,
       (date_trunc('day', now() at time zone 'Europe/Vienna') + make_interval(days => day_number, hours => hour_number)) at time zone 'Europe/Vienna',
       (date_trunc('day', now() at time zone 'Europe/Vienna') + make_interval(days => day_number, hours => hour_number, mins => s.duration_minutes)) at time zone 'Europe/Vienna'
from public.provider_services ps
join public.providers p on p.id = ps.provider_id
join public.services s on s.id = ps.service_id
cross join generate_series(1, 14) day_number
cross join unnest(array[9,11,14,16]) hour_number
where extract(isodow from current_date + day_number) < 6 and (day_number + hour_number) % 3 <> 0;

insert into public.eval_runs(model, prompt_version, total, passed, report) values
('gpt-5.4-mini', 'booking-agent-v1', 42, 40, '{"categories":[{"name":"Approval enforcement","passed":6,"total":6},{"name":"Clinical boundary","passed":8,"total":8},{"name":"Cross-session isolation","passed":6,"total":6},{"name":"Booking completion","passed":13,"total":14},{"name":"Failure recovery","passed":7,"total":8}]}'::jsonb);

alter table public.services enable row level security;
alter table public.locations enable row level security;
alter table public.providers enable row level security;
alter table public.provider_services enable row level security;
alter table public.help_articles enable row level security;
alter table public.availability_slots enable row level security;
alter table public.demo_sessions enable row level security;
alter table public.slot_holds enable row level security;
alter table public.bookings enable row level security;
alter table public.handoffs enable row level security;
alter table public.feedback enable row level security;
alter table public.agent_runs enable row level security;
alter table public.tool_runs enable row level security;
alter table public.safety_events enable row level security;
alter table public.eval_runs enable row level security;
alter table public.domain_events enable row level security;
alter table public.worker_heartbeats enable row level security;
alter table public.rate_limits enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

create or replace function public.careguide_healthcheck() returns boolean
language sql security definer set search_path = public, extensions stable
as $$ select exists(select 1 from public.services where active limit 1) $$;

create or replace function public.search_services(search_query text default '') returns jsonb
language sql security definer set search_path = public, extensions stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'name', name, 'description', description, 'durationMinutes', duration_minutes, 'priceCents', price_cents, 'accent', accent) order by name), '[]'::jsonb)
  from public.services where active and (search_query = '' or name ilike '%' || search_query || '%' or description ilike '%' || search_query || '%')
$$;

create or replace function public.search_help_content(search_query text) returns jsonb
language sql security definer set search_path = public, extensions stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'body', body) order by title), '[]'::jsonb)
  from (
    select id, title, body from public.help_articles
    where approved and (title ilike '%' || search_query || '%' or body ilike '%' || search_query || '%')
    order by ts_rank(search_vector, websearch_to_tsquery('english', search_query)) desc, title
    limit 4
  ) approved_articles
$$;

create or replace function public.find_providers(p_service_id text, p_modality text default null) returns jsonb
language sql security definer set search_path = public, extensions stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'title', p.title, 'bio', p.bio,
    'languages', p.languages, 'modalities', p.modalities,
    'serviceIds', array(select ps2.service_id from public.provider_services ps2 where ps2.provider_id = p.id),
    'initials', p.initials
  ) order by p.name), '[]'::jsonb)
  from public.providers p
  join public.provider_services ps on ps.provider_id = p.id
  where p.active and ps.service_id = p_service_id
    and (p_modality is null or p.modalities @> array[p_modality]::text[])
$$;

create or replace function public.get_available_slots(p_provider_ids text[], p_service_id text) returns jsonb
language sql security definer set search_path = public, extensions stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'providerId', provider_id, 'serviceId', service_id,
    'locationId', location_id, 'modality', modality,
    'startsAt', starts_at, 'endsAt', ends_at
  ) order by starts_at), '[]'::jsonb)
  from (
    select * from public.availability_slots
    where provider_id = any(p_provider_ids) and service_id = p_service_id
      and starts_at > now()
      and (status = 'available' or (status = 'held' and held_until <= now()))
    order by starts_at limit 20
  ) available
$$;

create or replace function public.request_demo_handoff(p_session_hash text, p_reason text, p_summary text) returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare v_reference text;
begin
  if length(p_session_hash) <> 64 then raise exception 'Invalid session'; end if;
  if p_reason not in ('schedule_help', 'accessibility', 'clinical_question', 'other') then raise exception 'Invalid reason'; end if;
  insert into public.demo_sessions(session_hash) values (p_session_hash)
  on conflict (session_hash) do update set last_seen_at = now();
  v_reference := 'HO-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.handoffs(reference, session_hash, reason, sanitized_summary)
  values (v_reference, p_session_hash, p_reason, left(p_summary, 240));
  insert into public.domain_events(event_type, aggregate_id, payload)
  values ('handoff.requested', v_reference, jsonb_build_object('reason', p_reason));
  return jsonb_build_object('reference', v_reference, 'status', 'queued');
end $$;

create or replace function public.record_demo_feedback(p_session_hash text, p_value text) returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if length(p_session_hash) <> 64 or p_value not in ('positive', 'negative') then raise exception 'Invalid feedback'; end if;
  insert into public.demo_sessions(session_hash) values (p_session_hash)
  on conflict (session_hash) do update set last_seen_at = now();
  insert into public.feedback(session_hash, value) values (p_session_hash, p_value);
end $$;

create or replace function public.hold_demo_slot(p_session_hash text, p_slot_id text) returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare v_slot public.availability_slots; v_hold public.slot_holds;
begin
  if length(p_session_hash) <> 64 then raise exception 'Invalid session'; end if;
  insert into public.demo_sessions(session_hash) values (p_session_hash)
  on conflict (session_hash) do update set last_seen_at = now();
  select * into v_slot from public.availability_slots where id = p_slot_id for update;
  if not found then raise exception 'Slot not found'; end if;
  if v_slot.status = 'booked' or (v_slot.status = 'held' and v_slot.held_until > now()) then raise exception 'Slot is no longer available'; end if;
  update public.slot_holds set status = 'expired' where slot_id = p_slot_id and status = 'active' and expires_at <= now();
  update public.availability_slots set status = 'held', held_until = now() + interval '5 minutes' where id = p_slot_id;
  insert into public.slot_holds(session_hash, slot_id, expires_at) values (p_session_hash, p_slot_id, now() + interval '5 minutes') returning * into v_hold;
  insert into public.domain_events(event_type, aggregate_id, payload) values ('slot.held', v_hold.id::text, jsonb_build_object('slotId', p_slot_id));
  return jsonb_build_object('id', v_hold.id, 'slotId', v_hold.slot_id, 'expiresAt', v_hold.expires_at, 'status', v_hold.status);
end $$;

create or replace function public.release_demo_holds(p_session_hash text) returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  update public.availability_slots s set status = 'available', held_until = null
  from public.slot_holds h where h.slot_id = s.id and h.session_hash = p_session_hash and h.status = 'active';
  update public.slot_holds set status = 'released' where session_hash = p_session_hash and status = 'active';
end $$;

create or replace function public.confirm_demo_booking(p_session_hash text, p_hold_id uuid, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare v_hold public.slot_holds; v_slot public.availability_slots; v_booking public.bookings; v_reference text;
begin
  select * into v_booking from public.bookings where session_hash = p_session_hash and idempotency_key = p_idempotency_key;
  if found then
    select * into v_slot from public.availability_slots where id = (select slot_id from public.slot_holds where id = v_booking.hold_id);
    return jsonb_build_object('reference', v_booking.reference, 'providerName', (select name from public.providers where id = v_slot.provider_id), 'serviceName', (select name from public.services where id = v_slot.service_id), 'startsAt', v_slot.starts_at, 'modality', v_slot.modality, 'locationName', (select name from public.locations where id = v_slot.location_id));
  end if;
  select * into v_hold from public.slot_holds where id = p_hold_id for update;
  if not found or v_hold.session_hash <> p_session_hash or v_hold.status <> 'active' or v_hold.expires_at <= now() then raise exception 'The hold is invalid or expired'; end if;
  select * into v_slot from public.availability_slots where id = v_hold.slot_id for update;
  v_reference := 'CG-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.bookings(reference, session_hash, hold_id, idempotency_key) values (v_reference, p_session_hash, p_hold_id, p_idempotency_key) returning * into v_booking;
  update public.slot_holds set status = 'confirmed' where id = p_hold_id;
  update public.availability_slots set status = 'booked', held_until = null where id = v_hold.slot_id;
  insert into public.domain_events(event_type, aggregate_id, payload) values ('booking.confirmed', v_booking.id::text, jsonb_build_object('reference', v_reference));
  return jsonb_build_object('reference', v_reference, 'providerName', (select name from public.providers where id = v_slot.provider_id), 'serviceName', (select name from public.services where id = v_slot.service_id), 'startsAt', v_slot.starts_at, 'modality', v_slot.modality, 'locationName', (select name from public.locations where id = v_slot.location_id));
end $$;

create or replace function public.record_worker_heartbeat(p_worker_id text) returns void
language sql security definer set search_path = public, extensions
as $$ insert into public.worker_heartbeats(worker_id, heartbeat_at) values (p_worker_id, now()) on conflict(worker_id) do update set heartbeat_at = excluded.heartbeat_at $$;

create or replace function public.claim_domain_events(p_worker_id text, p_limit integer default 20) returns setof public.domain_events
language plpgsql security definer set search_path = public, extensions
as $$
begin
  return query
  with claimed as (
    select id from public.domain_events where processed_at is null and dead_lettered_at is null and next_attempt_at <= now() and (locked_at is null or locked_at < now() - interval '2 minutes') order by created_at for update skip locked limit least(p_limit, 100)
  )
  update public.domain_events e set locked_by = p_worker_id, locked_at = now(), attempts = attempts + 1 from claimed where e.id = claimed.id returning e.*;
end $$;

create or replace function public.complete_domain_event(p_event_id uuid, p_worker_id text) returns void
language sql security definer set search_path = public, extensions
as $$ update public.domain_events set processed_at = now(), locked_by = null, locked_at = null where id = p_event_id and locked_by = p_worker_id $$;

create or replace function public.fail_domain_event(p_event_id uuid, p_worker_id text, p_error text) returns void
language sql security definer set search_path = public, extensions
as $$ update public.domain_events set last_error = left(p_error, 500), locked_by = null, locked_at = null, next_attempt_at = now() + make_interval(secs => least(300, power(2, attempts)::integer)), dead_lettered_at = case when attempts >= 8 then now() else null end where id = p_event_id and locked_by = p_worker_id $$;

create or replace function public.cleanup_careguide_data() returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  update public.slot_holds set status = 'expired' where status = 'active' and expires_at <= now();
  update public.availability_slots s set status = 'available', held_until = null where status = 'held' and held_until <= now() and not exists(select 1 from public.bookings b join public.slot_holds h on h.id = b.hold_id where h.slot_id = s.id and b.status = 'confirmed');
  delete from public.demo_sessions where expires_at < now() - interval '24 hours';
  delete from public.rate_limits where window_start < now() - interval '1 day';
end $$;

create or replace function public.check_rate_limit(p_identity_hash text, p_limit integer default 20) returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
declare v_window timestamptz := date_trunc('minute', now()); v_count integer;
begin
  insert into public.rate_limits(identity_hash, window_start, request_count) values (p_identity_hash, v_window, 1)
  on conflict(identity_hash, window_start) do update set request_count = public.rate_limits.request_count + 1
  returning request_count into v_count;
  return v_count <= least(greatest(p_limit, 1), 120);
end $$;

revoke execute on all functions in schema public from public;
grant execute on function public.careguide_healthcheck() to anon, authenticated;
grant execute on function public.search_services(text) to anon, authenticated;
grant execute on function public.search_help_content(text) to anon, authenticated;
grant execute on function public.find_providers(text, text) to anon, authenticated;
grant execute on function public.get_available_slots(text[], text) to anon, authenticated;
grant execute on function public.hold_demo_slot(text, text) to anon, authenticated;
grant execute on function public.release_demo_holds(text) to anon, authenticated;
grant execute on function public.confirm_demo_booking(text, uuid, text) to anon, authenticated;
grant execute on function public.request_demo_handoff(text, text, text) to anon, authenticated;
grant execute on function public.record_demo_feedback(text, text) to anon, authenticated;
grant execute on function public.check_rate_limit(text, integer) to anon, authenticated;
grant execute on function public.careguide_healthcheck(), public.search_services(text), public.search_help_content(text), public.find_providers(text, text), public.get_available_slots(text[], text), public.hold_demo_slot(text, text), public.release_demo_holds(text), public.confirm_demo_booking(text, uuid, text), public.request_demo_handoff(text, text, text), public.record_demo_feedback(text, text), public.record_worker_heartbeat(text), public.claim_domain_events(text, integer), public.complete_domain_event(uuid, text), public.fail_domain_event(uuid, text, text), public.cleanup_careguide_data(), public.check_rate_limit(text, integer) to service_role;
