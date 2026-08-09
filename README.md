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

- App: `<TODO: fill in after running `vercel --prod --cwd apps/web``>`
- SDK docs: `<TODO: fill in after running `vercel --prod --cwd apps/sdk-docs``>`
- Component docs: `<TODO: fill in after running `vercel --prod --cwd packages/media-ui-react``>`

## AI-assisted vs hand-written

Every line of code in this repository was produced by AI, end to end, using Claude Code's `superpowers:subagent-driven-development` workflow — there is no hand-written code outside this process. All five implementation plans (`repo-scaffold`, `media-core`, `media-react`, `media-ui-react`, `web-app-integration`) were executed the same way: each task in a plan was handed to a fresh AI implementer subagent as a self-contained written brief (see `.superpowers/sdd/*/task-*-brief.md`), and the resulting diff was then independently checked by a separate AI reviewer subagent against two criteria — spec compliance against the brief, and code quality — before being accepted into the branch (see the `review-*.diff` files and `progress.md` ledger under each plan's `.superpowers/sdd/` directory).

This wasn't a rubber-stamp process: the review step caught and fixed several real bugs before acceptance, for example:

- **Wrong Pexels API endpoint paths** in `media-core`'s `search()` — the implementer's first pass hit incorrect paths; the reviewer flagged it and the fix landed with added `search()`/`getById()` test coverage (`media-core` Task 4).
- **A `hasMore`/error-state inconsistency** in `useMediaSearch` — `hasMore` wasn't gated on `error === null`, so a failed page fetch could still report more pages available. Fixed by gating `hasMore` on the error state (`media-react` Task 2).
- **A production-code `flushSync` misuse** in `useReelSwiper` — the implementer had reached for `flushSync` to force a synchronous re-render, which would have hurt scroll performance in production. The reviewer had it reverted from the hook and the affected test fixed with `act()` instead (`media-ui-react` Task 3).
- **A stale-lightbox-index crash risk** in the web app — `useLightbox`'s `currentIndex` wasn't reconciled when the underlying `items` array shrank (e.g. submitting a new, shorter search while the lightbox was open), which could crash on `currentItem.type`. Fixed by having `SearchPage` close the lightbox on every new search submission (`web-app-integration` Task 3).
- **Two real mismatches caught during skill-doc dogfooding** — writing `skills/skill-wiring-data.md` and `skills/skill-using-components.md` against the already-built code (rather than from memory) surfaced (1) a doc claim that all three data hooks share one return shape, when `useMediaItem` actually returns a distinct, non-paginated shape, and (2) the stale-lightbox-index gotcha above, which was added to the skill doc as an explicit caution for future consumers (`web-app-integration` Task 4).

Full detail on every fix round is in each plan's `progress.md` ledger and the corresponding `review-*.diff` files under `.superpowers/sdd/`.

## How the skill docs were used and tested

`skills/skill-wiring-data.md` and `skills/skill-using-components.md` were written against the frozen contracts in `ARCHITECTURE.md` before `apps/web` existed, then used directly while building `SearchPage`, `LightboxOverlay`, and `ReelsView` (see `docs/superpowers/plans/2026-08-08-04-web-app-integration.md`, Task 4). See `DECISIONS.md` for what, if anything, the skills got wrong on first use.

## What was cut and why

Full running log in `DECISIONS.md`. Headline items:

- **React Native support** (`media-native` / `media-ui-native`) was cut entirely for this pass — the spec's app deliverable is React web, and building both platforms in the same ~9hr budget would have thinned every layer rather than delivering two solid ones. `media-core`'s API and `media-ui-react`'s prop-getter shapes were designed so a native wrapper/component pair could be added later without changing either. Confirmed with the requester before starting.
- **`useLightbox` ships a simplified focus model, not a full cyclic focus trap.** Focus moves into the dialog on open and Escape/Arrow keys work via a document-level listener, but Tab does not wrap from the last focusable element back to the first. Cut for time; the prop-getter shape (`getOverlayProps` returning `ref`/`role`/`aria-modal`/`tabIndex`) doesn't need to change to add full trap cycling later.
- **Dogfooding the two skill docs against the finished code** (rather than writing them from memory) turned up one real documentation mismatch and one real runtime gotcha, both corrected — see the "AI-assisted vs hand-written" section above and `DECISIONS.md` for the full write-up.

## AI chat transcript(s)

- `<TODO: link to the Claude Code conversation(s) used while building this>`

## Building and deploying

Build everything in dependency order:

```bash
pnpm install && pnpm turbo run build
```

Each of `apps/web`, `packages/media-ui-react` (Storybook), and `apps/sdk-docs` (TypeDoc) has its own `vercel.json` and is deployed as an independent Vercel project. Create each project once (via the dashboard or `vercel link`) with its **Root Directory** set per the table below, so Vercel finds the matching `vercel.json`:

| Project | Root Directory | Deployable content |
|---|---|---|
| `fotoowl-web` | `apps/web` | The app |
| `fotoowl-component-docs` | `packages/media-ui-react` | Storybook |
| `fotoowl-sdk-docs` | `apps/sdk-docs` | TypeDoc site |

Once linked, each deploys with:

```bash
vercel --prod --cwd <root directory>
```

These commands are documented here but have **not** been run as part of this task — deploying pushes to a shared, externally-visible system and requires the account owner's own Vercel login and explicit go-ahead.
