-- Security checks for the migrations. Everything runs inside one transaction
-- that is rolled back, so nothing is left behind.
--
-- Run on PGlite with `npm run check:db`, or against a local Supabase stack:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 -f supabase/checks/security.sql
-- A failing check raises an exception that starts with FAIL.
begin;

create schema checks;

grant usage on schema checks to anon, authenticated, service_role, supabase_auth_admin;

create function checks.expect_state (p_label text, p_sql text, p_state text) returns void language plpgsql as $$
declare
  got text;
begin
  begin
    execute p_sql;
  exception when others then
    got := sqlstate;
  end;
  if got is distinct from p_state then
    raise exception 'FAIL: % (expected sqlstate %, got %)', p_label, p_state, coalesce(got, 'success');
  end if;
  raise notice 'ok: %', p_label;
end;
$$;

create function checks.expect_message (p_label text, p_sql text, p_message text) returns void language plpgsql as $$
declare
  got text;
begin
  begin
    execute p_sql;
  exception when others then
    got := sqlerrm;
  end;
  if got is distinct from p_message then
    raise exception 'FAIL: % (expected "%", got "%")', p_label, p_message, coalesce(got, 'success');
  end if;
  raise notice 'ok: %', p_label;
end;
$$;

create function checks.expect_equal (p_label text, p_actual text, p_expected text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL: % (expected %, got %)', p_label, p_expected, p_actual;
  end if;
  raise notice 'ok: %', p_label;
end;
$$;

create function checks.claims (p_user uuid) returns void language sql as $$
  select set_config(
    'request.jwt.claims',
    coalesce(json_build_object('sub', p_user, 'role', 'authenticated')::text, ''),
    true
  );
$$;

grant execute on all functions in schema checks to anon, authenticated, service_role, supabase_auth_admin;

-- People: a (has a pin), b, d, e, f (have pins), c (signed in, no pin), m (moderator).
insert into
  auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.org'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.org'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.org'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.org'),
  ('00000000-0000-0000-0000-00000000000e', 'e@example.org'),
  ('00000000-0000-0000-0000-00000000000f', 'f@example.org'),
  ('00000000-0000-0000-0000-0000000000aa', 'm@example.org');

insert into
  public.moderators (user_id)
values
  ('00000000-0000-0000-0000-0000000000aa');

-- Written as the table owner, so these also prove the trigger snaps rows that
-- never went through a function.
insert into
  public.pins (owner_id, display_name, neighborhood, lng, lat, location_precision)
values
  ('00000000-0000-0000-0000-00000000000b', 'Check B', 'Oakland', -122.27111, 37.80444, 'city'),
  ('00000000-0000-0000-0000-00000000000d', 'Check D', 'Berkeley', -122.27, 37.87, 'city'),
  ('00000000-0000-0000-0000-00000000000e', 'Check E', 'Alameda', -122.24, 37.76, 'city'),
  ('00000000-0000-0000-0000-00000000000f', 'Check F', 'Richmond', -122.35, 37.94, 'city');

select
  checks.expect_equal (
    'owner writes are snapped to two decimals',
    (
      select
        lng::text || ',' || lat::text
      from
        public.pins
      where
        display_name = 'Check B'
    ),
    '-122.27,37.8'
  );

select
  checks.expect_message (
    'an exact pin is refused even for the table owner',
    $$insert into public.pins (owner_id, display_name, neighborhood, lng, lat, location_precision)
      values ('00000000-0000-0000-0000-00000000000c', 'Exact', 'Somewhere', -122, 37, 'exact')$$,
    'exact_location_refused'
  );

select
  checks.expect_state (
    'a contact row cannot point at another person''s pin, whoever writes it',
    $$insert into public.pin_contacts (pin_id, owner_id)
      select id, '00000000-0000-0000-0000-00000000000a' from public.pins where display_name = 'Check B'$$,
    '23503'
  );

insert into
  public.pin_contacts (pin_id, owner_id, instagram, share_handles)
select
  id,
  owner_id,
  'check.b',
  false
from
  public.pins
where
  display_name = 'Check B';

-- ---------------------------------------------------------------------------
-- Signed out.
-- ---------------------------------------------------------------------------
select
  checks.claims (null);

set local role anon;

select
  checks.expect_state ('anon cannot read pin_contacts', 'select * from public.pin_contacts', '42501');

select
  checks.expect_state ('anon cannot read the pins table', 'select * from public.pins', '42501');

select
  checks.expect_state ('anon cannot read gatherings', 'select * from public.gatherings', '42501');

select
  checks.expect_state ('anon cannot read reports', 'select * from public.pin_reports', '42501');

select
  checks.expect_state ('anon cannot reach the private schema', 'select * from private.contact_messages', '42501');

select
  checks.expect_equal ('anon reads the public view', (select count(*)::text from public.map_pins), '4');

select
  checks.expect_state ('the public view has no owner column', 'select owner_id from public.map_pins', '42703');

select
  checks.expect_state ('the public view has no internal id', 'select id from public.map_pins', '42703');

select
  checks.expect_state ('the public view has no timestamps', 'select created_at from public.map_pins', '42703');

select
  checks.expect_state (
    'anon cannot save a pin',
    $$select public.save_my_pin('X', 'Y', null, -122, 37, 'city', '{}', '{}')$$,
    '42501'
  );

select
  checks.expect_state ('anon cannot list gatherings', 'select public.upcoming_gatherings()', '42501');

select
  checks.expect_state ('anon cannot use the relay', $$select public.claim_contact_message('00000000-0000-0000-0000-00000000000a', 1, 5)$$, '42501');

-- ---------------------------------------------------------------------------
-- Signed in as a, who puts a pin down.
-- ---------------------------------------------------------------------------
reset role;

select
  checks.claims ('00000000-0000-0000-0000-00000000000a');

set local role authenticated;

select
  checks.expect_state ('authenticated cannot read pin_contacts', 'select * from public.pin_contacts', '42501');

select
  checks.expect_state (
    'authenticated cannot insert a pin directly',
    $$insert into public.pins (owner_id, display_name, neighborhood, lng, lat)
      values ('00000000-0000-0000-0000-00000000000a', 'Direct', 'Here', -122.123456, 37.123456)$$,
    '42501'
  );

select
  checks.expect_state ('authenticated cannot update pins directly', $$update public.pins set display_name = 'x'$$, '42501');

select
  checks.expect_state ('authenticated cannot delete pins directly', 'delete from public.pins', '42501');

select
  checks.expect_state (
    'authenticated cannot attach a contact row directly',
    $$insert into public.pin_contacts (pin_id, owner_id) values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a')$$,
    '42501'
  );

select
  checks.expect_state (
    'authenticated cannot file a report directly',
    $$insert into public.pin_reports (pin_id, reporter_id, reason) values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', 'x')$$,
    '42501'
  );

select
  checks.expect_state (
    'authenticated cannot post a gathering directly',
    $$insert into public.gatherings (host_id, title, place, lng, lat, starts_at)
      values ('00000000-0000-0000-0000-00000000000a', 't', 'p', 0, 0, now() + interval '1 day')$$,
    '42501'
  );

select
  checks.expect_state ('authenticated cannot read gatherings directly (host_id)', 'select host_id from public.gatherings', '42501');

select
  checks.expect_state ('authenticated cannot write the quota ledger', $$insert into public.account_actions (user_id, action) values ('00000000-0000-0000-0000-00000000000a', 'x')$$, '42501');

select
  checks.expect_state ('authenticated cannot add a moderator', $$insert into public.moderators (user_id) values ('00000000-0000-0000-0000-00000000000a')$$, '42501');

select
  checks.expect_state ('authenticated cannot use the relay', $$select public.claim_contact_message('00000000-0000-0000-0000-00000000000a', 1, 5)$$, '42501');

select
  checks.expect_state ('authenticated cannot read moderator emails', 'select public.moderator_emails()', '42501');

select
  checks.expect_state ('authenticated cannot call the auth hook', $$select public.hook_reject_disposable_email('{}')$$, '42501');

select
  checks.expect_message (
    'save_my_pin refuses an exact pin',
    $$select public.save_my_pin('Check A', 'San Francisco', null, -122.4194, 37.7749, 'exact', '{}', '{}')$$,
    'exact_location_refused'
  );

select
  public.save_my_pin (
    'Check A',
    'San Francisco',
    'Hello',
    -122.419416,
    37.774929,
    'city',
    '{food}',
    '{lived}'
  );

select
  checks.expect_equal (
    'save_my_pin snaps the stored point',
    (
      select
        lng::text || ',' || lat::text
      from
        public.my_pin ()
    ),
    '-122.42,37.77'
  );

select
  checks.expect_equal (
    'the public view shows the snapped point',
    (
      select
        lng::text || ',' || lat::text
      from
        public.map_pins
      where
        display_name = 'Check A'
    ),
    '-122.42,37.77'
  );

select
  checks.expect_state (
    'an instagram handle has to look like one',
    $$select public.save_my_handles('not a handle!', null, true)$$,
    '23514'
  );

select
  checks.expect_state (
    'a website has to be http or https',
    $$select public.save_my_handles(null, 'javascript:alert(1)', true)$$,
    '23514'
  );

select
  public.save_my_handles ('check.a', 'https://example.org', false);

select
  checks.expect_equal (
    'unshared handles are not handed out',
    (
      select
        count(*)::text
      from
        public.pin_handles (
          (
            select
              seq
            from
              public.map_pins
            where
              display_name = 'Check B'
          )
        )
    ),
    '0'
  );

-- ---------------------------------------------------------------------------
-- b looks at a's handles once a shares them.
-- ---------------------------------------------------------------------------
select
  public.save_my_handles ('check.a', 'https://example.org', true);

reset role;

select
  checks.claims ('00000000-0000-0000-0000-00000000000b');

set local role authenticated;

select
  checks.expect_equal (
    'shared handles reach another member',
    (
      select
        instagram
      from
        public.pin_handles (
          (
            select
              seq
            from
              public.map_pins
            where
              display_name = 'Check A'
          )
        )
    ),
    'check.a'
  );

-- ---------------------------------------------------------------------------
-- c is signed in but has no pin.
-- ---------------------------------------------------------------------------
reset role;

select
  checks.claims ('00000000-0000-0000-0000-00000000000c');

set local role authenticated;

select
  checks.expect_message (
    'somebody without a pin cannot look up handles',
    $$select * from public.pin_handles((select seq from public.map_pins where display_name = 'Check A'))$$,
    'needs_own_pin'
  );

select
  checks.expect_message (
    'somebody without a pin cannot save handles',
    $$select public.save_my_handles('c', null, true)$$,
    'needs_own_pin'
  );

-- ---------------------------------------------------------------------------
-- Quotas. a has used some writes already; clear them and count from zero.
-- ---------------------------------------------------------------------------
reset role;

delete from public.account_actions
where
  user_id = '00000000-0000-0000-0000-00000000000a';

select
  checks.claims ('00000000-0000-0000-0000-00000000000a');

set local role authenticated;

do $$
begin
  for attempt in 1..30 loop
    perform public.save_my_pin('Check A', 'San Francisco', null, -122.42, 37.77, 'city', '{}', '{}');
  end loop;
end
$$;

select
  checks.expect_message (
    'the 31st pin write in a day is refused',
    $$select public.save_my_pin('Check A', 'San Francisco', null, -122.42, 37.77, 'city', '{}', '{}')$$,
    'quota_exceeded'
  );

do $$
begin
  for attempt in 1..10 loop
    perform public.report_pin((select seq from public.map_pins where display_name = 'Check B'), 'check');
  end loop;
end
$$;

select
  checks.expect_message (
    'the 11th report in a day is refused',
    $$select public.report_pin((select seq from public.map_pins where display_name = 'Check B'), 'check')$$,
    'quota_exceeded'
  );

-- ---------------------------------------------------------------------------
-- The relay, as the server calls it.
-- ---------------------------------------------------------------------------
reset role;

select
  checks.claims (null);

set local role service_role;

select
  checks.expect_equal (
    'the relay returns the recipient address from auth.users',
    (
      select
        recipient_email
      from
        public.claim_contact_message (
          '00000000-0000-0000-0000-00000000000a',
          (
            select
              seq
            from
              public.map_pins
            where
              display_name = 'Check B'
          ),
          12
        )
    ),
    'b@example.org'
  );

select
  public.claim_contact_message (
    '00000000-0000-0000-0000-00000000000a',
    (
      select
        seq
      from
        public.map_pins
      where
        display_name = 'Check B'
    ),
    12
  );

select
  public.claim_contact_message (
    '00000000-0000-0000-0000-00000000000a',
    (
      select
        seq
      from
        public.map_pins
      where
        display_name = 'Check B'
    ),
    12
  );

select
  checks.expect_message (
    'a fourth message to the same person in a day is refused',
    $$select public.claim_contact_message('00000000-0000-0000-0000-00000000000a',
      (select seq from public.map_pins where display_name = 'Check B'), 12)$$,
    'quota_exceeded_recipient'
  );

select
  checks.expect_message (
    'nobody can message their own pin',
    $$select public.claim_contact_message('00000000-0000-0000-0000-00000000000a',
      (select seq from public.map_pins where display_name = 'Check A'), 12)$$,
    'own_pin'
  );

select
  checks.expect_message (
    'somebody without a pin cannot send',
    $$select public.claim_contact_message('00000000-0000-0000-0000-00000000000c',
      (select seq from public.map_pins where display_name = 'Check B'), 12)$$,
    'needs_own_pin'
  );

select
  public.claim_contact_message (
    '00000000-0000-0000-0000-00000000000a',
    (
      select
        seq
      from
        public.map_pins
      where
        display_name = 'Check D'
    ),
    12
  );

select
  checks.expect_equal (
    'the fifth message inside an hour alerts moderators',
    (
      select
        alert_moderators::text
      from
        public.claim_contact_message (
          '00000000-0000-0000-0000-00000000000a',
          (
            select
              seq
            from
              public.map_pins
            where
              display_name = 'Check D'
          ),
          12
        )
    ),
    'true'
  );

do $$
begin
  perform public.claim_contact_message('00000000-0000-0000-0000-00000000000a',
    (select seq from public.map_pins where display_name = 'Check D'), 12);
  for attempt in 1..3 loop
    perform public.claim_contact_message('00000000-0000-0000-0000-00000000000a',
      (select seq from public.map_pins where display_name = 'Check E'), 12);
  end loop;
  perform public.claim_contact_message('00000000-0000-0000-0000-00000000000a',
    (select seq from public.map_pins where display_name = 'Check F'), 12);
end
$$;

select
  checks.expect_message (
    'the 11th message in a day is refused',
    $$select public.claim_contact_message('00000000-0000-0000-0000-00000000000a',
      (select seq from public.map_pins where display_name = 'Check F'), 12)$$,
    'quota_exceeded'
  );

select
  checks.expect_equal (
    'the server can list moderator addresses',
    (
      select
        string_agg(email, ',')
      from
        public.moderator_emails () as email
    ),
    'm@example.org'
  );

-- ---------------------------------------------------------------------------
-- Gatherings.
-- ---------------------------------------------------------------------------
reset role;

select
  checks.claims ('00000000-0000-0000-0000-00000000000b');

set local role authenticated;

select
  checks.expect_message (
    'a gathering in the past is refused',
    $$select public.post_gathering('Tea', 'Park', null, -122.27, 37.8, now() - interval '1 day')$$,
    'gathering_time'
  );

select
  checks.expect_equal (
    'the host sees their gathering as theirs',
    (
      select
        mine::text
      from
        public.post_gathering (
          'Tea',
          'Lake Merritt',
          null,
          -122.26,
          37.80,
          now() + interval '2 days'
        )
    ),
    'true'
  );

reset role;

select
  checks.claims ('00000000-0000-0000-0000-00000000000d');

set local role authenticated;

select
  checks.expect_equal (
    'another member sees it, not as theirs',
    (
      select
        mine::text
      from
        public.upcoming_gatherings ()
      where
        title = 'Tea'
    ),
    'false'
  );

select
  checks.expect_equal (
    'nobody can call off somebody else''s gathering',
    (
      select
        public.cancel_my_gathering (
          (
            select
              seq
            from
              public.upcoming_gatherings ()
            where
              title = 'Tea'
          )
        )::text
    ),
    'false'
  );

-- ---------------------------------------------------------------------------
-- Moderation and bans.
-- ---------------------------------------------------------------------------
select
  checks.expect_message (
    'a member cannot remove a pin',
    $$select public.moderation_remove_pin((select seq from public.map_pins where display_name = 'Check A'), true)$$,
    'not_moderator'
  );

select
  checks.expect_message ('a member cannot read the queue', 'select * from public.moderation_open_reports()', 'not_moderator');

reset role;

select
  checks.claims ('00000000-0000-0000-0000-0000000000aa');

set local role authenticated;

select
  checks.expect_equal (
    'a moderator sees the open reports',
    (
      select
        count(*)::text
      from
        public.moderation_open_reports ()
    ),
    '10'
  );

select
  checks.expect_equal (
    'a moderator sees busy senders',
    (
      select
        display_name
      from
        public.moderation_busy_senders ()
    ),
    'Check A'
  );

select
  checks.expect_equal (
    'removing with a ban returns the banned account',
    (
      select
        public.moderation_remove_pin (
          (
            select
              seq
            from
              public.map_pins
            where
              display_name = 'Check A'
          ),
          true
        )::text
    ),
    '00000000-0000-0000-0000-00000000000a'
  );

reset role;

select
  checks.claims ('00000000-0000-0000-0000-00000000000a');

set local role authenticated;

select
  checks.expect_message (
    'a banned account cannot put a pin back',
    $$select public.save_my_pin('Check A', 'San Francisco', null, -122.42, 37.77, 'city', '{}', '{}')$$,
    'account_banned'
  );

select
  checks.expect_message (
    'a banned account cannot report',
    $$select public.report_pin((select seq from public.map_pins where display_name = 'Check B'), 'again')$$,
    'account_banned'
  );

-- ---------------------------------------------------------------------------
-- The sign-up hook.
-- ---------------------------------------------------------------------------
reset role;

set local role supabase_auth_admin;

select
  checks.expect_equal (
    'the hook refuses a throwaway inbox',
    (public.hook_reject_disposable_email ('{"user": {"email": "someone@mailinator.com"}}') ? 'error')::text,
    'true'
  );

select
  checks.expect_equal (
    'the hook refuses a subdomain of one',
    (public.hook_reject_disposable_email ('{"user": {"email": "someone@eu.yopmail.com"}}') ? 'error')::text,
    'true'
  );

select
  checks.expect_equal (
    'the hook lets an ordinary address through',
    public.hook_reject_disposable_email ('{"user": {"email": "someone@gmail.com"}}')::text,
    '{}'
  );

reset role;

rollback;
