-- What people are into, so the map can answer "who near me is into this"
-- rather than only "who is near me".
--
-- An array on the pin rather than a join table: the list is short, it is only
-- ever read whole, and Postgres can index and filter it directly. The values
-- come from a fixed vocabulary in lib/interests.ts, so filtering works and
-- there is no free text to moderate.
alter table public.pins
add column interests text[] not null default '{}';

-- Answers "which pins include any of these", which is the only query asked.
create index pins_interests_idx on public.pins using gin (interests);
