# Build Workflow — Headless Media SDK + Component Library

**Goal:** Ship all five deliverables (core SDK, wrappers, headless component libs, app, 2 skill docs) within an 8–12 hr budget by freezing contracts early and building independent layers in parallel.

**Approach in one line:** Contracts-first → parallel subagent build across core / wrappers / components → integrate in the app → dogfood the skill docs while doing it → docs + deploy last.

## Global constraints (carried from the spec, apply to every phase)

- Dependency direction is one-way: `app → wrappers → core` and `app → components`. Wrappers never import components or vice versa. Components never import core. Core imports neither.
- `media-core` is pure TypeScript — no React, no React Native, no DOM.
- Wrappers contain no business logic — adapters only.
- Components are headless — prop-getters/hooks, no shipped styles, no knowledge of Pexels or the SDK.
- 3 deployed URLs required at the end: app, SDK docs, component docs.
- README must state which parts were AI-assisted vs hand-written, and how the two skill docs were used/tested.

## Phase 0 — Repo scaffold (~30 min)

1. `pnpm init` + `pnpm-workspace.yaml` covering `packages/*` and `apps/*`.
2. Turborepo (`turbo.json`) with pipeline tasks: `build`, `dev`, `test`, `lint`, `typecheck` — each package declares its own scripts, Turborepo just orders/caches them.
3. Shared root configs: `tsconfig.base.json`, ESLint, Prettier. Each package extends the base tsconfig.
4. Empty package skeletons created for all six packages/app (see ARCHITECTURE.md for the tree) so path aliases resolve from step 1 onward — nobody in Phase 2 is blocked waiting for a package to exist.
5. Start a `DECISIONS.md` at repo root — one line per non-obvious choice, appended live during every later phase, not reconstructed afterward. This is what feeds the README's "what was cut and why."

## Phase 1 — Freeze contracts (~45–60 min, no implementation yet)

This is the phase that makes parallel building possible without integration blowing up. Write, in full, and commit before any implementation:

- `packages/media-core/src/types.ts` — `MediaItem`, `Photo`, `Video`, `SearchParams`, `PaginatedResponse<T>`, `MediaEventName`, `MediaEventPayload`.
- The `MediaClient` public method signatures (search, curated, getById, config/init) — signatures only, throw-not-implemented bodies.
- The `MediaEmitter` public interface (`on`, `off`, `emit`) — signatures only.
- `media-react` hook signatures and the `MediaProvider` props — names and return shapes decided now, not discovered mid-build.
- `media-ui-react` component prop interfaces and prop-getter return shapes for Grid, Lightbox, ReelSwiper.

Exact signatures are in `ARCHITECTURE.md`. Nothing here is aspirational — every downstream task reads types from these files, it doesn't guess them.

## Phase 2 — Parallel build (~3–4 hrs, the time-saving core of this workflow)

**Scope decision (see `DECISIONS.md`): web track only.** `media-native` / `media-ui-native` are cut from this implementation pass — the app deliverable is React web per the spec, and building both platforms in the same budget would thin every layer. Native is not started, not stubbed; it's a documented omission.

Once Phase 1 is committed, fan out three independent tracks — as three parallel subagent tasks or three focused work sessions, since none of them needs the others' implementation, only their already-frozen types:

| Track | Package(s) | Depends on from Phase 1 | Notes |
|---|---|---|---|
| A | `media-core` | its own frozen types | Pexels API client, auth/config, event emitter, in-memory cache/de-dupe, error handling |
| B | `media-react` | `media-core`'s **types only** (not its implementation) | Build the wrapper against the type contracts; swap in the real `media-core` import once Track A lands — a type-only dependency means this doesn't block |
| C | `media-ui-react` | its own frozen prop interfaces | Fully independent — components never import core or wrappers, so this track never waits on A or B |

Each track ends with its own unit/manual test pass before merging back, not a shared integration test — that comes in Phase 3.

## Phase 3 — Integration (~1–1.5 hrs)

1. Merge Tracks A/B/C. Fix any drift between what Track B assumed and what Track A actually shipped (this is the one place rework can happen — keep Phase 1 signatures tight to minimize it).
2. Build `apps/web` (Vite + React): search bar → Grid → Lightbox on click → Reels view for video results. This is the only file that imports both `media-react` and `media-ui-react`.
3. Wire the default event listener (logs `download`/`view`) plus one independent app-level subscriber, per the spec's event requirement.

## Phase 4 — Skill docs, written and dogfooded (~45 min, overlaps Phase 3)

1. Draft `skill-wiring-data.md` (provider setup, hooks, auth, events) and `skill-using-components.md` (prop-getters, styling contract, a11y) as soon as Phase 1's contracts exist — the signatures are already final, so the skills can be accurate before the app is built.
2. Actually invoke these skills while building `apps/web` in Phase 3, rather than writing the app by hand and the skills afterward. Note in `DECISIONS.md` any place a skill's guidance was wrong or had to be corrected — that correction is the evidence the skill was genuinely load-bearing, and it's exactly what the README needs to cite.

## Phase 5 — Tests (~45 min)

- Unit tests on `media-core` only: auth/config handling, event emitter subscribe/unsubscribe/emit, cache/de-dupe behavior, pagination cursor logic. This is the layer actually scored under "SDK design" — spend the test budget here, not spread thin.
- No automated tests for UI packages; manual QA via Storybook (Phase 6) and the running app. Record this cut in `DECISIONS.md`.

## Phase 6 — Docs (~45 min)

- Storybook for `media-ui-react`, covering Grid/Lightbox/ReelSwiper in their headless form with a minimal example implementation supplied in stories (since the library ships no styles). This doubles as the deployable "component docs" URL.
- TypeDoc (or `api-extractor`) over `media-core` + `media-react` for the "SDK docs" URL — generated from the types/JSDoc already written in Phase 1, not authored fresh.

## Phase 7 — Deploy (~30 min)

Three Vercel projects from the one monorepo, each with a different root directory:

1. `apps/web` → the app URL.
2. `packages/media-ui-react` (Storybook build) → component docs URL.
3. TypeDoc output (built as a static site, e.g. from a small `apps/docs` or a build script output dir) → SDK docs URL.

## Phase 8 — README (~20–30 min)

Write last, from `DECISIONS.md` plus the git history — not from memory. Cover: architecture summary, what's AI-assisted vs hand-written, how the two skills were used and where they had to be corrected, what was cut under time pressure and why, links to the three deployed URLs and the AI chat transcript(s).

## Rough time budget

| Phase | Time |
|---|---|
| 0. Scaffold | 0.5 hr |
| 1. Contracts | 0.75 hr |
| 2. Parallel build | 3.5 hr |
| 3. Integration | 1.25 hr |
| 4. Skill docs (overlaps 3) | 0.5 hr |
| 5. Tests | 0.75 hr |
| 6. Docs | 0.75 hr |
| 7. Deploy | 0.5 hr |
| 8. README | 0.5 hr |
| **Total** | **~9 hr** |

Fits inside the suggested 8–12 hr window with slack for the inevitable Phase 3 drift-fixing.
