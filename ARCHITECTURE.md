# Architecture — Headless Media SDK + Component Library

**Goal:** A framework-agnostic media SDK, thin platform wrappers, headless per-platform component libraries, and one app that wires a wrapper to a component library — with a strict, enforced one-way dependency graph.

**Tech stack:** TypeScript throughout · pnpm workspaces + Turborepo · React (web) + React Native (native) · Vite for `apps/web` · Vitest for unit tests · Storybook for `media-ui-react` docs · TypeDoc for SDK docs · Pexels REST API.

**Scope:** web track only for this implementation pass — `media-native`/`media-ui-native` are a documented cut, not a stub (see `DECISIONS.md`). Everything below describes the web track; the wrapper/component contracts are written so a native pair could be added later against the same `media-core` and the same prop-getter shapes without changing either.

## Package layout

```
fotoowl/
├── packages/
│   ├── media-core/          # pure TS, zero UI, zero platform imports
│   ├── media-react/         # React wrapper — imports media-core only
│   └── media-ui-react/      # headless React components — imports neither core nor wrappers
├── apps/
│   └── web/                 # imports media-react AND media-ui-react; the only place that does
├── skills/
│   ├── skill-wiring-data.md
│   └── skill-using-components.md
├── DECISIONS.md
├── WORKFLOW.md
└── ARCHITECTURE.md
```

## Dependency graph (enforced, not just documented)

```
        media-core
           ▲
           │
      media-react
           ▲
           │
      apps/web
           ▲
           │
  media-ui-react   (no arrow into core or the wrapper — standalone)
           ▲
           │
      apps/web
```

- `media-core`: no incoming knowledge of React, no outgoing imports of anything platform-specific.
- `media-react`: imports `media-core` only. No component-library import, no business logic beyond adaptation (mapping core state/events to hooks/props).
- `media-ui-react`: imports neither core nor the wrapper. Pure functions of props → render output / prop-getters.
- `apps/web`: the single package permitted to import both the wrapper and the component library.

Enforcement: ESLint `no-restricted-imports` per package (e.g. `media-ui-react`'s config blocks any import path containing `media-core` or `media-react`), checked in CI/`turbo run lint`.

## `media-core`

### Types (`packages/media-core/src/types.ts`)

```typescript
export interface MediaConfig {
  apiKey: string;
  baseUrl?: string; // defaults to https://api.pexels.com/v1 (photos) / /videos
}

export interface Photo {
  id: number;
  type: 'photo';
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: { original: string; large: string; medium: string; small: string; tiny: string };
  alt: string | null;
}

export interface Video {
  id: number;
  type: 'video';
  width: number;
  height: number;
  duration: number;
  image: string; // poster frame
  videoFiles: { id: number; quality: string; width: number; height: number; link: string }[];
}

export type MediaItem = Photo | Video;

export interface SearchParams {
  query: string;
  page?: number;
  perPage?: number;
  mediaType?: 'photos' | 'videos';
}

export interface CuratedParams {
  page?: number;
  perPage?: number;
  mediaType?: 'photos' | 'videos';
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalResults: number;
  nextPage: number | null;
}

export type MediaEventName = 'view' | 'download';

export interface MediaEventPayload {
  view: { item: MediaItem; source: 'search' | 'curated' | 'lightbox' | 'reel' };
  download: { item: MediaItem; variant: string };
}
```

### Client (`packages/media-core/src/media-client.ts`)

```typescript
export class MediaClient {
  constructor(config: MediaConfig);

  search(params: SearchParams): Promise<PaginatedResponse<MediaItem>>;
  curated(params?: CuratedParams): Promise<PaginatedResponse<MediaItem>>;
  getById(id: number, mediaType: 'photo' | 'video'): Promise<MediaItem>;

  readonly events: MediaEmitter;
}
```

- Auth: `apiKey` lives only inside `MediaClient`'s closure, attached as a request header. Nothing outside `media-core` ever sees or needs the key — wrappers just hold a `MediaClient` instance.
- Caching/de-dupe: an in-memory `Map` keyed by a stable serialization of `(method, params)`. In-flight identical requests return the same pending `Promise` instead of firing twice; completed responses are cached with a short TTL (e.g. 60s) to absorb rapid pagination/re-render duplicate calls.
- Errors: a `MediaApiError { status, message, cause }` thrown on non-2xx responses; network errors wrapped the same way so callers have one error shape to handle.

### Event emitter (`packages/media-core/src/media-emitter.ts`)

```typescript
export class MediaEmitter {
  on<E extends MediaEventName>(event: E, handler: (payload: MediaEventPayload[E]) => void): () => void; // returns unsubscribe
  off<E extends MediaEventName>(event: E, handler: (payload: MediaEventPayload[E]) => void): void;
  emit<E extends MediaEventName>(event: E, payload: MediaEventPayload[E]): void;
}
```

`MediaClient` registers one default listener on construction that `console.log`s every event; consumers subscribe independently via `client.events.on(...)` without disturbing the default listener.

## `media-react`

```typescript
export interface MediaProviderProps {
  config: MediaConfig;
  children: React.ReactNode;
}
export function MediaProvider(props: MediaProviderProps): JSX.Element;

// Data hooks — thin adapters over MediaClient, own loading/error/pagination state
export function useMediaSearch(params: SearchParams): {
  items: MediaItem[]; loading: boolean; error: MediaApiError | null;
  hasMore: boolean; loadMore: () => void;
};
export function useCuratedMedia(params?: CuratedParams): ReturnType<typeof useMediaSearch>;
export function useMediaItem(id: number, mediaType: 'photo' | 'video'): {
  item: MediaItem | null; loading: boolean; error: MediaApiError | null;
};

// Event hooks
export function useMediaEvents<E extends MediaEventName>(
  event: E, handler: (payload: MediaEventPayload[E]) => void
): void; // auto-subscribes on mount, unsubscribes on unmount
export function useTrackMediaEvent(): <E extends MediaEventName>(event: E, payload: MediaEventPayload[E]) => void;
```

No business logic here beyond React state/effect plumbing around `MediaClient` calls — pagination accumulation, loading/error flags, and effect-based subscribe/unsubscribe are the only "logic," and it's all adaptation, not decision-making about *what* data means.

## `media-ui-react` (headless, prop-getter pattern)

```typescript
// Grid
export interface UseGridOptions<T> {
  items: T[]; hasMore: boolean; loadMore: () => void; loading: boolean;
}
export function useGrid<T>(opts: UseGridOptions<T>): {
  getGridProps: () => React.HTMLAttributes<HTMLElement>;
  getItemProps: (item: T, index: number) => React.HTMLAttributes<HTMLElement> & { key: React.Key };
  getSentinelProps: () => React.HTMLAttributes<HTMLElement>; // IntersectionObserver target for infinite scroll
};

// Lightbox
export interface UseLightboxOptions<T> {
  items: T[]; initialIndex: number; onClose: () => void;
}
export function useLightbox<T>(opts: UseLightboxOptions<T>): {
  currentItem: T; currentIndex: number;
  getOverlayProps: () => React.HTMLAttributes<HTMLElement>;
  getNextProps: () => React.ButtonHTMLAttributes<HTMLButtonElement>;
  getPrevProps: () => React.ButtonHTMLAttributes<HTMLButtonElement>;
  getCloseProps: () => React.ButtonHTMLAttributes<HTMLButtonElement>;
  // keyboard: Escape closes, ArrowLeft/Right navigate, focus trapped inside getOverlayProps' element
};

// Reel Swiper
export interface UseReelSwiperOptions<T> {
  items: T[]; onActiveChange?: (index: number) => void;
}
export function useReelSwiper<T>(opts: UseReelSwiperOptions<T>): {
  activeIndex: number;
  getContainerProps: () => React.HTMLAttributes<HTMLElement>; // scroll-snap-type: y mandatory
  getItemProps: (item: T, index: number) => React.HTMLAttributes<HTMLElement> & { key: React.Key }; // scroll-snap-align + IntersectionObserver-based active detection
};
```

No component ships styles or markup beyond the DOM attributes returned by the prop-getters — the consumer (here, `apps/web`) supplies the actual `<div>`/`<img>`/`<video>` elements and CSS. None of these three hooks imports `media-core`, `media-react`, or the Pexels types — `T` is a generic; `MediaItem` is something only `apps/web` knows about.

## `apps/web`

The only package wiring a wrapper to a component library:

```
apps/web/src/
├── App.tsx              # MediaProvider at the root
├── SearchPage.tsx        # useMediaSearch + useGrid, renders results
├── LightboxOverlay.tsx   # useLightbox, opened from a Grid item click
├── ReelsView.tsx         # useReelSwiper over video results
└── main.tsx
```

`SearchPage` calls `useMediaSearch` (from `media-react`) for data and `useGrid` (from `media-ui-react`) for grid behavior, then supplies the actual markup connecting the two — this file is where `MediaItem` (a core type) and the UI library's generic `T` meet, and nowhere else.

## Skill docs (`skills/`)

- `skill-wiring-data.md`: how to stand up `MediaProvider`, which hook to reach for (search vs curated vs single item), how to subscribe to `view`/`download` events, where the API key comes from — scoped to `media-react` only.
- `skill-using-components.md`: how to consume `useGrid`/`useLightbox`/`useReelSwiper`'s prop-getters, the styling contract (you own all CSS), keyboard/focus/a11y behavior already handled internally vs what the consumer must still provide.

Both are written against the frozen signatures above, so they don't need to change once implementation catches up to the contracts — only corrected if implementation reveals a signature was wrong (logged in `DECISIONS.md`).
