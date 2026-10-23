-- Just enough of a Supabase project for the migrations to run on a bare
-- Postgres (scripts/check-migrations.mjs runs them on PGlite). Never run this
-- against a real Supabase database: it already has all of this.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants everything new in public to the API roles. Reproducing that
-- here is what makes the checks catch a table or function left open.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid (),
  email text,
  email_confirmed_at timestamptz default now()
);

create function auth.uid () returns uuid language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

grant execute on function auth.uid () to anon, authenticated, service_role;
