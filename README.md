# Nikkei Counts

A community map for Nikkei Nexus. People put a tag on their city or region,
say how they are connected to Japan, and can be reached by other members
without anybody's email address ever being shown.

The app runs on its own Vercel project and is served from the Nikkei Nexus
website at `/counts`.

## Running it

```sh
npm install
npm run dev        # http://localhost:3000/counts/map
```

Without Supabase variables the map runs on `data/seed-pins.json` (invented
people, development only). Checks:

```sh
npm run lint
npm run typecheck
npm run build
npm run check:db   # migrations + security checks on an in-process Postgres
```

## Environment variables

| Variable | Where | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Anon key. It can only read `public.map_pins` and call the member functions. |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel, server only | Used for the message relay, moderator emails, sign-in bans and the digest. |
| `NEXT_PUBLIC_HOST_URL` | Vercel | The website, e.g. `https://www.nikkeinexus.org`. Used for the back link, email links, Open Graph URLs and the embed's `frame-ancestors`. |
| `NEXT_PUBLIC_TILE_URL` | Vercel | Production PMTiles archive. Unset in development. |
| `RESEND_API_KEY` | Vercel | Sends messages, moderator alerts and the digest. |
| `DIGEST_FROM` | Vercel | The no-reply sender for all mail, e.g. `Nikkei Counts <no-reply@nikkeinexus.org>`. |
| `CRON_SECRET` | Vercel | Vercel Cron sends it as `Authorization: Bearer …` to `/counts/api/digest`. `DIGEST_SECRET` still works as a fallback. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel | Shows a Cloudflare Turnstile check on the sign-in form. The matching secret key goes in Supabase, not here. |

## The /counts contract

`next.config.ts` sets `basePath: "/counts"` (from `lib/paths.ts`). Every page,
asset and API route lives under it.

On the website (also Next.js), forward the whole prefix:

```js
// next.config.js on the website
async rewrites() {
  return [
    { source: "/counts", destination: `${process.env.COUNTS_ORIGIN}/counts` },
    { source: "/counts/:path*", destination: `${process.env.COUNTS_ORIGIN}/counts/:path*` },
  ];
}
```

Link to it with a plain `<a>`, not `next/link`; it is a different zone.

| Path | What it is |
| --- | --- |
| `/counts` | Redirects to `/counts/map`. |
| `/counts/map` | The full map. Anyone can look; signing in adds yourself, messaging and gatherings. |
| `/counts/map?signin=1` | Opens the sign-in panel on arrival. |
| `/counts/map?signin=1&next=/some/page` | After the email link is opened, sends the person on to `/some/page` (same-origin paths only). |
| `/counts/embed` | The map alone, for an iframe. Cooperative gestures, a "Sign in" action and an "Open the full map" link that act on the top window. |
| `/counts/api/stats` | `{ "people": number }`, cached for 5 minutes. For the website's counter block. |

Embedding:

```html
<iframe src="/counts/embed" title="Nikkei Counts map" loading="lazy" style="width:100%;height:480px;border:0"></iframe>
```

If you add a `sandbox` attribute, it needs `allow-scripts allow-same-origin
allow-top-navigation-by-user-activation`. The embed must be served from the
same origin as the website (through the rewrite above) so sign-in is shared;
it notices a sign-in in another tab through the `storage` event.

## Database

Migrations are in `supabase/migrations`. Apply them in order with the
Supabase CLI (`supabase db push`) or the SQL editor. `0006_lock_down_tables.sql`
is the security model:

- The browser has no direct access to any table. Pins are read through the
  `public.map_pins` view (no owner, id or timestamps; coordinates rounded).
- Every write is a `security definer` function that reads the caller from
  `auth.uid()`, refuses banned accounts and takes from a daily quota under a
  lock: 30 pin edits, 10 reports, 5 gatherings, 10 messages (3 to the same
  person), 100 handle lookups and 60 geocoder lookups.
- Pins are rounded to two decimals (about a kilometre) by a trigger, and an
  exact pin is refused.
- Email addresses live only in `auth.users`. Messages go through the server,
  which records who wrote to whom in `private.contact_messages`. Message text
  is not stored.

`supabase/checks/security.sql` proves each of these. `npm run check:db` runs
it on PGlite; against a local Supabase stack run
`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/checks/security.sql`.
It runs in a transaction that is rolled back.

## Moderators

Moderators are rows in `public.moderators`; nobody can add themselves. Ask the
board member to sign in once (so they have an account), then run in the SQL
editor:

```sql
insert into public.moderators (user_id)
select id from auth.users where email = 'board.member@example.org'
on conflict do nothing;
```

To remove one: `delete from public.moderators where user_id = (select id from auth.users where email = '…');`

Moderators get an email whenever a pin is reported, and when somebody sends
five messages inside an hour. They work the queue at `/counts/moderate`, where
they can remove a pin, or remove it and ban the owner (the ban blocks every
write and the sign-in itself). To lift a ban:

```sql
delete from private.banned_accounts where user_id = '…';
```

and unban the user under Authentication, Users.

## Supabase settings to switch on

- Authentication, Attack Protection: enable CAPTCHA with Cloudflare Turnstile
  and paste the Turnstile secret key.
- Authentication, Rate Limits: keep sign-in emails low (for example 30 an
  hour) and OTP requests per IP low.
- Authentication, Hooks: set "Before User Created" to the Postgres function
  `public.hook_reject_disposable_email`.
- Authentication, URL Configuration: Site URL
  `https://www.nikkeinexus.org/counts/map`, and add
  `https://www.nikkeinexus.org/counts/map**` to Redirect URLs.
