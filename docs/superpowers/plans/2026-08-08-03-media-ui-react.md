# media-ui-react Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the headless Grid, Lightbox, and Reel Swiper hooks — prop-getters only, no shipped styles or markup, no knowledge of `media-core` or Pexels — plus a Storybook setup that doubles as the deployable component docs.

**Architecture:** Each component is one hook returning a small set of `get*Props()` functions the consumer spreads onto their own elements. Generic over `T` throughout, so nothing here ever imports a `MediaItem` type. Grid and Reel Swiper both use `IntersectionObserver` internally (infinite-scroll sentinel; active-reel detection) rather than scroll-position math, since it's cheaper and more reliable across browsers.

**Tech Stack:** TypeScript, React 18, Vitest + `@testing-library/react` with jsdom, Storybook 8 (React + Vite framework).

**Prerequisite:** `docs/superpowers/plans/2026-08-08-00-repo-scaffold.md` complete. Fully independent of `media-core` and `media-react` — can run in parallel with both.

## Global Constraints

- Headless pattern: hooks + prop-getters, no shipped styles, consumer supplies markup/CSS.
- Independent of `media-core` and the wrappers — no imports from either. Components take data and callbacks purely as props; they don't know Pexels or the SDK exist.
- Grid needs infinite scroll / load-more. Lightbox needs image (+ video if time allows) support and focus/keyboard handling on web. Reel Swiper needs vertical snap paging and active-item detection.

---

### Task 1: Vitest jsdom config + useGrid

**Files:**
- Create: `packages/media-ui-react/vitest.config.ts`
- Create: `packages/media-ui-react/src/use-grid.ts`
- Test: `packages/media-ui-react/src/use-grid.test.tsx`

**Interfaces:**
- Consumes: nothing outside React and the DOM `IntersectionObserver` API.
- Produces: `useGrid<T>({ items, hasMore, loadMore, loading }): { getGridProps, getItemProps, getSentinelProps }`. `apps/web`'s `SearchPage` spreads these onto its own markup.

- [ ] **Step 1: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom', globals: false }
});
```

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGrid } from './use-grid';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as any);
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

describe('useGrid', () => {
  it('calls loadMore when the sentinel intersects and hasMore is true', () => {
    const loadMore = vi.fn();
    const { result } = renderHook(() => useGrid({ items: [], hasMore: true, loadMore, loading: false }));

    result.current.getSentinelProps().ref(document.createElement('div'));
    MockIntersectionObserver.instances[0].trigger(true);

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call loadMore when hasMore is false', () => {
    const loadMore = vi.fn();
    const { result } = renderHook(() => useGrid({ items: [], hasMore: false, loadMore, loading: false }));

    result.current.getSentinelProps().ref(document.createElement('div'));
    MockIntersectionObserver.instances[0].trigger(true);

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('does not call loadMore while already loading', () => {
    const loadMore = vi.fn();
    const { result } = renderHook(() => useGrid({ items: [], hasMore: true, loadMore, loading: true }));

    result.current.getSentinelProps().ref(document.createElement('div'));
    MockIntersectionObserver.instances[0].trigger(true);

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('gives each item a stable key derived from its id, falling back to index', () => {
    const { result } = renderHook(() =>
      useGrid({ items: [{ id: 7 }, {}], hasMore: false, loadMore: vi.fn(), loading: false })
    );

    expect(result.current.getItemProps({ id: 7 } as any, 0).key).toBe(7);
    expect(result.current.getItemProps({} as any, 1).key).toBe(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter media-ui-react test`
Expected: FAIL — `Cannot find module './use-grid'`.

- [ ] **Step 4: Implement `use-grid.ts`**

```typescript
import { useCallback, useRef } from 'react';
import type { HTMLAttributes, Key } from 'react';

export interface UseGridOptions<T> {
  items: T[];
  hasMore: boolean;
  loadMore: () => void;
  loading: boolean;
}

export function useGrid<T>(opts: UseGridOptions<T>) {
  const stateRef = useRef(opts);
  stateRef.current = opts;

  const observerRef = useRef<IntersectionObserver | null>(null);

  const getGridProps = useCallback((): HTMLAttributes<HTMLElement> => ({ role: 'list' }), []);

  const getItemProps = useCallback(
    (item: T, index: number): HTMLAttributes<HTMLElement> & { key: Key } => ({
      key: (item as { id?: Key }).id ?? index,
      role: 'listitem'
    }),
    []
  );

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      const { hasMore, loading, loadMore } = stateRef.current;
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore();
      }
    });
    observerRef.current.observe(node);
  }, []);

  const getSentinelProps = useCallback(
    () => ({ ref: sentinelRef, 'aria-hidden': true as const }),
    [sentinelRef]
  );

  return { getGridProps, getItemProps, getSentinelProps };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter media-ui-react test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/media-ui-react/vitest.config.ts packages/media-ui-react/src/use-grid.ts packages/media-ui-react/src/use-grid.test.tsx
git commit -m "feat(media-ui-react): add headless useGrid with infinite-scroll sentinel"
```

---

### Task 2: useLightbox

**Files:**
- Create: `packages/media-ui-react/src/use-lightbox.ts`
- Test: `packages/media-ui-react/src/use-lightbox.test.tsx`

**Interfaces:**
- Consumes: nothing outside React and the DOM.
- Produces: `useLightbox<T>({ items, initialIndex, onClose }): { currentItem, currentIndex, getOverlayProps, getNextProps, getPrevProps, getCloseProps }`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { useLightbox } from './use-lightbox';

function LightboxHarness({ onClose }: { onClose: () => void }) {
  const { currentItem, getOverlayProps, getNextProps, getPrevProps, getCloseProps } = useLightbox({
    items: ['a', 'b', 'c'],
    initialIndex: 0,
    onClose
  });
  return (
    <div {...getOverlayProps()}>
      <span>current:{currentItem}</span>
      <button {...getPrevProps()}>Previous</button>
      <button {...getNextProps()}>Next</button>
      <button {...getCloseProps()}>Close</button>
    </div>
  );
}

describe('useLightbox', () => {
  it('navigates forward and backward via the next/prev prop-getters', () => {
    render(<LightboxHarness onClose={vi.fn()} />);
    expect(screen.getByText('current:a')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Next'));
    expect(screen.getByText('current:b')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Previous'));
    expect(screen.getByText('current:a')).toBeTruthy();
  });

  it('navigates via ArrowRight/ArrowLeft keydown and closes on Escape', () => {
    const onClose = vi.fn();
    render(<LightboxHarness onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('current:b')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('current:a')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables Previous at the first item and Next at the last item', () => {
    render(<LightboxHarness onClose={vi.fn()} />);
    expect((screen.getByLabelText('Previous') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText('Next'));
    fireEvent.click(screen.getByLabelText('Next'));
    expect((screen.getByLabelText('Next') as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter media-ui-react test`
Expected: FAIL — `Cannot find module './use-lightbox'`.

- [ ] **Step 3: Implement `use-lightbox.ts`**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseLightboxOptions<T> {
  items: T[];
  initialIndex: number;
  onClose: () => void;
}

export function useLightbox<T>({ items, initialIndex, onClose }: UseLightboxOptions<T>) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const overlayRef = useRef<HTMLElement | null>(null);

  const next = useCallback(() => setCurrentIndex((i) => Math.min(i + 1, items.length - 1)), [items.length]);
  const prev = useCallback(() => setCurrentIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') next();
      else if (event.key === 'ArrowLeft') prev();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, next, prev]);

  // Moves focus into the overlay on open so screen readers announce it and Escape is
  // immediately reachable; a full cyclic Tab-trap was cut for time (see DECISIONS.md).
  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  const getOverlayProps = useCallback(
    () => ({
      ref: (node: HTMLElement | null) => {
        overlayRef.current = node;
      },
      role: 'dialog' as const,
      'aria-modal': true as const,
      tabIndex: -1
    }),
    []
  );

  const getNextProps = useCallback(
    () => ({ onClick: next, 'aria-label': 'Next', disabled: currentIndex >= items.length - 1 }),
    [next, currentIndex, items.length]
  );
  const getPrevProps = useCallback(
    () => ({ onClick: prev, 'aria-label': 'Previous', disabled: currentIndex <= 0 }),
    [prev, currentIndex]
  );
  const getCloseProps = useCallback(() => ({ onClick: onClose, 'aria-label': 'Close' }), [onClose]);

  return {
    currentItem: items[currentIndex],
    currentIndex,
    getOverlayProps,
    getNextProps,
    getPrevProps,
    getCloseProps
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter media-ui-react test`
Expected: PASS.

- [ ] **Step 5: Append the scoping note to `DECISIONS.md`**

```markdown
- **2026-08-08 — useLightbox ships a simplified focus model, not a full cyclic focus trap.** Focus moves into the dialog on open and Escape/Arrow keys work via a document-level listener, but Tab does not yet wrap from the last focusable element back to the first. Full trap cycling was cut for time; the prop-getter shape (`getOverlayProps` returning `ref`/`role`/`aria-modal`/`tabIndex`) doesn't need to change to add it later.
```

- [ ] **Step 6: Commit**

```bash
git add packages/media-ui-react/src/use-lightbox.ts packages/media-ui-react/src/use-lightbox.test.tsx DECISIONS.md
git commit -m "feat(media-ui-react): add headless useLightbox with keyboard nav"
```

---

### Task 3: useReelSwiper

**Files:**
- Create: `packages/media-ui-react/src/use-reel-swiper.ts`
- Test: `packages/media-ui-react/src/use-reel-swiper.test.tsx`

**Interfaces:**
- Consumes: nothing outside React and the DOM.
- Produces: `useReelSwiper<T>({ items, onActiveChange? }): { activeIndex, getContainerProps, getItemProps }`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReelSwiper } from './use-reel-swiper';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  trigger(target: HTMLElement, isIntersecting: boolean) {
    this.callback([{ isIntersecting, target } as unknown as IntersectionObserverEntry], this as any);
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

describe('useReelSwiper', () => {
  it('updates activeIndex and calls onActiveChange when an item becomes intersecting', () => {
    const onActiveChange = vi.fn();
    const { result } = renderHook(() => useReelSwiper({ items: ['a', 'b', 'c'], onActiveChange }));

    const container = document.createElement('div');
    result.current.getContainerProps().ref(container);

    const item1 = document.createElement('div');
    result.current.getItemProps('b', 1).ref(item1);

    MockIntersectionObserver.instances[0].trigger(item1, true);

    expect(result.current.activeIndex).toBe(1);
    expect(onActiveChange).toHaveBeenCalledWith(1);
  });

  it('marks each reel item with its scroll-snap-align style and a stable key', () => {
    const { result } = renderHook(() => useReelSwiper({ items: ['a', 'b'] }));
    const props = result.current.getItemProps('a', 0);

    expect(props.key).toBe(0);
    expect(props.style?.scrollSnapAlign).toBe('start');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter media-ui-react test`
Expected: FAIL — `Cannot find module './use-reel-swiper'`.

- [ ] **Step 3: Implement `use-reel-swiper.ts`**

```typescript
import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, Key } from 'react';

export interface UseReelSwiperOptions<T> {
  items: T[];
  onActiveChange?: (index: number) => void;
}

export function useReelSwiper<T>({ onActiveChange }: UseReelSwiperOptions<T>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemNodesRef = useRef(new Map<number, HTMLElement>());
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!visible) return;
    let index = -1;
    itemNodesRef.current.forEach((node, key) => {
      if (node === visible.target) index = key;
    });
    if (index === -1) return;
    setActiveIndex(index);
    onActiveChangeRef.current?.(index);
  }, []);

  const containerRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(handleIntersect, { root: node, threshold: 0.6 });
      itemNodesRef.current.forEach((itemNode) => observerRef.current!.observe(itemNode));
    },
    [handleIntersect]
  );

  const getContainerProps = useCallback(
    () => ({
      ref: containerRef,
      style: { scrollSnapType: 'y mandatory', overflowY: 'scroll' } as CSSProperties
    }),
    [containerRef]
  );

  const getItemProps = useCallback(
    (item: T, index: number) => ({
      key: (item as { id?: Key }).id ?? index,
      ref: (node: HTMLElement | null) => {
        if (node) {
          itemNodesRef.current.set(index, node);
          observerRef.current?.observe(node);
        } else {
          itemNodesRef.current.delete(index);
        }
      },
      style: { scrollSnapAlign: 'start' } as CSSProperties
    }),
    []
  );

  return { activeIndex, getContainerProps, getItemProps };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter media-ui-react test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/media-ui-react/src/use-reel-swiper.ts packages/media-ui-react/src/use-reel-swiper.test.tsx
git commit -m "feat(media-ui-react): add headless useReelSwiper with active-item detection"
```

---

### Task 4: Package exports + Storybook (component docs)

**Files:**
- Create: `packages/media-ui-react/src/index.ts`
- Create: `packages/media-ui-react/.storybook/main.ts`
- Create: `packages/media-ui-react/.storybook/preview.ts`
- Create: `packages/media-ui-react/src/use-grid.stories.tsx`
- Create: `packages/media-ui-react/src/use-lightbox.stories.tsx`
- Create: `packages/media-ui-react/src/use-reel-swiper.stories.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: the public surface of `media-ui-react` as imported by `apps/web`, and a `build-storybook` output deployable as the component docs URL.

- [ ] **Step 1: Write `index.ts`**

```typescript
export { useGrid } from './use-grid';
export type { UseGridOptions } from './use-grid';
export { useLightbox } from './use-lightbox';
export type { UseLightboxOptions } from './use-lightbox';
export { useReelSwiper } from './use-reel-swiper';
export type { UseReelSwiperOptions } from './use-reel-swiper';
```

- [ ] **Step 2: Add Storybook and its Vite/React framework as dev dependencies**

Run: `pnpm --filter media-ui-react add -D storybook @storybook/react-vite @storybook/react`

- [ ] **Step 3: Write `.storybook/main.ts`**

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  addons: []
};

export default config;
```

- [ ] **Step 4: Write `.storybook/preview.ts`**

```typescript
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    docs: {
      description: {
        component:
          'media-ui-react ships no styles or markup — every story below provides its own minimal example markup to demonstrate the prop-getter contract.'
      }
    }
  }
};

export default preview;
```

- [ ] **Step 5: Write `use-grid.stories.tsx`** (example consumer markup — not part of the shipped library)

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { useGrid } from './use-grid';

function GridExample() {
  const [items, setItems] = useState(Array.from({ length: 12 }, (_, i) => ({ id: i })));
  const [loading, setLoading] = useState(false);
  const { getGridProps, getItemProps, getSentinelProps } = useGrid({
    items,
    hasMore: items.length < 40,
    loading,
    loadMore: () => {
      setLoading(true);
      setTimeout(() => {
        setItems((prev) => [...prev, ...Array.from({ length: 12 }, (_, i) => ({ id: prev.length + i }))]);
        setLoading(false);
      }, 300);
    }
  });

  return (
    <div>
      <div {...getGridProps()} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {items.map((item, index) => (
          <div {...getItemProps(item, index)} style={{ background: '#ddd', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.id}
          </div>
        ))}
      </div>
      <div {...getSentinelProps()} style={{ height: 1 }} />
      {loading && <p>Loading more...</p>}
    </div>
  );
}

const meta: Meta<typeof GridExample> = { title: 'media-ui-react/useGrid', component: GridExample };
export default meta;
type Story = StoryObj<typeof GridExample>;
export const Default: Story = {};
```

- [ ] **Step 6: Write `use-lightbox.stories.tsx`**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { useLightbox } from './use-lightbox';

function LightboxExample() {
  const [open, setOpen] = useState(true);
  const { currentItem, getOverlayProps, getNextProps, getPrevProps, getCloseProps } = useLightbox({
    items: ['🐶', '🐱', '🦊', '🐻'],
    initialIndex: 0,
    onClose: () => setOpen(false)
  });

  if (!open) return <button onClick={() => setOpen(true)}>Reopen</button>;

  return (
    <div {...getOverlayProps()} style={{ background: '#000a', padding: 40, display: 'inline-block' }}>
      <button {...getPrevProps()}>◀</button>
      <span style={{ fontSize: 48, margin: '0 24px' }}>{currentItem}</span>
      <button {...getNextProps()}>▶</button>
      <button {...getCloseProps()} style={{ display: 'block', marginTop: 16 }}>Close</button>
    </div>
  );
}

const meta: Meta<typeof LightboxExample> = { title: 'media-ui-react/useLightbox', component: LightboxExample };
export default meta;
type Story = StoryObj<typeof LightboxExample>;
export const Default: Story = {};
```

- [ ] **Step 7: Write `use-reel-swiper.stories.tsx`**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { useReelSwiper } from './use-reel-swiper';

function ReelSwiperExample() {
  const items = ['Reel A', 'Reel B', 'Reel C'];
  const { activeIndex, getContainerProps, getItemProps } = useReelSwiper({ items });

  return (
    <div>
      <p>Active: {activeIndex}</p>
      <div {...getContainerProps()} style={{ ...getContainerProps().style, height: 300, width: 200 }}>
        {items.map((item, index) => (
          <div
            {...getItemProps(item, index)}
            style={{ ...getItemProps(item, index).style, height: 300, width: 200, background: index % 2 ? '#333' : '#666', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof ReelSwiperExample> = { title: 'media-ui-react/useReelSwiper', component: ReelSwiperExample };
export default meta;
type Story = StoryObj<typeof ReelSwiperExample>;
export const Default: Story = {};
```

- [ ] **Step 8: Build the package, typecheck, run tests, and build Storybook**

Run: `pnpm --filter media-ui-react build && pnpm --filter media-ui-react typecheck && pnpm --filter media-ui-react test && pnpm --filter media-ui-react build-storybook`
Expected: all four succeed; `packages/media-ui-react/storybook-static/index.html` exists.

- [ ] **Step 9: Commit**

```bash
git add packages/media-ui-react/src/index.ts packages/media-ui-react/.storybook packages/media-ui-react/src/*.stories.tsx
git commit -m "feat(media-ui-react): finalize exports and add Storybook component docs"
```
