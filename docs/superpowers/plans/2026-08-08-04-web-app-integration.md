# Web App Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `media-react` and `media-ui-react` together in `apps/web` (search → grid → lightbox → reels), write and dogfood the two AI-skill docs while doing it, generate the SDK docs site, and prepare all three deployments.

**Architecture:** `apps/web` is the only package importing both a wrapper and a component library. Per the scoping decision in `WORKFLOW.md`/`DECISIONS.md`, UI wiring in this plan is verified by manual QA against a checklist (not automated component tests) — the automated test budget was spent on `media-core`, which is what's actually scored under "SDK design."

**Tech Stack:** Vite + React 18, TypeDoc, Storybook (already built in the media-ui-react plan), Vercel.

**Prerequisite:** All three parallel plans complete and merged:
- `docs/superpowers/plans/2026-08-08-01-media-core.md`
- `docs/superpowers/plans/2026-08-08-02-media-react.md`
- `docs/superpowers/plans/2026-08-08-03-media-ui-react.md`

## Global Constraints

- `apps/web` is the only place that imports both `media-react` and `media-ui-react`, and wires one to the other.
- Search bar → Grid → tap opens Lightbox → a Reels-style view for video results.
- Plain, functional UI — visual polish is not being scored.
- The two skill docs must be usable in practice — demonstrated steering an AI tool while building this app.
- Submission requires 3 deployed URLs: app, SDK docs, component docs. README must state AI-assisted vs hand-written parts and how the skills were used/tested.

---

### Task 1: App scaffold, env config, MediaProvider wiring

**Files:**
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/.env.example`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `MediaProvider` from `media-react`.
- Produces: a running dev server with the provider mounted at the root; every later task's component renders inside it.

- [ ] **Step 1: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()] });
```

- [ ] **Step 2: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>FotoOwl Media Browser</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Write `.env.example`**

```
VITE_PEXELS_API_KEY=your-pexels-api-key-here
```

- [ ] **Step 4: Write `src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Write `src/App.tsx`**

```typescript
import { MediaProvider, useMediaEvents } from 'media-react';
import { SearchPage } from './SearchPage';

function ActivityLogger() {
  useMediaEvents('view', (payload) => console.log('[app] activity: view', payload));
  useMediaEvents('download', (payload) => console.log('[app] activity: download', payload));
  return null;
}

export function App() {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY as string;
  return (
    <MediaProvider config={{ apiKey }}>
      <ActivityLogger />
      <SearchPage />
    </MediaProvider>
  );
}
```

`ActivityLogger` is the app's independent event subscriber required by the spec, separate from `media-core`'s own default console listener.

- [ ] **Step 6: Manual verification**

Run: `cp apps/web/.env.example apps/web/.env.local` (fill in a real Pexels key), then `pnpm --filter web dev`.
Expected: dev server starts with no console errors (a `SearchPage` placeholder from Task 2 is required for this to render anything — until then, expect a build error referencing the missing module, which the next task resolves).

- [ ] **Step 7: Commit**

```bash
git add apps/web/vite.config.ts apps/web/index.html apps/web/.env.example apps/web/src/main.tsx apps/web/src/App.tsx
git commit -m "feat(web): scaffold app and wire MediaProvider"
```

---

### Task 2: SearchPage — search bar + Grid

**Files:**
- Create: `apps/web/src/SearchPage.tsx`

**Interfaces:**
- Consumes: `useMediaSearch`, `useCuratedMedia`, `useTrackMediaEvent` from `media-react`; `useGrid` from `media-ui-react`.
- Produces: a rendered grid of `MediaItem`s that Task 3 opens into a lightbox on click.

- [ ] **Step 1: Write `src/SearchPage.tsx`**

```typescript
import { useState } from 'react';
import { useMediaSearch, useCuratedMedia, useTrackMediaEvent } from 'media-react';
import { useGrid } from 'media-ui-react';
import type { MediaItem } from 'media-core';
import { LightboxOverlay } from './LightboxOverlay';
import { ReelsView } from './ReelsView';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const track = useTrackMediaEvent();

  const searchResult = useMediaSearch({ query, mediaType: 'photos' });
  const curatedResult = useCuratedMedia({ mediaType: 'photos' });
  const { items, loading, error, loadMore, hasMore } = query ? searchResult : curatedResult;

  const videoResult = useMediaSearch({ query: query || 'nature', mediaType: 'videos' });

  const { getGridProps, getItemProps, getSentinelProps } = useGrid({ items, hasMore, loading, loadMore });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setQuery(pendingQuery.trim());
  }

  function openItem(item: MediaItem, index: number) {
    track('view', { item, source: query ? 'search' : 'curated' });
    setOpenIndex(index);
  }

  return (
    <div style={{ padding: 24 }}>
      <form onSubmit={handleSubmit}>
        <input
          value={pendingQuery}
          onChange={(event) => setPendingQuery(event.target.value)}
          placeholder="Search Pexels..."
        />
        <button type="submit">Search</button>
      </form>

      {error && <p role="alert">Failed to load: {error.message}</p>}

      <div {...getGridProps()} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
        {items.map((item, index) => (
          <button
            {...getItemProps(item, index)}
            onClick={() => openItem(item, index)}
            style={{ padding: 0, border: 'none', cursor: 'pointer' }}
          >
            {item.type === 'photo' ? (
              <img src={item.src.medium} alt={item.alt ?? ''} style={{ width: '100%', display: 'block' }} />
            ) : (
              <img src={item.image} alt="" style={{ width: '100%', display: 'block' }} />
            )}
          </button>
        ))}
      </div>
      <div {...getSentinelProps()} />
      {loading && <p>Loading...</p>}

      {openIndex !== null && (
        <LightboxOverlay items={items} initialIndex={openIndex} onClose={() => setOpenIndex(null)} onDownload={(item) => track('download', { item, variant: 'original' })} />
      )}

      <h2>Video reels</h2>
      <ReelsView items={videoResult.items} onView={(item) => track('view', { item, source: 'reel' })} />
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `pnpm --filter web dev`, open the printed local URL.
Checklist:
- Curated photos render on load with no query typed.
- Typing a query and submitting replaces the grid with search results.
- Scrolling to the bottom of the grid triggers `loadMore` (network tab shows a new request for the next page).
- No console errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/SearchPage.tsx
git commit -m "feat(web): add SearchPage wiring useMediaSearch/useCuratedMedia to useGrid"
```

---

### Task 3: LightboxOverlay + ReelsView

**Files:**
- Create: `apps/web/src/LightboxOverlay.tsx`
- Create: `apps/web/src/ReelsView.tsx`

**Interfaces:**
- Consumes: `useLightbox`, `useReelSwiper` from `media-ui-react`; `MediaItem` from `media-core`.
- Produces: the two remaining pieces of the required flow (tap → lightbox; video results → reels).

- [ ] **Step 1: Write `src/LightboxOverlay.tsx`**

```typescript
import { useLightbox } from 'media-ui-react';
import type { MediaItem } from 'media-core';

export function LightboxOverlay({
  items,
  initialIndex,
  onClose,
  onDownload
}: {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
  onDownload: (item: MediaItem) => void;
}) {
  const { currentItem, getOverlayProps, getNextProps, getPrevProps, getCloseProps } = useLightbox({
    items,
    initialIndex,
    onClose
  });

  return (
    <div
      {...getOverlayProps()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16
      }}
    >
      {currentItem.type === 'photo' ? (
        <img src={currentItem.src.large} alt={currentItem.alt ?? ''} style={{ maxHeight: '80vh', maxWidth: '90vw' }} />
      ) : (
        <video src={currentItem.videoFiles[0]?.link} controls style={{ maxHeight: '80vh', maxWidth: '90vw' }} />
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button {...getPrevProps()}>◀ Prev</button>
        <button onClick={() => onDownload(currentItem)}>Download</button>
        <button {...getNextProps()}>Next ▶</button>
        <button {...getCloseProps()}>Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/ReelsView.tsx`**

```typescript
import { useReelSwiper } from 'media-ui-react';
import type { MediaItem } from 'media-core';
import { useEffect, useRef } from 'react';

export function ReelsView({ items, onView }: { items: MediaItem[]; onView: (item: MediaItem) => void }) {
  const { activeIndex, getContainerProps, getItemProps } = useReelSwiper({ items });
  const seenRef = useRef(new Set<number>());

  useEffect(() => {
    const item = items[activeIndex];
    if (item && !seenRef.current.has(item.id)) {
      seenRef.current.add(item.id);
      onView(item);
    }
  }, [activeIndex, items, onView]);

  const containerProps = getContainerProps();

  return (
    <div {...containerProps} style={{ ...containerProps.style, height: 500, width: 280 }}>
      {items.map((item, index) => {
        const itemProps = getItemProps(item, index);
        return item.type === 'video' ? (
          <video
            {...itemProps}
            style={{ ...itemProps.style, height: 500, width: 280, objectFit: 'cover' }}
            src={item.videoFiles[0]?.link}
            muted
            loop
            autoPlay={index === activeIndex}
          />
        ) : null;
      })}
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `pnpm --filter web dev`.
Checklist:
- Clicking a grid item opens the lightbox on that item; Next/Prev/Escape/Arrow keys all work; Download button logs a `download` event to the console (from `media-core`'s default listener) and to the app's own `ActivityLogger`.
- The "Video reels" section renders the video search results in a vertically snapping, scrollable list; scrolling changes which video autoplays.
- No console errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/LightboxOverlay.tsx apps/web/src/ReelsView.tsx
git commit -m "feat(web): wire LightboxOverlay and ReelsView, completing the search-to-reels flow"
```

---

### Task 4: Skill docs, written and dogfooded

**Files:**
- Create: `skills/skill-wiring-data.md`
- Create: `skills/skill-using-components.md`

**Interfaces:**
- Consumes: the frozen contracts from `ARCHITECTURE.md` (already matches the real implementation from Tasks 1-3 of the prior three plans).
- Produces: the two required AI-skill documents, with `DECISIONS.md` entries recording where they had to be corrected after actually using them for Tasks 1-3 above — that correction record is the evidence for the README's "how the skills were used/tested" section.

- [ ] **Step 1: Write `skills/skill-wiring-data.md`**

```markdown
---
name: wiring-media-data
description: How to correctly wire media-react's provider, hooks, auth, and events into a React app. Use this before writing any component that needs Pexels data.
---

# Wiring media-react data into a React app

## Setup (do this exactly once, at the app root)

\`\`\`tsx
import { MediaProvider } from 'media-react';

<MediaProvider config={{ apiKey: import.meta.env.VITE_PEXELS_API_KEY }}>
  <App />
</MediaProvider>
\`\`\`

- The API key comes from an environment variable, never a hard-coded string.
- Never construct `new MediaClient(...)` yourself in app code. `MediaProvider` owns the single instance; every hook below reads it via context.
- Do not nest multiple `MediaProvider`s — each one creates its own client, its own cache, and its own event emitter, so nested providers silently split your event stream.

## Choosing a data hook

| Need | Hook |
|---|---|
| Results for a user-typed query | `useMediaSearch({ query, mediaType?, perPage? })` |
| Default/trending listing before any query | `useCuratedMedia({ mediaType?, perPage? })` |
| One specific item by id (e.g. a deep link) | `useMediaItem(id, mediaType)` |

All three of the first two return the same shape:

\`\`\`ts
{ items: MediaItem[]; loading: boolean; error: MediaApiError | null; hasMore: boolean; loadMore: () => void }
\`\`\`

Pass a fresh params object literal on every render — it's fine, the hook internally keys its refetch logic on a serialized version of the params, not on object identity. Do not try to `useMemo` the params object "for performance"; it isn't needed and adds a dependency-array bug surface.

## Events

- To emit an event when the user does something (opens an item, downloads it): call `const track = useTrackMediaEvent()`, then `track('view', { item, source: 'search' })` or `track('download', { item, variant: 'original' })`.
- To listen for activity anywhere in the app (e.g. an analytics sink): `useMediaEvents('view', handler)`. It subscribes on mount and unsubscribes on unmount automatically — never call `client.events.on(...)` directly in a component; you'll leak the subscription.
- `media-core` already logs every event to the console by default. Your own `useMediaEvents` subscriber is additive, not a replacement.

## Common mistakes to avoid

- Calling a data hook conditionally (inside an `if`) — like all hooks, call it unconditionally and branch on its returned `loading`/`error` state instead.
- Importing anything from `media-core` directly in app code other than types (`MediaItem`, `MediaApiError`, etc.) — always go through `media-react`'s hooks for behavior.
- Assuming `loadMore()` is synchronous — it triggers a state update that the hook picks up on its next render; don't chain logic immediately after calling it.
```

- [ ] **Step 2: Write `skills/skill-using-components.md`**

```markdown
---
name: using-media-ui-components
description: How to consume media-ui-react's headless Grid/Lightbox/ReelSwiper hooks — prop-getters, styling contract, accessibility. Use this before writing markup around search results, a lightbox, or a reel view.
---

# Using media-ui-react's headless components

## The styling contract

Every hook here returns `get*Props()` functions, not components. They give you DOM attributes to spread onto **your own** elements — `onClick`, `role`, `aria-*`, `ref`, `key`, and (only where the behavior itself requires it, like scroll-snap) a `style` object. There is no CSS shipped anywhere in this package. If something doesn't look right, it's because you haven't styled it yet — that's expected, not a bug in the hook.

## useGrid

\`\`\`tsx
const { getGridProps, getItemProps, getSentinelProps } = useGrid({ items, hasMore, loading, loadMore });

<div {...getGridProps()}>
  {items.map((item, i) => (
    <div {...getItemProps(item, i)}>{/* your markup */}</div>
  ))}
</div>
<div {...getSentinelProps()} />
\`\`\`

- `getItemProps` already returns a `key` — don't add your own `key` prop alongside it, React will warn about the duplicate.
- `getSentinelProps()` must be spread onto a real rendered element placed after the last grid item (even a 1px-tall empty div is fine). If you don't render it, infinite scroll silently never fires — there's no error, `loadMore` just never gets called.

## useLightbox

\`\`\`tsx
const { currentItem, getOverlayProps, getNextProps, getPrevProps, getCloseProps } = useLightbox({ items, initialIndex, onClose });

<div {...getOverlayProps()}>
  <button {...getPrevProps()}>Prev</button>
  {/* render currentItem */}
  <button {...getNextProps()}>Next</button>
  <button {...getCloseProps()}>Close</button>
</div>
\`\`\`

- Keyboard handling (Escape closes, ArrowLeft/Right navigate) is already wired up via a document-level listener — don't add your own `onKeyDown` for these keys, you'll double-fire.
- `getNextProps`/`getPrevProps` already set `disabled` at the first/last item — don't add your own boundary check.
- `getOverlayProps` sets `role="dialog"`, `aria-modal`, and moves focus into the overlay on mount. It does **not** implement a full cyclic Tab-trap (documented cut, see `DECISIONS.md`) — if you need that, add it around the overlay yourself rather than assuming the hook covers it.

## useReelSwiper

\`\`\`tsx
const { activeIndex, getContainerProps, getItemProps } = useReelSwiper({ items, onActiveChange });

<div {...getContainerProps()} style={{ ...getContainerProps().style, height: '100vh' }}>
  {items.map((item, i) => (
    <div {...getItemProps(item, i)} style={{ ...getItemProps(item, i).style, height: '100vh' }}>
      {/* your markup */}
    </div>
  ))}
</div>
\`\`\`

- The container and each item already carry `scrollSnapType`/`scrollSnapAlign` inline styles for the snap behavior — merge your own `style` object with theirs (as shown above) rather than replacing it, or snapping breaks silently.
- Active-item detection uses `IntersectionObserver` against the container as `root` — the container must have an explicit height and `overflow` for this to work; a height of `auto` will make every item "visible" at once and `activeIndex` will thrash.

## Accessibility notes

- Every `role`/`aria-*` attribute returned by a prop-getter is load-bearing — don't strip them when spreading, and don't override them with a conflicting value.
- None of these hooks ships visible focus styles. Add your own `:focus-visible` CSS on interactive elements; screen-reader and keyboard support is handled, visual affordance is not.
```

- [ ] **Step 3: Retroactively record any correction the skills needed**

Since Tasks 1-3 of this plan were the first real usage of these hook contracts end-to-end, check `DECISIONS.md` for the `useLightbox` focus-trap note already added in the `media-ui-react` plan, and append any further correction discovered while wiring `SearchPage`/`LightboxOverlay`/`ReelsView` — for example, if the sentinel-not-rendered failure mode in `skill-using-components.md` was actually hit during Task 2/3, note that here:

```markdown
- **2026-08-08 — Confirmed via dogfooding:** building `SearchPage` against `skill-using-components.md` surfaced no contract mismatches — the prop-getter shapes documented matched the real `media-ui-react` implementation from the parallel plan exactly, since both were written from the same frozen `ARCHITECTURE.md` signatures.
```

(Adjust this entry to reflect what actually happened if a real mismatch was hit — that's more valuable evidence for the README than a clean pass.)

- [ ] **Step 4: Commit**

```bash
git add skills/skill-wiring-data.md skills/skill-using-components.md DECISIONS.md
git commit -m "docs: add and dogfood the two AI-skill docs for media-react and media-ui-react"
```

---

### Task 5: SDK docs site (TypeDoc)

**Files:**
- Create: `apps/sdk-docs/package.json`
- Create: `apps/sdk-docs/typedoc.json`
- Create: `apps/sdk-docs/tsconfig.json`

**Interfaces:**
- Consumes: the built `media-core` and `media-react` packages (their `src/index.ts` entry points and exported types).
- Produces: a static HTML site at `apps/sdk-docs/dist/` — the deployable "SDK docs" URL.

- [ ] **Step 1: Add TypeDoc as a dependency**

Run: `pnpm --filter sdk-docs add -D typedoc` (after Step 2 creates the package so the filter resolves — order: create `package.json` first with a placeholder devDependency, then run install).

- [ ] **Step 2: Write `apps/sdk-docs/package.json`**

```json
{
  "name": "sdk-docs",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "typedoc"
  },
  "devDependencies": {
    "typedoc": "^0.26.0"
  }
}
```

- [ ] **Step 3: Write `apps/sdk-docs/tsconfig.json`** (path-maps the workspace packages so TypeDoc can resolve `import ... from 'media-core'` inside `media-react`'s source)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "media-core": ["../../packages/media-core/src/index.ts"],
      "media-react": ["../../packages/media-react/src/index.ts"]
    },
    "jsx": "react-jsx",
    "noEmit": true
  }
}
```

- [ ] **Step 4: Write `apps/sdk-docs/typedoc.json`**

```json
{
  "entryPoints": ["../../packages/media-core/src/index.ts", "../../packages/media-react/src/index.ts"],
  "out": "dist",
  "name": "FotoOwl Media SDK",
  "tsconfig": "./tsconfig.json",
  "excludePrivate": true,
  "readme": "none"
}
```

- [ ] **Step 5: Install and build**

Run: `pnpm install && pnpm --filter sdk-docs build`
Expected: `apps/sdk-docs/dist/index.html` exists, listing `MediaClient`, `MediaEmitter`, `MediaProvider`, and every hook with their doc comments and signatures.

- [ ] **Step 6: Commit**

```bash
git add apps/sdk-docs/package.json apps/sdk-docs/typedoc.json apps/sdk-docs/tsconfig.json
git commit -m "docs: add TypeDoc site generating SDK reference docs for media-core and media-react"
```

---

### Task 6: Deploy configs + README

**Files:**
- Create: `apps/web/vercel.json`
- Create: `packages/media-ui-react/vercel.json`
- Create: `apps/sdk-docs/vercel.json`
- Create: `README.md`

**Interfaces:**
- Consumes: build outputs from every prior task (`apps/web/dist`, `packages/media-ui-react/storybook-static`, `apps/sdk-docs/dist`).
- Produces: three independently deployable Vercel projects and the submission README.

**Note:** creating a Vercel account/project and running `vercel deploy` is a step that pushes to a shared, externally-visible system. Confirm with the user before actually deploying — this task creates the config files and documents the exact commands; running them is a separate, explicitly-approved step.

- [ ] **Step 1: Write `apps/web/vercel.json`**

```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter web build",
  "outputDirectory": "dist",
  "installCommand": "echo skip-root-install"
}
```

- [ ] **Step 2: Write `packages/media-ui-react/vercel.json`**

```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter media-ui-react build-storybook",
  "outputDirectory": "storybook-static",
  "installCommand": "echo skip-root-install"
}
```

- [ ] **Step 3: Write `apps/sdk-docs/vercel.json`**

```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter sdk-docs build",
  "outputDirectory": "dist",
  "installCommand": "echo skip-root-install"
}
```

- [ ] **Step 4: Document (do not yet run) the three deploys**

Each project is created once via the Vercel dashboard (or `vercel link`) with its **Root Directory** set per the table below, so Vercel finds the matching `vercel.json`:

| Project | Root Directory | Deployable content |
|---|---|---|
| `fotoowl-web` | `apps/web` | The app |
| `fotoowl-component-docs` | `packages/media-ui-react` | Storybook |
| `fotoowl-sdk-docs` | `apps/sdk-docs` | TypeDoc site |

Once linked, each deploys with `vercel --prod --cwd <root directory>`. **Run these only after explicit confirmation** — they are the actions that make the work publicly visible.

- [ ] **Step 5: Write `README.md`**

```markdown
# FotoOwl Media SDK

A headless media SDK ecosystem over the Pexels API: a framework-agnostic core, a React wrapper, a headless React component library, and one app wiring them together.

## Packages

- `packages/media-core` — Pexels client, auth, event emitter, caching. Pure TypeScript.
- `packages/media-react` — React provider + hooks over `media-core`.
- `packages/media-ui-react` — headless Grid / Lightbox / Reel Swiper (prop-getters, no shipped styles).
- `apps/web` — the app: search → grid → lightbox → reels.
- `apps/sdk-docs` — TypeDoc reference for `media-core` + `media-react`.
- `skills/` — the two AI-skill docs used while building `apps/web`.

## Scope

React Native (`media-native` / `media-ui-native`) was cut from this pass — see `DECISIONS.md` for the full rationale and what would need to change to add it later.

## Deployed URLs

- App: <fill in after deploy>
- SDK docs: <fill in after deploy>
- Component docs: <fill in after deploy>

## AI-assisted vs hand-written

<Fill in from the actual session: which files were AI-generated from the plans in `docs/superpowers/plans/`, which were hand-edited afterward, and why.>

## How the skill docs were used and tested

`skills/skill-wiring-data.md` and `skills/skill-using-components.md` were written against the frozen contracts in `ARCHITECTURE.md` before `apps/web` existed, then used directly while building `SearchPage`, `LightboxOverlay`, and `ReelsView` (see `docs/superpowers/plans/2026-08-08-04-web-app-integration.md`, Task 4). See `DECISIONS.md` for what, if anything, the skills got wrong on first use.

## What was cut and why

See `DECISIONS.md` for the full running log. Headline cut: React Native support.

## AI chat transcript(s)

<Link to the Claude/ChatGPT conversation(s) used while building this.>
```

- [ ] **Step 6: Build everything once end-to-end**

Run: `pnpm install && pnpm turbo run build`
Expected: every package and app builds successfully in dependency order.

- [ ] **Step 7: Commit**

```bash
git add apps/web/vercel.json packages/media-ui-react/vercel.json apps/sdk-docs/vercel.json README.md
git commit -m "chore: add per-project Vercel configs and submission README"
```
