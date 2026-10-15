-- City and region pins, and how somebody is connected to Japan.
--
-- A pin now sits on the middle of a city ("Danville") or a wider region
-- ("Contra Costa County", which a person can rename "East Bay"). There is no
-- exact option any more: a public map of where people live is a target, and
-- the people running it do not want home addresses on it.
--
-- Safe to run more than once.
alter type public.pin_precision add value if not exists 'city';

alter type public.pin_precision add value if not exists 'region';

-- Pins placed exactly before this change are pulled back to about a kilometre,
-- so no doorstep stays on the map. This loses the original spot for good; the
-- owner can move their tag to their city whenever they like.
update public.pins
set
  lng = round(lng::numeric, 2),
  lat = round(lat::numeric, 2),
  location_precision = 'neighborhood'
where
  location_precision = 'exact';

-- An array on the pin, the same way interests are stored. Values come from
-- lib/connections.ts.
alter table public.pins
add column if not exists connections text[] not null default '{}';

create index if not exists pins_connections_idx on public.pins using gin (connections);
