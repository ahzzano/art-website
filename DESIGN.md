# Design: Supabase-backed Art Portfolio

# Problem Statement

I want my portfolio to be a link-in-bio hub with an art gallery and a blog. Under the previous design, every new artwork meant adding files to the repo, committing and pushing to `main` just to publish. That works, but it is a hassle, it bloats the repo with image files, and it makes posting feel like a deploy. I want to post art and blog posts from a simple form without touching git, without exposing an admin panel on the public internet, and without paying for hosting.

# Solutions

- Content (artworks and blog posts) moves to **Supabase**. Postgres holds the rows and Storage holds the images, all on the free tier.
- The admin UI is a **localhost-only `/admin` route** in this same repo. It talks to Supabase with the **service role key** from `.env.local`, which is never set on Vercel. The live site therefore has no login, no auth code and no write path.
- The **public site** (Vercel) reads published content with the anon key. Row Level Security limits it to `SELECT` on published rows, and there are no write policies at all.
- After each save, the local admin calls a secret-protected **`/api/revalidate`** route on the live site. That route expires the cached content, so changes go live within seconds.
- A daily **Vercel cron** hits `/api/keepalive` so the free-tier project never pauses.
- Profile info and social links stay as typed files (`content/site.ts`, `content/links.ts`). They change rarely and editing them through git is fine.

# User Stories

1. As the artist, I want to publish a new artwork from a form on my machine, so that I never commit or push just to post art.
2. As the artist, I want to pick an image file and have it resized in the browser before upload, so that only web-sized copies leave my machine.
3. As the artist, I want the alt text field to be required, so that every artwork is accessible to screen-reader users.
4. As the artist, I want to add an optional description to an artwork, so that I can share notes about the piece.
5. As the artist, I want to attach links to an artwork (e.g. the Instagram, X or Pixiv post, or a print shop), so that visitors can find it elsewhere.
6. As the artist, I want to set an artwork's date, so that I can backdate older pieces and keep the gallery chronological.
7. As the artist, I want to save an artwork as a draft, so that I can prepare it and publish later.
8. As the artist, I want to toggle an artwork between draft and published, so that I can hide a piece without deleting it.
9. As the artist, I want to edit an artwork's title, alt, description, links, date and image, so that I can fix mistakes after publishing.
10. As the artist, I want replacing an artwork's image to remove the old file from storage, so that the 1 GB free quota isn't wasted.
11. As the artist, I want to delete an artwork and have its image file removed too, so that nothing is left orphaned.
12. As the artist, I want to write a blog post in a markdown textarea, so that I can format text without a heavy editor.
13. As the artist, I want a post's slug to be filled in from its title but stay editable, so that URLs are readable and under my control.
14. As the artist, I want a clear error when a slug is already taken or malformed, so that I don't silently break or overwrite a post URL.
15. As the artist, I want to upload an image from the post form and get back a markdown snippet to paste, so that I can put images inside posts.
16. As the artist, I want to save posts as drafts and publish later, so that I can write across several sessions.
17. As the artist, I want to edit and delete posts, so that I can maintain the blog.
18. As the artist, I want the live site to show my changes within seconds of saving, so that I don't wait for a cache to expire.
19. As the artist, I want the admin to tell me if saving worked but the live-site refresh failed, so that I know to retry instead of wondering why nothing changed.
20. As the artist, I want `/admin` to return 404 on the deployed site, so that nobody can even find an admin panel there.
21. As the artist, I want the deployed site to hold no credentials that can write, so that a leaked Vercel env var can't be used to deface my portfolio.
22. As the artist, I want my free Supabase project to stay awake on its own, so that the site doesn't break after a quiet week.
23. As the artist, I want the schema, RLS policies and bucket to be defined in versioned migrations, so that I can rebuild the backend if the project is ever lost.
24. As a visitor, I want to browse a grid of artworks with the newest first, so that I see recent work at once.
25. As a visitor, I want thumbnails sized to my device, so that the gallery loads fast on my phone.
26. As a visitor, I want to open an artwork on its own page with a large image, title, date, description and links, so that I can look closely and share the URL.
27. As a visitor, I want to read a list of blog posts, newest first, so that I can catch up on updates.
28. As a visitor, I want each post to have a readable URL, so that I can share and bookmark it.
29. As a visitor, I want unpublished or deleted content to return a 404, so that I never see half-finished work.
30. As a visitor, I want the existing link-in-bio home page to keep working, so that my social links stay one tap away.
31. As a visitor using a screen reader, I want every artwork image to have meaningful alt text, so that I understand what is shown.
32. As the artist, I want AI crawlers kept away from my art as far as the platform allows, so that my work isn't used for training.

# Implementation Details

## Hosting & Tooling

- **Host:** Vercel (Hobby). **Backend:** Supabase free tier (Postgres + Storage). No Supabase Auth.
- **Package manager:** pnpm (remove `package-lock.json`, keep `pnpm-lock.yaml`).
- **Dependencies kept:** `axios`, `simple-icons`.
- **New dependencies:** `@supabase/supabase-js`, `react-markdown`.
- **New dev dependencies:** `supabase` (CLI, for migrations and type generation).
- **Dropped from the previous design:** `gray-matter`, `marked`, `sharp` and the quick-add script.
- Read the Next 16 docs in `node_modules/next/dist/docs/` (Cache Components, `cacheTag`, `revalidateTag`, `next/image`, Route Handlers, Server Actions) before implementing. `next.config.ts` already sets `cacheComponents: true`.

## Environment Variables

| Variable | Local (`.env.local`) | Vercel | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes | Anon/publishable key, read-only under RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **never** | Admin writes and signed upload URLs |
| `REVALIDATE_SECRET` | yes | yes | Shared secret for `/api/revalidate` |
| `SITE_URL` | yes | no | Live site origin that the admin calls to revalidate |

## Schema (`supabase/migrations/<timestamp>_init.sql`, via Supabase CLI)

```sql
create table artworks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) > 0),
  description text,
  alt         text not null check (length(trim(alt)) > 0),
  image_path  text not null,          -- object path inside the `art` bucket
  width       int  not null,
  height      int  not null,
  links       jsonb not null default '[]', -- [{ title, url, icon?, description? }]
  created_at  timestamptz not null default now(), -- editable; drives ordering
  published   boolean not null default false
);

create table posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  body_md     text not null,
  created_at  timestamptz not null default now(),
  published   boolean not null default false
);

alter table artworks enable row level security;
alter table posts    enable row level security;

create policy "public reads published artworks" on artworks
  for select to anon using (published);
create policy "public reads published posts" on posts
  for select to anon using (published);

insert into storage.buckets (id, name, public) values ('art', 'art', true);
```

- There are no insert/update/delete policies on either table and no policies on `storage.objects`. Only the service role (which bypasses RLS) can write.
- Storage paths: `artworks/<uuid>.webp` and `posts/<uuid>.webp`.
- Types are generated into `lib/database.types.ts` with `supabase gen types typescript` (script `db:types`).
- Schema changes are applied with `supabase db push` from the owner's machine.

## Modules

| Module | Interface | Notes |
|---|---|---|
| `lib/supabase.ts` | `publicClient()`, `adminClient()` | `adminClient()` throws if `SUPABASE_SERVICE_ROLE_KEY` is missing |
| `lib/content.ts` | `getArtworks()`, `getArtwork(id)`, `getPosts()`, `getPost(slug)` | `'use cache'` + `cacheTag('artworks' \| 'posts')` + `cacheLife('max')`. Published rows only, `created_at` desc. Returns `null` when not found |
| `lib/slug.ts` | `slugify(title: string): string` | Pure. `"Night Market!"` becomes `"night-market"`. Output matches the DB check regex |
| `lib/validate.ts` | `validateArtwork(input)`, `validatePost(input)` returning `{ ok: true, data } \| { ok: false, errors: Record<field, string> }` | Pure. Required title/alt/body, slug format, link URLs are `http(s)`, valid date |
| `lib/image.ts` | `fitWithin(width, height, max = 2000): { width, height }` | Pure. Keeps aspect ratio and never upscales. Used by the browser resize |
| `lib/revalidate-auth.ts` | `isAuthorized(header: string \| null, secret: string \| undefined): boolean` | Pure. False when either is missing. Constant-time compare |
| `lib/dev-only.ts` | `assertDev()` | Calls `notFound()` unless `process.env.NODE_ENV === 'development'` |
| `lib/types.ts` | adds `Artwork`, `Post`, `ArtworkLink` | Derived from `database.types.ts`. `ArtworkLink` matches the `links.ts` shape, with `icon` as a simple-icons slug string |

Pure modules (`slug`, `validate`, `image`, `revalidate-auth`) import nothing from the app, so `node --test` can run them directly with Node 26's native type stripping.

## Routes

| Route | Kind | Behavior |
|---|---|---|
| `/` | existing | Profile and links from `content/`. Gains nav links to `/art` and `/blog` |
| `/art` | page | Grid of published artworks, newest first. `next/image` with `fill` + `object-cover` square tiles, each linking to `/art/[id]` |
| `/art/[id]` | page | Large image (`object-contain`, stored `width`/`height`), title, date, description, links via `LinkItem`. `notFound()` if missing or unpublished |
| `/blog` | page | Published posts list (title, date), newest first |
| `/blog/[slug]` | page | Post rendered server-side with `react-markdown` (raw HTML disabled, which is the default). `notFound()` if missing or unpublished |
| `/admin`, `/admin/art/*`, `/admin/blog/*` | pages + `actions.ts` | Every page **and every server action** calls `assertDev()` first. Lists all rows, drafts included |
| `/api/revalidate` | `POST` Route Handler | Returns 401 unless `isAuthorized(req.headers.get('x-revalidate-secret'), REVALIDATE_SECRET)`. Body `{ tags: ('artworks' \| 'posts')[] }`. Calls `revalidateTag(tag, { expire: 0 })` per tag and ignores unknown tags |
| `/api/keepalive` | `GET` Route Handler | One `select id from artworks limit 1` via `publicClient()`, uncached. Returns 200 |

`vercel.json` holds one daily cron: `{ "crons": [{ "path": "/api/keepalive", "schedule": "0 12 * * *" }] }`.

## Admin Flows

**Create/replace artwork image**
1. The browser reads the file and resizes it with canvas using `fitWithin(…, 2000)`, exporting WebP.
2. The server action `createUploadUrl('artworks')` uses `adminClient()` and returns `{ path, token }` from `createSignedUploadUrl`. The image bytes never pass through a server action, so the 1 MB body limit doesn't apply.
3. The browser calls `uploadToSignedUrl(path, token, blob)` with the anon client.
4. The server action `saveArtwork(formData)` runs `validateArtwork`, upserts the row (including `width`/`height`), and deletes the previous object when the image was replaced.
5. It then calls `${SITE_URL}/api/revalidate` with `{ tags: ['artworks'] }`.

**Delete artwork:** delete the row, then remove the Storage object, then revalidate.

**Posts:** `title` input auto-fills `slug` via `slugify` until the slug field is edited by hand. `savePost` runs `validatePost`. A unique-violation from Postgres is mapped to a `slug` field error. Delete removes the row only; inline post images are not tracked or cleaned up.

**Inline post image:** same steps 1–3 with `createUploadUrl('posts')`. The form then shows `![alt](<public URL>)` to copy into the textarea.

**Revalidate failure:** the save is not rolled back. The admin shows "Saved, but the live site was not refreshed" with a retry button.

## Images & `next.config.ts`

- `images.remotePatterns`: `https://<project-ref>.supabase.co/storage/v1/object/public/art/**`.
- Vercel image optimization produces thumbnails (Hobby quota is enough for a portfolio). Only one web-size copy is stored per image.

## Bot Protection (carried over, adjusted)

| Layer | What | Where |
|---|---|---|
| robots.txt | `Disallow: /` for AI crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, Bytespider, PerplexityBot, meta-externalagent, …). Everyone else allowed | `app/robots.txt` |
| Page signal | `noai, noimageai` robots meta | `metadata` in `app/layout.tsx` |
| Image signal | `X-Robots-Tag: noai, noimageai` on `/art/:path*` and `/_next/image` | `headers()` in `next.config.ts` |
| Hard block | Vercel Firewall, Bot Management, AI Bots set to **Deny** | Vercel dashboard (manual) |

- Search engines are not blocked. No CAPTCHA: the deployed site has no forms. `/api/revalidate` is secret-gated and `/api/keepalive` only does a cheap read.
- **New limit:** original images are served from the public Supabase Storage URL. The Firewall and `X-Robots-Tag` don't cover that domain. Only traffic through `/_next/image` is protected. Uploading web-size copies only (never originals) limits what a scraper can get.

## UI

- Mobile-first with Tailwind breakpoint prefixes (base = phone, `sm:` and up = desktop).
- **`LinkItem`**: a single shared component (icon + title + description) for site links and per-artwork links. Icons are resolved from a simple-icons slug at render time.

# Testing

- **What a good test is:** it calls a module's public function and asserts on its return value. It does not assert on internal helpers or call order. Tests stay valid if the implementation is rewritten.
- **Runner:** Node's built-in `node:test` + `node:assert`, run directly on `.ts` files via Node 26 type stripping. No new dependencies. Script: `"test": "node --test lib/"`.
- **Modules under test:**
  - `lib/slug.ts`: spaces/punctuation/case, accents, repeated and trailing separators, empty or symbol-only title, output always matches `^[a-z0-9]+(-[a-z0-9]+)*$` (or is empty).
  - `lib/validate.ts`: missing/whitespace-only alt and title, malformed slug, non-http(s) link URL, invalid date, valid input passes through normalized.
  - `lib/image.ts`: landscape, portrait and square inputs, inputs smaller than `max` are not upscaled, integer output, aspect ratio preserved within 1px.
  - `lib/revalidate-auth.ts`: correct secret, wrong secret, missing header, missing env secret (must be false, never "undefined equals undefined").
- **Prior art:** none in the repo (only `lint` exists). These tests replace the previous design's planned self-checks for the validator and slug derivation.
- **Not tested by code (manual checklist before first deploy):**
  - With the anon key: insert, update and delete on both tables fail; drafts aren't returned; upload to `art` fails.
  - On the deployed site: `/admin` returns 404.
  - `SUPABASE_SERVICE_ROLE_KEY` is absent from Vercel env.
  - `/api/revalidate` without the secret returns 401.

# Out of Scope

- Deployed/production admin, Supabase Auth, multiple authors
- Posting from a phone
- Drizzle or any ORM
- Tags / filtering, search
- Multiple images per artwork, medium/dimensions fields
- Manual gallery ordering, featured/pinned pieces, featured pieces on the home page
- Modal/intercepting-route artwork view
- Rich-text/WYSIWYG editor, live markdown preview
- Storing originals (public or private bucket); Supabase image transformations
- Moving `site.ts` / `links.ts` into the database
- Auto-importing from social media (X API is paid, Pixiv has no official API, Instagram needs a Business account and token refresh)
- Cleanup of orphaned inline post images
- Automated RLS, route handler, or E2E tests

# Further Notes

- **Supersedes** the file-based design (markdown in `content/art/`, images in `public/art/`, `pnpm add-art` quick-add script pushing to `main`). Nothing from it was implemented, so there is no data to migrate.
- **Security model:** the safety of the live site rests on RLS plus the service role key never reaching Vercel. `assertDev()` is defense in depth: even if `/admin` were reachable in production, `adminClient()` has no key to use there. RLS has no automated tests, so run the manual checklist after every migration that touches policies.
- **Free-tier limits:** 1 GB Storage, 50 MB per file, the project pauses after ~7 days idle (covered by the cron), and Vercel Hobby crons run at most once a day.
- `revalidateTag(tag, { expire: 0 })` is the documented choice for a Route Handler that needs content gone immediately (`updateTag` only works in Server Actions, and the action runs on localhost, not on the live site).
- `talia-yang.png` sits unused at the repo root. It is not part of this spec.

## Nice to Have

- Static border on the main card: an animated SVG-noise ring around the card (a masked `::before` layer with stepped flicker), with no animation under `prefers-reduced-motion`.
- Green accent: add a `--green` variable to the Talia theme (a mint such as `#a8e6cf`, or a cyan-leaning green such as `#5fd3a8`). Use it as an accent only (the static border, link hovers, glows), not as a main surface color, so the pink/red palette stays dominant. Don't rely on red vs. green alone to convey meaning; pair it with a brightness difference, an icon or an underline.
