# Framer

A browser-based tool for applying borders, film-simulation filters, and
movable text captions to many photos at once — and exporting them **without
recompression**. Everything runs client-side: photos never leave your
machine, there's no upload step, and no server cost scales with usage.

## Why client-side

Processing runs entirely in the browser (WebGL2 for filters, Canvas 2D for
compositing, Web Workers for the bulk queue) instead of on a server. Given the
choice between uploading hundreds of 20–50MB originals to a server or doing
the work locally, local won — it keeps exports genuinely lossless, removes
upload latency entirely, and means server cost stays at zero no matter how
many photos you process.

**Trade-off:** folder-in/folder-out (reading and writing directly to a chosen
folder) needs the File System Access API, which is Chromium-only today
(Chrome, Edge, Opera). Safari and Firefox fall back automatically to a file
picker for import and a ZIP download for export — full functionality, just
without the direct-folder convenience.

## Features

- **Bulk import** — drag a folder in, or use the native folder picker on
  Chromium. Thumbnails decode lazily in a worker pool and cache to
  IndexedDB, so importing thousands of photos does no work until you scroll
  to them.
- **Filters** — 13 tonal/colour/effect sliders (exposure, contrast,
  highlights/shadows, temperature/tint, vibrance, clarity, grain,
  vignette, …) running as a single WebGL2 shader chain in linear light.
- **Presets** — 8 general-purpose looks, plus all 20 Fujifilm film
  simulations (PROVIA, Velvia, Classic Chrome, Acros + filter variants,
  Nostalgic Neg., Reala ACE, and the rest), approximated from the filter
  set.
- **Borders/frames** — 6 frame types (solid, gallery mat, polaroid, 35mm
  film strip, rounded + drop shadow, aspect-ratio padding for square/social
  crops), each defined as a pure, unit-tested layout function.
- **Captions** — any font, colour, weight, and size; drag it anywhere on the
  photo, or use the quick 3×3 position grid. Captions are a pure overlay —
  resizing or moving one never changes the canvas size or shrinks the
  photo.
- **Bulk export** — a bounded worker pool renders and encodes photos in
  parallel (so a 500-photo batch uses the same peak memory as a 4-photo
  batch), with per-file error isolation, PNG/WebP/JPEG output, and
  filename templating (`{name}`, `{n}`, `{date}`, `{ext}`).
- **Verified lossless**: a default-recipe PNG export is checked
  pixel-for-pixel against the source decode as part of the engine's test
  suite — 0 differing channels, max delta 0.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) + **React 19** | One deployable for the UI and the (optional) AI route handler |
| Language | **TypeScript** | Strict mode across all three packages |
| Styling | **Tailwind CSS v4** | Dark, Lightroom-style theme via `@theme` tokens |
| State | **Zustand** | Sliced stores (catalog, recipe, export, UI) — dragging a slider never re-renders the filmstrip |
| Image processing | **WebGL2** (custom shader chain, assembled from a filter registry) | Real-time preview and full-resolution export use the exact same code path |
| Compositing | **Canvas 2D / OffscreenCanvas** | Frames and captions are drawing operations, not shaders |
| Concurrency | **Web Workers** (thumbnail pool + export pool) | Bulk work never blocks the UI thread or the GPU context |
| Virtualization | **TanStack Virtual** | Grid and filmstrip handle thousands of photos without DOM collapse |
| Local cache | **IndexedDB** via `idb` | Thumbnail cache, keyed by name+size+mtime |
| Validation | **Zod** | The entire edit "recipe" (filters/border/caption) is one validated, serializable object |
| Archiving | **fflate** | Client-side ZIP creation for the non-Chromium export fallback |
| AI (optional, currently disabled in the UI) | **Anthropic SDK** (`claude-haiku-4-5` / `claude-sonnet-5`) | Structured-output grammar/rewrite suggestions for captions |
| Monorepo | **npm workspaces** + **Turborepo** | Enforces the engine/UI/app boundary; `packages/engine` has zero React or Next.js imports |
| Testing | **Vitest** | Frame-layout geometry and lossless-export guarantees are tested as pure functions |

## Architecture

```
lightroom-like/
├── apps/web/                  Next.js app — editor UI, stores, workers
│   ├── app/                   Routes (editor page, /api/caption/assist)
│   ├── components/editor/     Shell, panels, canvas, export dialog
│   ├── lib/                   Catalog import, export runner, workers
│   └── stores/                Zustand stores
├── packages/engine/           Framework-agnostic image pipeline
│   └── src/
│       ├── recipe/            Zod schema + defaults for the edit recipe
│       ├── filters/           Filter registry — one file per filter
│       ├── frames/            Frame registry — one file per frame type
│       ├── caption/           Text layout, measurement, drawing
│       ├── render/            WebGL shader chain, compositor
│       ├── export/            Export renderer, format/filename helpers
│       └── presets/           Built-in + Fujifilm presets
└── packages/ui/                Shared design-system primitives
```

`packages/engine` never imports React or anything from `apps/web` — that
boundary is what makes it unit-testable headlessly and reusable outside the
web app.

### The core idea: everything is one serializable "recipe"

A photo's entire edit is a single JSON object (`EditRecipe`): filters,
border, and caption. Nothing in the pipeline mutates a photo outside of what
its recipe describes. That's what makes bulk-apply, presets, and (later)
undo/redo and cloud sync all reduce to moving one JSON object around, rather
than needing separate plumbing each.

### Registry pattern

Filters and frames are **registered plugins**, not switch statements — a new
filter or frame type is one new file, with no changes to the renderer or the
UI.

## Getting started

Requires Node 20+.

```bash
git clone https://github.com/gmsk8011/lightroom-like.git
cd lightroom-like
npm install
npm run dev
```

Open <http://localhost:3210>. Use Chrome or Edge for the full folder-based
workflow; other browsers work via the file-picker/ZIP fallback.

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) on port 3210 |
| `npm run build` | Production build of all workspaces |
| `npm start` | Serve the production build |
| `npm run typecheck` | Typecheck every workspace |
| `npm test` | Run the engine's Vitest suite |
| `npm run lint` | Lint all workspaces |

## Environment variables

None are required — the app works fully with zero configuration.

The AI caption-assist feature (`apps/web/app/api/caption/assist/route.ts`)
exists in the codebase but isn't wired into the UI. To use it, add it back to
`components/editor/panels/caption-panel.tsx` and set:

```bash
# apps/web/.env.local
ANTHROPIC_API_KEY=sk-ant-...
```

## Deploying

The app is almost entirely static/client-side — the only server code is the
(currently unused) AI route handler.

**Vercel** (recommended): import the repo, set the project root to
`apps/web`, and enable "Include files outside the root directory" so the
build can see the `packages/*` workspaces. No environment variables are
needed unless you re-enable the AI feature.

**Any static host**: since the AI route isn't in use, you can drop it and
add `output: "export"` to `next.config.ts` to deploy as pure static files to
Cloudflare Pages, Netlify, GitHub Pages, etc.

The `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers set
in `apps/web/next.config.ts` are required for future SharedArrayBuffer-based
work and are safe to keep on any host.

## Testing

```bash
npm test --workspace @lrl/engine
```

Covers frame-layout geometry (border math across extreme aspect ratios, for
every frame type) and is the basis for the lossless-export verification
described above.

## Status

Phases 0–6 of the build are complete (import, filters, borders, captions,
bulk export) and verified end-to-end in-browser. Not yet built: per-photo
recipes (a bulk export currently applies one recipe to every selected
photo), undo/redo, saved custom presets, and session persistence across page
reloads.
