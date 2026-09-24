-- Location precision, moderation, and rate limiting.
--
-- Anti-Asian hate crimes in 2024 were the second highest on record, and
-- Advancing Justice-AAJC recorded violent threats in extremist online spaces
-- rising 59% against Asians between November and December 2024, with doxxing
-- named among the harassment types. A public map of where people live is a
-- target, so the default is a neighborhood rather than a doorstep, and an
-- exact pin is something a person opts into knowingly.
--
-- Safe to run more than once. A migration that fails halfway should be
-- fixable by running it again, not by unpicking what it managed to create.
-- The column is location_precision rather than precision, because PRECISION is
-- a Postgres keyword and a column named for it reads as a syntax error.
-- Where a pin sits, and how truthfully. A neighborhood pin stores the
-- neighborhood's own centre: the precise spot is never written down, so it
-- cannot leak from a table nobody meant to expose.
do $$
begin
  create type public.pin_precision as enum('neighborhood', 'exact');
exception
  when duplicate_object then null;
end
$$;

alter table public.pins
add column if not exists location_precision public.pin_precision not null default 'neighborhood';

-- Pins that predate this column were placed exactly, and saying otherwise
-- would misrepresent what their owners agreed to. Only ever runs once,
-- because later pins carry a created_at past this point.
update public.pins
set
  location_precision = 'exact'
where
  created_at < now() - interval '1 second'
  and location_precision = 'neighborhood';

-- Moderation. An email link is not a system: Queering the Map was flooded by
-- organised trolls within months of going viral and had to build a panel.
create table if not exists public.pin_reports (
  id uuid primary key default gen_random_uuid (),
  pin_id uuid not null references public.pins (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists pin_reports_open_idx on public.pin_reports (created_at)
where
  resolved_at is null;

create table if not exists public.moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

create table if not exists public.account_actions (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  at timestamptz not null default now()
);

create index if not exists account_actions_recent_idx on public.account_actions (user_id, action, at desc);

alter table public.pin_reports enable row level security;

alter table public.moderators enable row level security;

alter table public.account_actions enable row level security;

create
or replace function public.is_moderator () returns boolean language sql security definer
set
  search_path = public as $$
  select exists (select 1 from public.moderators where user_id = auth.uid());
$$;

-- Policies are dropped first so this whole file can be run again.
drop policy if exists "a person reports a pin" on public.pin_reports;

create policy "a person reports a pin" on public.pin_reports for insert to authenticated
with
  check (auth.uid () = reporter_id);

drop policy if exists "moderators read reports" on public.pin_reports;

create policy "moderators read reports" on public.pin_reports for
select
  to authenticated using (public.is_moderator ());

drop policy if exists "moderators resolve reports" on public.pin_reports;

create policy "moderators resolve reports" on public.pin_reports
for update
  to authenticated using (public.is_moderator ())
with
  check (public.is_moderator ());

drop policy if exists "moderators see who moderates" on public.moderators;

create policy "moderators see who moderates" on public.moderators for
select
  to authenticated using (public.is_moderator ());

drop policy if exists "moderators remove a pin" on public.pins;

create policy "moderators remove a pin" on public.pins for delete to authenticated using (public.is_moderator ());

drop policy if exists "a person records their own actions" on public.account_actions;

create policy "a person records their own actions" on public.account_actions for insert to authenticated
with
  check (auth.uid () = user_id);

drop policy if exists "a person reads their own actions" on public.account_actions;

create policy "a person reads their own actions" on public.account_actions for
select
  to authenticated using (auth.uid () = user_id);
