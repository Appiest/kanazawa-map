-- Location precision, moderation, and rate limiting.
--
-- Anti-Asian hate crimes in 2024 were the second highest on record, and
-- Advancing Justice-AAJC recorded violent threats in extremist online spaces
-- rising 59% against Asians between November and December 2024, with doxxing
-- named among the harassment types. A public map of where people live is a
-- target, so the default is a neighborhood rather than a doorstep, and an
-- exact pin is something a person opts into knowingly.

-- Where a pin sits, and how truthfully. A neighborhood pin stores the
-- neighborhood's own centre: the precise spot is never written down, so it
-- cannot leak from a table nobody meant to expose.
create type public.pin_precision as enum('neighborhood', 'exact');

alter table public.pins
add column precision public.pin_precision not null default 'neighborhood';

-- Pins that predate this column were placed exactly, and saying otherwise
-- would misrepresent what their owners agreed to.
update public.pins
set
  precision = 'exact';

-- Moderation. An email link is not a system: Queering the Map was flooded by
-- organised trolls within months of going viral and had to build a panel.
create table public.pin_reports (
  id uuid primary key default gen_random_uuid (),
  pin_id uuid not null references public.pins (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index pin_reports_open_idx on public.pin_reports (created_at)
where
  resolved_at is null;

alter table public.pin_reports enable row level security;

create policy "a person reports a pin" on public.pin_reports for insert to authenticated
with
  check (auth.uid () = reporter_id);

-- Reports are readable only by a moderator. Everyone else writes and forgets.
create table public.moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.moderators enable row level security;

create
or replace function public.is_moderator () returns boolean language sql security definer
set
  search_path = public as $$
  select exists (select 1 from public.moderators where user_id = auth.uid());
$$;

create policy "moderators read reports" on public.pin_reports for
select
  to authenticated using (public.is_moderator ());

create policy "moderators resolve reports" on public.pin_reports
for update
  to authenticated using (public.is_moderator ())
with
  check (public.is_moderator ());

create policy "moderators see who moderates" on public.moderators for
select
  to authenticated using (public.is_moderator ());

-- A moderator can take any pin down. Ordinary owners keep their own policy.
create policy "moderators remove a pin" on public.pins for delete to authenticated using (public.is_moderator ());

-- Rate limiting. One pin per account is not abuse prevention, because an
-- attacker makes many accounts. This records what an account has done so a
-- burst looks like a burst.
create table public.account_actions (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  at timestamptz not null default now()
);

create index account_actions_recent_idx on public.account_actions (user_id, action, at desc);

alter table public.account_actions enable row level security;

create policy "a person records their own actions" on public.account_actions for insert to authenticated
with
  check (auth.uid () = user_id);

create policy "a person reads their own actions" on public.account_actions for
select
  to authenticated using (auth.uid () = user_id);
