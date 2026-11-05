# Design: File-based CMS for Art Portfolio

## Purpose

A self-owned link-in-bio hub first, with an art gallery second.

## Hosting & Tooling

- **Host:** Vercel. Content is edited as files in the repo; `git push` triggers a rebuild. No admin UI, no auth, no server-side state.
- **Package manager:** pnpm (remove `package-lock.json`, keep `pnpm-lock.yaml`).
- **Dependencies kept:** `axios` stays.
- **New dependencies:** `simple-icons`, `gray-matter`, `marked`.
- **New dev dependencies:** `sharp` (used by the quick-add script).

## Content Layout

```text
content/
  site.ts          # profile + SEO metadata
  links.ts         # link-in-bio entries
  art/
    <slug>.md      # one file per artwork
public/
  art/             # artwork image files
```

### `content/site.ts`

Typed object with `name`, `bio`, `avatar` (path), and SEO metadata. Also consumed by `app/layout.tsx` metadata.

### `content/links.ts`

Typed array. Display order = order in the file.

```ts
type Link = {
  title: string;
  url: string;
  icon?: string;        // simple-icons slug, e.g. "instagram"
  description?: string; // short subtitle
};
```

### `content/art/<slug>.md`

Markdown with frontmatter; the body is optional prose.

```md
---
title: Example Piece
image: /art/example.png
alt: Description of the image
date: 2025-01-31
links:
  - title: Buy print
    url: https://example.com
    icon: etsy
---

Optional notes about the piece.
```

| Field   | Required | Notes                                 |
|---------|----------|---------------------------------------|
| `title` | yes      |                                       |
| `image` | yes      | Path under `public/`, e.g. `/art/...` |
| `alt`   | yes      | Accessibility; build fails if missing |
| `date`  | yes      | Drives gallery ordering               |
| `links` | no       | Same shape as `Link`                  |

## Loading & Validation

- Read `content/art/*.md` at build time on the server.
- `gray-matter` parses frontmatter; `marked` renders the body to HTML server-side (zero client JS for Markdown). Raw HTML output is acceptable because only the site owner writes content.
- A small hand-written validator throws at build time, naming the file and the problem (missing `alt`, invalid `date`, etc.).
- Gallery sorted by `date`, newest first.

## Pages & UI

- **`/`** — profile header (from `site.ts`) + list of links.
- **`/gallery`** — grid of square tiles using `next/image` with `fill` + `object-cover`.
- **Lightbox** — clicking a tile opens a native `<dialog>` (client component) showing the full image (`object-contain`), title, date, rendered body, and per-piece links. No URL change.
- **`LinkItem`** — single shared component (icon + title + description) used for both site links and per-piece links.

## Quick-Add Script

Avoids re-entering art by hand after posting to social media.

```sh
pnpm add-art <image-path>
```

1. **Input:** a local image file (the original, not a social copy).
2. **Prompts** via Node's built-in `readline`: title, alt (required), date (defaults to today), links (repeat until blank; e.g. Instagram, X, Pixiv post URLs).
3. **Slug** is derived from the title (`Night Market` → `night-market`). Abort if `content/art/<slug>.md` already exists.
4. **Resize** with `sharp` to max 2400px wide, WebP, saved as `public/art/<slug>.webp`.
5. **Write** `content/art/<slug>.md`.
6. **Validate** with the same frontmatter validator used at build time. On failure, abort without committing.
7. **Git:** stage only the two new files, commit as `Add artwork: <title>`, then push directly to `origin main`. No pull request is ever created.

### Branch rule (no PR required)

- Before any prompts, the script checks the current branch. If it is not `main`, it aborts with "Switch to main first". It never switches branches itself.
- It runs `git pull --ff-only` before writing files. If `main` has diverged, it aborts.
- GitHub branch protection that requires PRs on `main` will reject the push. The owner must allow direct pushes (or bypass) for this flow to work; the script does not work around it.

The script is a `.ts` file run directly by Node 26 (native type stripping), with no build step.

### Why not auto-pull from social media

- X's API is paid.
- Pixiv has no official API.
- Instagram's API needs a Business/Creator account and token refresh every ~60 days.
- The gallery is curated (only hand-picked pieces), so mirroring feeds would fight that anyway.

## Testing

- A small self-check for the frontmatter validator (the only non-trivial logic).
- A self-check for slug derivation in the quick-add script.

## Out of Scope

- Tags / filtering
- Multiple images per piece
- Medium / dimensions fields
- Featured pieces on the home page
- Per-artwork detail pages
- Shareable modal URLs
- Live/production admin UI
- Object storage for images

## Known Constraints

- Images live in the repo. The quick-add script resizes them on import; resize by hand if adding files manually.
- The quick-add script only runs on `main` and pushes directly to it; `main` must allow direct pushes.
- Read the Next 16 docs in `node_modules/next/dist/docs/` (`next/image`, client components) before implementing.
