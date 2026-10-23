-- The browser no longer touches a table directly.
--
-- Until now the anon key could read every column of every pin, and anybody
-- with a pin could read every contact row in one request. From here on:
--
--   * anon and authenticated read pins only through public.map_pins, which has
--     no owner, no internal id and no timestamps, and rounds coordinates.
--   * every write goes through a security definer function that works out who
--     is calling from auth.uid(), checks the account is not banned, and takes
--     from a per-day quota under a lock, so two requests cannot both squeeze
--     under the limit.
--   * email addresses are never stored outside auth.users. People reach each
--     other through a relay that only the server (service role) can use.
--   * helpers and private tables live in the private schema, which PostgREST
--     does not expose.
--
-- Safe to run more than once.

create schema if not exists private;

revoke all on schema private from public;

revoke all on schema private from anon, authenticated;

-- Moderators decide who is banned. Every write function checks this table.
create table if not exists private.banned_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text check (char_length(reason) <= 500),
  banned_by uuid references auth.users (id) on delete set null,
  banned_at timestamptz not null default now()
);

-- One row per message sent through the relay. The message text is not kept:
-- these are private notes between two members, and a store of them would be
-- the most sensitive thing in the database. A recipient who is being harassed
-- has the email and can report the pin; moderators read volume from here.
create table if not exists private.contact_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_pin_id uuid references public.pins (id) on delete set null,
  recipient_id uuid references auth.users (id) on delete set null,
  body_length integer not null check (body_length between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_sender_idx on private.contact_messages (sender_id, created_at desc);

create index if not exists contact_messages_pair_idx on private.contact_messages (sender_id, recipient_id, created_at desc);

-- Read by the auth hook below. lib/auth/disposableDomains.ts holds the same
-- list for instant feedback in the sign-in form; this table is the one that
-- is enforced.
create table if not exists private.blocked_email_domains (
  domain text primary key check (domain = lower(domain))
);

insert into
  private.blocked_email_domains (domain)
values
  ('10minutemail.com'),
  ('20minutemail.com'),
  ('33mail.com'),
  ('anonaddy.me'),
  ('burnermail.io'),
  ('discard.email'),
  ('dispostable.com'),
  ('emailondeck.com'),
  ('fakeinbox.com'),
  ('getairmail.com'),
  ('getnada.com'),
  ('guerrillamail.biz'),
  ('guerrillamail.com'),
  ('guerrillamail.de'),
  ('guerrillamail.info'),
  ('guerrillamail.net'),
  ('guerrillamail.org'),
  ('guerrillamailblock.com'),
  ('harakirimail.com'),
  ('inboxkitten.com'),
  ('maildrop.cc'),
  ('mailinator.com'),
  ('mailnesia.com'),
  ('mailpoof.com'),
  ('mintemail.com'),
  ('moakt.com'),
  ('mohmal.com'),
  ('mytemp.email'),
  ('sharklasers.com'),
  ('spamgourmet.com'),
  ('temp-mail.io'),
  ('temp-mail.org'),
  ('tempail.com'),
  ('tempmail.com'),
  ('tempmail.dev'),
  ('tempmailo.com'),
  ('tempr.email'),
  ('throwawaymail.com'),
  ('trashmail.com'),
  ('trashmail.de'),
  ('yopmail.com'),
  ('yopmail.fr')
on conflict (domain) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers. Not callable from the API: the private schema is not exposed and
-- execute is revoked below.
-- ---------------------------------------------------------------------------
create
or replace function private.assert_can_write (p_user uuid) returns void language plpgsql security definer
set
  search_path = '' as $$
begin
  if p_user is null then
    raise exception 'not_signed_in' using errcode = 'PT401';
  end if;
  if exists (select 1 from private.banned_accounts where user_id = p_user) then
    raise exception 'account_banned' using errcode = 'PT403';
  end if;
end;
$$;

-- Count and record in one transaction, behind a lock on (user, action), so
-- concurrent requests are served one at a time and none slips past the limit.
-- A write that fails later in the same transaction rolls its quota row back.
create
or replace function private.take_quota (
  p_user uuid,
  p_action text,
  p_limit integer,
  p_window interval default interval '1 day'
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_action, 0));

  select count(*) into used
  from public.account_actions
  where user_id = p_user and action = p_action and at > now() - p_window;

  if used >= p_limit then
    raise exception 'quota_exceeded' using errcode = 'PT429';
  end if;

  insert into public.account_actions (user_id, action) values (p_user, p_action);
end;
$$;

create
or replace function private.own_pin_id (p_user uuid) returns uuid language sql stable security definer
set
  search_path = '' as $$
  select id from public.pins where owner_id = p_user;
$$;

create
or replace function private.assert_has_pin (p_user uuid) returns uuid language plpgsql stable security definer
set
  search_path = '' as $$
declare
  pin uuid := private.own_pin_id(p_user);
begin
  if pin is null then
    raise exception 'needs_own_pin' using errcode = 'PT409';
  end if;
  return pin;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pins: no exact spot, ever, whoever writes the row.
-- ---------------------------------------------------------------------------
create
or replace function private.snap_pin_location () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.location_precision = 'exact' then
    raise exception 'exact_location_refused' using errcode = 'PT400';
  end if;
  -- Two decimal places is about a kilometre: coarser than any street.
  new.lng := round(new.lng::numeric, 2)::double precision;
  new.lat := round(new.lat::numeric, 2)::double precision;
  return new;
end;
$$;

drop trigger if exists pins_snap_location on public.pins;

create trigger pins_snap_location before insert
or
update on public.pins for each row
execute function private.snap_pin_location ();

-- Rows written before this migration go through the same rounding. 0005
-- already moved every exact pin to neighborhood; this catches any stragglers.
update public.pins
set
  location_precision = 'neighborhood'
where
  location_precision = 'exact';

update public.pins
set
  lng = lng,
  lat = lat
where
  lng::numeric <> round(lng::numeric, 2)
  or lat::numeric <> round(lat::numeric, 2);

alter table public.pins
drop constraint if exists pins_location_not_exact;

alter table public.pins
add constraint pins_location_not_exact check (location_precision <> 'exact');

alter table public.pins
drop constraint if exists pins_tag_counts;

alter table public.pins
add constraint pins_tag_counts check (
  cardinality(interests) <= 20
  and cardinality(connections) <= 10
);

alter function public.touch_updated_at () set search_path = '';

-- ---------------------------------------------------------------------------
-- Contact rows: tied to the caller's own pin by a composite key, so a row can
-- never point at somebody else's pin, whatever writes it.
-- ---------------------------------------------------------------------------
alter table public.pin_contacts
drop constraint if exists pin_contacts_pin_owner_fkey;

alter table public.pins
drop constraint if exists pins_id_owner_key;

alter table public.pins
add constraint pins_id_owner_key unique (id, owner_id);

delete from public.pin_contacts as contact
where
  not exists (
    select
      1
    from
      public.pins as pin
    where
      pin.id = contact.pin_id
      and pin.owner_id = contact.owner_id
  );

alter table public.pin_contacts
add constraint pin_contacts_pin_owner_fkey foreign key (pin_id, owner_id) references public.pins (id, owner_id) on delete cascade;

-- The email column copied auth.users.email and was the thing a single request
-- could dump. The relay reads auth.users server-side instead.
alter table public.pin_contacts
drop column if exists email;

-- Handles are shown to other members only when their owner says so. People
-- who typed a handle under "Shown to people who are on the map" already chose
-- that, so their rows start shared; every new row starts hidden.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pin_contacts' and column_name = 'share_handles'
  ) then
    alter table public.pin_contacts add column share_handles boolean not null default false;
    update public.pin_contacts set share_handles = true
    where instagram is not null or website is not null;
  end if;
end
$$;

update public.pin_contacts
set
  instagram = nullif(regexp_replace(trim(instagram), '^@', ''), '')
where
  instagram is not null;

update public.pin_contacts
set
  instagram = null
where
  instagram !~ '^[A-Za-z0-9._]{1,30}$';

update public.pin_contacts
set
  website = null
where
  website !~ '^https?://[^[:space:]<>"''`]+$'
  or char_length(website) > 200;

alter table public.pin_contacts
drop constraint if exists pin_contacts_instagram_shape;

alter table public.pin_contacts
add constraint pin_contacts_instagram_shape check (instagram ~ '^[A-Za-z0-9._]{1,30}$');

alter table public.pin_contacts
drop constraint if exists pin_contacts_website_shape;

alter table public.pin_contacts
add constraint pin_contacts_website_shape check (
  website ~ '^https?://[^[:space:]<>"''`]+$'
  and char_length(website) <= 200
);

-- ---------------------------------------------------------------------------
-- Direct table access ends here.
-- ---------------------------------------------------------------------------
drop policy if exists "pins are readable by anyone" on public.pins;

drop policy if exists "a person plants their own pin" on public.pins;

drop policy if exists "a person edits their own pin" on public.pins;

drop policy if exists "a person pulls up their own pin" on public.pins;

drop policy if exists "moderators remove a pin" on public.pins;

drop policy if exists "contacts are readable by people who are on the map" on public.pin_contacts;

drop policy if exists "a person writes their own contact details" on public.pin_contacts;

drop policy if exists "a person reports a pin" on public.pin_reports;

drop policy if exists "moderators read reports" on public.pin_reports;

drop policy if exists "moderators resolve reports" on public.pin_reports;

drop policy if exists "gatherings are readable by people on the map" on public.gatherings;

drop policy if exists "a person posts their own gathering" on public.gatherings;

drop policy if exists "a person edits their own gathering" on public.gatherings;

drop policy if exists "a person calls off their own gathering" on public.gatherings;

drop policy if exists "moderators remove a gathering" on public.gatherings;

drop policy if exists "a person records their own actions" on public.account_actions;

drop policy if exists "a person reads their own actions" on public.account_actions;

revoke all on table public.pins,
public.pin_contacts,
public.pin_reports,
public.gatherings,
public.account_actions
from
  anon,
  authenticated;

revoke all on table public.moderators,
public.digest_sends
from
  anon;

revoke insert,
update,
delete,
truncate,
references,
trigger on table public.moderators,
public.digest_sends
from
  authenticated;

revoke all on all sequences in schema public
from
  anon,
  authenticated;

revoke all on all tables in schema private
from
  public,
  anon,
  authenticated;

-- What anybody may see of a pin. Owned by the migration role, so it reads the
-- table on its own authority while callers have no grant on the table itself.
create or replace view public.map_pins
with
  (security_barrier = true) as
select
  pin.seq,
  round(pin.lng::numeric, 2)::double precision as lng,
  round(pin.lat::numeric, 2)::double precision as lat,
  pin.display_name,
  pin.neighborhood,
  pin.note,
  pin.interests,
  pin.connections
from
  public.pins as pin
where
  not exists (
    select
      1
    from
      private.banned_accounts as banned
    where
      banned.user_id = pin.owner_id
  );

revoke all on public.map_pins
from
  public,
  anon,
  authenticated;

grant
select
  on public.map_pins to anon,
  authenticated;

-- ---------------------------------------------------------------------------
-- The caller's own pin.
-- ---------------------------------------------------------------------------
create
or replace function public.save_my_pin (
  p_display_name text,
  p_neighborhood text,
  p_note text,
  p_lng double precision,
  p_lat double precision,
  p_precision public.pin_precision,
  p_interests text[],
  p_connections text[]
) returns table (
  seq bigint,
  display_name text,
  neighborhood text,
  note text,
  interests text[],
  connections text[]
) language plpgsql security definer
set
  search_path = '' as $$
#variable_conflict use_column
declare
  caller uuid := auth.uid();
  saved uuid;
begin
  perform private.assert_can_write(caller);
  perform private.take_quota(caller, 'pin.write', 30);

  insert into public.pins as pin (
    owner_id, display_name, neighborhood, note, lng, lat, location_precision, interests, connections
  )
  values (
    caller, trim(p_display_name), trim(p_neighborhood), nullif(trim(p_note), ''),
    p_lng, p_lat, p_precision, coalesce(p_interests, '{}'), coalesce(p_connections, '{}')
  )
  on conflict (owner_id) do update set
    display_name = excluded.display_name,
    neighborhood = excluded.neighborhood,
    note = excluded.note,
    lng = excluded.lng,
    lat = excluded.lat,
    location_precision = excluded.location_precision,
    interests = excluded.interests,
    connections = excluded.connections
  returning pin.id into saved;

  return query
  select pin.seq, pin.display_name, pin.neighborhood, pin.note, pin.interests, pin.connections
  from public.pins as pin
  where pin.id = saved;
end;
$$;

create
or replace function public.delete_my_pin () returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not_signed_in' using errcode = 'PT401';
  end if;
  -- Leaving is always allowed, banned or not. The contact row goes by cascade.
  delete from public.pins where owner_id = caller;
end;
$$;

create
or replace function public.my_pin () returns table (
  seq bigint,
  display_name text,
  neighborhood text,
  note text,
  lng double precision,
  lat double precision,
  location_precision public.pin_precision,
  interests text[],
  connections text[],
  instagram text,
  website text,
  share_handles boolean
) language sql stable security definer
set
  search_path = '' as $$
  select
    pin.seq, pin.display_name, pin.neighborhood, pin.note, pin.lng, pin.lat,
    pin.location_precision, pin.interests, pin.connections,
    contact.instagram, contact.website, coalesce(contact.share_handles, false)
  from public.pins as pin
  left join public.pin_contacts as contact on contact.pin_id = pin.id
  where pin.owner_id = auth.uid();
$$;

create
or replace function public.save_my_handles (
  p_instagram text,
  p_website text,
  p_share boolean
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  caller uuid := auth.uid();
  pin uuid;
begin
  perform private.assert_can_write(caller);
  pin := private.assert_has_pin(caller);
  perform private.take_quota(caller, 'pin.write', 30);

  insert into public.pin_contacts (pin_id, owner_id, instagram, website, share_handles)
  values (pin, caller, nullif(trim(p_instagram), ''), nullif(trim(p_website), ''), coalesce(p_share, false))
  on conflict (pin_id) do update set
    instagram = excluded.instagram,
    website = excluded.website,
    share_handles = excluded.share_handles;
end;
$$;

-- Another member's handles, when they chose to share them. Only somebody on
-- the map may ask, and each look costs from a daily allowance, so walking the
-- sequence numbers to collect handles stops quickly.
create
or replace function public.pin_handles (p_seq bigint) returns table (instagram text, website text) language plpgsql security definer
set
  search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  perform private.assert_can_write(caller);
  perform private.assert_has_pin(caller);
  perform private.take_quota(caller, 'contact.lookup', 100);

  return query
  select contact.instagram, contact.website
  from public.pins as pin
  join public.pin_contacts as contact on contact.pin_id = pin.id
  where pin.seq = p_seq and contact.share_handles;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reports and the geocoder allowance.
-- ---------------------------------------------------------------------------
create
or replace function public.report_pin (p_seq bigint, p_reason text) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  caller uuid := auth.uid();
  target uuid;
begin
  perform private.assert_can_write(caller);
  if char_length(trim(coalesce(p_reason, ''))) not between 1 and 500 then
    raise exception 'invalid_input' using errcode = 'PT400';
  end if;

  select id into target from public.pins where seq = p_seq;
  if target is null then
    raise exception 'pin_not_found' using errcode = 'PT404';
  end if;

  perform private.take_quota(caller, 'pin.report', 10);
  insert into public.pin_reports (pin_id, reporter_id, reason) values (target, caller, trim(p_reason));
end;
$$;

create
or replace function public.note_geocode_lookup () returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  perform private.assert_can_write(caller);
  perform private.take_quota(caller, 'geocode', 60);
end;
$$;

-- ---------------------------------------------------------------------------
-- Gatherings. Readers get `mine` instead of host_id, because host_id equals
-- the host's pins.owner_id and would tie an event to a person.
-- ---------------------------------------------------------------------------
create
or replace function public.upcoming_gatherings () returns table (
  seq bigint,
  title text,
  place text,
  note text,
  lng double precision,
  lat double precision,
  starts_at timestamptz,
  mine boolean
) language sql stable security definer
set
  search_path = '' as $$
  select
    gathering.seq, gathering.title, gathering.place, gathering.note,
    gathering.lng, gathering.lat, gathering.starts_at,
    gathering.host_id = auth.uid()
  from public.gatherings as gathering
  where auth.uid() is not null
    and gathering.starts_at >= now()
    and gathering.starts_at <= now() + interval '60 days'
  order by gathering.starts_at
  limit 200;
$$;

create
or replace function public.post_gathering (
  p_title text,
  p_place text,
  p_note text,
  p_lng double precision,
  p_lat double precision,
  p_starts_at timestamptz
) returns table (
  seq bigint,
  title text,
  place text,
  note text,
  lng double precision,
  lat double precision,
  starts_at timestamptz,
  mine boolean
) language plpgsql security definer
set
  search_path = '' as $$
declare
  caller uuid := auth.uid();
  posted uuid;
begin
  perform private.assert_can_write(caller);
  if p_starts_at < now() - interval '1 minute' or p_starts_at > now() + interval '60 days' then
    raise exception 'gathering_time' using errcode = 'PT400';
  end if;
  perform private.take_quota(caller, 'gathering.write', 5);

  insert into public.gatherings (host_id, title, place, note, lng, lat, starts_at)
  values (caller, trim(p_title), trim(p_place), nullif(trim(p_note), ''), p_lng, p_lat, p_starts_at)
  returning id into posted;

  return query
  select g.seq, g.title, g.place, g.note, g.lng, g.lat, g.starts_at, true
  from public.gatherings as g
  where g.id = posted;
end;
$$;

create
or replace function public.cancel_my_gathering (p_seq bigint) returns boolean language plpgsql security definer
set
  search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not_signed_in' using errcode = 'PT401';
  end if;
  delete from public.gatherings where seq = p_seq and host_id = caller;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- The contact relay. Only the server calls this, with the service role, after
-- it has verified the sender's session; the sender id is never taken from a
-- browser. It returns the recipient's address from auth.users so the email
-- can be sent, and nothing is handed back to the sender.
-- ---------------------------------------------------------------------------
create
or replace function public.claim_contact_message (
  p_sender uuid,
  p_pin_seq bigint,
  p_body_length integer
) returns table (
  recipient_email text,
  recipient_name text,
  sender_name text,
  sender_place text,
  alert_moderators boolean
) language plpgsql security definer
set
  search_path = '' as $$
declare
  sender public.pins%rowtype;
  target public.pins%rowtype;
  to_same_person integer;
  in_last_hour integer;
begin
  perform private.assert_can_write(p_sender);

  select * into sender from public.pins where owner_id = p_sender;
  if not found then
    raise exception 'needs_own_pin' using errcode = 'PT409';
  end if;

  select * into target from public.pins where seq = p_pin_seq;
  if not found or exists (select 1 from private.banned_accounts where user_id = target.owner_id) then
    raise exception 'pin_not_found' using errcode = 'PT404';
  end if;
  if target.owner_id = p_sender then
    raise exception 'own_pin' using errcode = 'PT400';
  end if;

  perform private.take_quota(p_sender, 'contact.send', 10);

  select count(*) into to_same_person
  from private.contact_messages
  where sender_id = p_sender and recipient_id = target.owner_id and created_at > now() - interval '1 day';
  if to_same_person >= 3 then
    raise exception 'quota_exceeded_recipient' using errcode = 'PT429';
  end if;

  insert into private.contact_messages (sender_id, recipient_pin_id, recipient_id, body_length)
  values (p_sender, target.id, target.owner_id, p_body_length);

  select count(*) into in_last_hour
  from private.contact_messages
  where sender_id = p_sender and created_at > now() - interval '1 hour';

  return query
  select account.email::text, target.display_name, sender.display_name, sender.neighborhood, in_last_hour = 5
  from auth.users as account
  where account.id = target.owner_id;
end;
$$;

create
or replace function public.moderator_emails () returns setof text language sql stable security definer
set
  search_path = '' as $$
  select account.email::text
  from public.moderators as moderator
  join auth.users as account on account.id = moderator.user_id
  where account.email is not null;
$$;

-- ---------------------------------------------------------------------------
-- Moderation. Every function checks is_moderator() itself.
-- ---------------------------------------------------------------------------
create
or replace function private.assert_moderator () returns void language plpgsql stable security definer
set
  search_path = '' as $$
begin
  if not public.is_moderator() then
    raise exception 'not_moderator' using errcode = 'PT403';
  end if;
end;
$$;

create
or replace function public.moderation_open_reports () returns table (
  id uuid,
  reason text,
  created_at timestamptz,
  pin_seq bigint,
  display_name text,
  neighborhood text,
  note text
) language plpgsql stable security definer
set
  search_path = '' as $$
begin
  perform private.assert_moderator();
  return query
  select report.id, report.reason, report.created_at, pin.seq, pin.display_name, pin.neighborhood, pin.note
  from public.pin_reports as report
  left join public.pins as pin on pin.id = report.pin_id
  where report.resolved_at is null
  order by report.created_at
  limit 100;
end;
$$;

create
or replace function public.moderation_dismiss_report (p_report_id uuid) returns void language plpgsql security definer
set
  search_path = '' as $$
begin
  perform private.assert_moderator();
  update public.pin_reports set resolved_at = now() where id = p_report_id and resolved_at is null;
end;
$$;

-- Takes a pin down, and with p_ban also bars its owner from writing anything
-- again. Returns the banned account's id so the server can also block the
-- sign-in itself; returns null when nobody was banned.
create
or replace function public.moderation_remove_pin (p_seq bigint, p_ban boolean) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  removed_owner uuid;
begin
  perform private.assert_moderator();

  delete from public.pins where seq = p_seq returning owner_id into removed_owner;
  if removed_owner is null then
    raise exception 'pin_not_found' using errcode = 'PT404';
  end if;
  if not coalesce(p_ban, false) then
    return null;
  end if;

  insert into private.banned_accounts (user_id, banned_by, reason)
  values (removed_owner, auth.uid(), 'Removed from the map by a moderator')
  on conflict (user_id) do nothing;
  delete from public.gatherings where host_id = removed_owner;
  return removed_owner;
end;
$$;

-- Who has sent the most messages in the last day, for spotting somebody
-- working through the map.
create
or replace function public.moderation_busy_senders () returns table (
  pin_seq bigint,
  display_name text,
  neighborhood text,
  messages_today bigint
) language plpgsql stable security definer
set
  search_path = '' as $$
begin
  perform private.assert_moderator();
  return query
  select pin.seq, pin.display_name, pin.neighborhood, count(*)
  from private.contact_messages as message
  join public.pins as pin on pin.owner_id = message.sender_id
  where message.created_at > now() - interval '1 day'
  group by pin.seq, pin.display_name, pin.neighborhood
  having count(*) >= 5
  order by count(*) desc
  limit 50;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auth hook: refuse throwaway inboxes before an account exists. Turn it on in
-- the dashboard under Authentication, Hooks, "Before User Created".
-- ---------------------------------------------------------------------------
create
or replace function public.hook_reject_disposable_email (event jsonb) returns jsonb language plpgsql stable security definer
set
  search_path = '' as $$
declare
  email_domain text := lower(split_part(coalesce(event #>> '{user,email}', ''), '@', 2));
begin
  if exists (
    select 1 from private.blocked_email_domains as blocked
    where email_domain = blocked.domain or email_domain like '%.' || blocked.domain
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 400, 'message', 'Use an email address you keep. Throwaway inboxes cannot join.')
    );
  end if;
  return '{}'::jsonb;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what. Functions are executable by PUBLIC by default, and
-- Supabase also grants new functions to anon and authenticated, so every one
-- is revoked first and granted back only where it belongs.
-- ---------------------------------------------------------------------------
revoke all on all functions in schema private
from
  public,
  anon,
  authenticated;

revoke all on function public.save_my_pin,
public.delete_my_pin,
public.my_pin,
public.save_my_handles,
public.pin_handles,
public.report_pin,
public.note_geocode_lookup,
public.upcoming_gatherings,
public.post_gathering,
public.cancel_my_gathering,
public.moderation_open_reports,
public.moderation_dismiss_report,
public.moderation_remove_pin,
public.moderation_busy_senders,
public.claim_contact_message,
public.moderator_emails,
public.hook_reject_disposable_email
from
  public,
  anon,
  authenticated;

grant
execute on function public.save_my_pin,
public.delete_my_pin,
public.my_pin,
public.save_my_handles,
public.pin_handles,
public.report_pin,
public.note_geocode_lookup,
public.upcoming_gatherings,
public.post_gathering,
public.cancel_my_gathering,
public.moderation_open_reports,
public.moderation_dismiss_report,
public.moderation_remove_pin,
public.moderation_busy_senders to authenticated;

grant
execute on function public.claim_contact_message,
public.moderator_emails to service_role;

grant
execute on function public.hook_reject_disposable_email to supabase_auth_admin;

revoke all on function public.is_moderator
from
  public,
  anon;

grant
execute on function public.is_moderator to authenticated;
