---
name: wiring-media-data
description: How to correctly wire media-react's provider, hooks, auth, and events into a React app. Use this before writing any component that needs Pexels data.
---

# Wiring media-react data into a React app

## Setup (do this exactly once, at the app root)

```tsx
import { MediaProvider } from 'media-react';

<MediaProvider config={{ apiKey: import.meta.env.VITE_PEXELS_API_KEY }}>
  <App />
</MediaProvider>
```

- The API key comes from an environment variable, never a hard-coded string.
- Never construct `new MediaClient(...)` yourself in app code. `MediaProvider` owns the single instance; every hook below reads it via context.
- Do not nest multiple `MediaProvider`s — each one creates its own client, its own cache, and its own event emitter, so nested providers silently split your event stream.

## Choosing a data hook

| Need | Hook |
|---|---|
| Results for a user-typed query | `useMediaSearch({ query, mediaType?, perPage? })` |
| Default/trending listing before any query | `useCuratedMedia({ mediaType?, perPage? })` |
| One specific item by id (e.g. a deep link) | `useMediaItem(id, mediaType)` |

The first two return the same shape:

```ts
{ items: MediaItem[]; loading: boolean; error: MediaApiError | null; hasMore: boolean; loadMore: () => void }
```

`useMediaItem` does **not** return this shape — it's not paginated. It returns a single item:

```ts
{ item: MediaItem | null; loading: boolean; error: MediaApiError | null }
```

There's no `items`, `hasMore`, or `loadMore` on it — don't destructure those from `useMediaItem`.

Pass a fresh params object literal on every render — it's fine, the hook internally keys its refetch logic on a serialized version of the params, not on object identity. Do not try to `useMemo` the params object "for performance"; it isn't needed and adds a dependency-array bug surface.

## Events

- To emit an event when the user does something (opens an item, downloads it): call `const track = useTrackMediaEvent()`, then `track('view', { item, source: 'search' })` or `track('download', { item, variant: 'original' })`.
- To listen for activity anywhere in the app (e.g. an analytics sink): `useMediaEvents('view', handler)`. It subscribes on mount and unsubscribes on unmount automatically — never call `client.events.on(...)` directly in a component; you'll leak the subscription.
- `media-core` already logs every event to the console by default. Your own `useMediaEvents` subscriber is additive, not a replacement.

## Common mistakes to avoid

- Calling a data hook conditionally (inside an `if`) — like all hooks, call it unconditionally and branch on its returned `loading`/`error` state instead.
- Importing anything from `media-core` directly in app code other than types (`MediaItem`, `MediaApiError`, etc.) — always go through `media-react`'s hooks for behavior.
- Assuming `loadMore()` is synchronous — it triggers a state update that the hook picks up on its next render; don't chain logic immediately after calling it.
- Holding onto stale indices into a hook's `items` array across a param change. `useMediaSearch`/`useCuratedMedia` reset `items` to `[]` and refetch page 1 whenever their params change (e.g. a new search query), so any index you derived from the previous `items` (for example, an open lightbox's `currentIndex`) can point past the end of the new, shorter array. Reset or close anything keyed off an old index when you change the params that produced it.
