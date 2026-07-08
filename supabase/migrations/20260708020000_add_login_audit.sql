create table public.login_events (
  id uuid primary key default extensions.gen_random_uuid(),
  username text not null,
  occurred_at timestamptz not null default now(),
  ip_hash text not null check (length(ip_hash) = 64),
  ip_masked text not null,
  country text,
  country_code text check (country_code is null or length(country_code) = 2),
  region text,
  city text,
  timezone text,
  network text,
  browser text not null,
  device text not null,
  acknowledged_at timestamptz
);

create index login_events_occurred_at_idx on public.login_events(occurred_at desc);
alter table public.login_events enable row level security;
revoke all on public.login_events from anon, authenticated;

create or replace function public.purge_expired_login_events() returns integer
language plpgsql security definer set search_path = '' as $$
declare deleted_count integer;
begin
  delete from public.login_events where occurred_at < now() - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_login_events() from public, anon, authenticated;
grant execute on function public.purge_expired_login_events() to service_role;
