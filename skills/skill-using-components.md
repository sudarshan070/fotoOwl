---
name: using-media-ui-components
description: How to consume media-ui-react's headless Grid/Lightbox/ReelSwiper hooks — prop-getters, styling contract, accessibility. Use this before writing markup around search results, a lightbox, or a reel view.
---

# Using media-ui-react's headless components

## The styling contract

Every hook here returns `get*Props()` functions, not components. They give you DOM attributes to spread onto **your own** elements — `onClick`, `role`, `aria-*`, `ref`, `key`, and (only where the behavior itself requires it, like scroll-snap) a `style` object. There is no CSS shipped anywhere in this package. If something doesn't look right, it's because you haven't styled it yet — that's expected, not a bug in the hook.

## useGrid

```tsx
const { getGridProps, getItemProps, getSentinelProps } = useGrid({ items, hasMore, loading, loadMore });

<div {...getGridProps()}>
  {items.map((item, i) => (
    <div {...getItemProps(item, i)}>{/* your markup */}</div>
  ))}
</div>
<div {...getSentinelProps()} />
```

- `getItemProps` already returns a `key` — don't add your own `key` prop alongside it, React will warn about the duplicate.
- `getSentinelProps()` must be spread onto a real rendered element placed after the last grid item (even a 1px-tall empty div is fine). If you don't render it, infinite scroll silently never fires — there's no error, `loadMore` just never gets called.

## useLightbox

```tsx
const { currentItem, getOverlayProps, getNextProps, getPrevProps, getCloseProps } = useLightbox({ items, initialIndex, onClose });

<div {...getOverlayProps()}>
  <button {...getPrevProps()}>Prev</button>
  {/* render currentItem */}
  <button {...getNextProps()}>Next</button>
  <button {...getCloseProps()}>Close</button>
</div>
```

- Keyboard handling (Escape closes, ArrowLeft/Right navigate) is already wired up via a document-level listener — don't add your own `onKeyDown` for these keys, you'll double-fire.
- `getNextProps`/`getPrevProps` already set `disabled` at the first/last item — don't add your own boundary check.
- `getOverlayProps` sets `role="dialog"`, `aria-modal`, and moves focus into the overlay on mount. It does **not** implement a full cyclic Tab-trap (documented cut, see `DECISIONS.md`) — if you need that, add it around the overlay yourself rather than assuming the hook covers it.
- **The hook never reconciles `currentIndex` against a shrinking `items` array.** If the `items` array you pass in changes identity while the lightbox is open (e.g. the parent re-ran a search and now has fewer results), `currentIndex` is not clamped or reset — `items[currentIndex]` can come back `undefined` and crash whatever you render for `currentItem`. This was hit for real building `SearchPage`: submitting a new query while the lightbox was open could leave a stale, out-of-range index. Close the lightbox (or otherwise reset whatever produced its `initialIndex`/`items`) whenever the surrounding data can change out from under it — don't rely on the hook to notice.

## useReelSwiper

```tsx
const { activeIndex, getContainerProps, getItemProps } = useReelSwiper({ items, onActiveChange });

<div {...getContainerProps()} style={{ ...getContainerProps().style, height: '100vh' }}>
  {items.map((item, i) => (
    <div {...getItemProps(item, i)} style={{ ...getItemProps(item, i).style, height: '100vh' }}>
      {/* your markup */}
    </div>
  ))}
</div>
```

- The container and each item already carry `scrollSnapType`/`scrollSnapAlign` inline styles for the snap behavior — merge your own `style` object with theirs (as shown above) rather than replacing it, or snapping breaks silently.
- Active-item detection uses `IntersectionObserver` against the container as `root` — the container must have an explicit height and `overflow` for this to work; a height of `auto` will make every item "visible" at once and `activeIndex` will thrash.

## Accessibility notes

- Every `role`/`aria-*` attribute returned by a prop-getter is load-bearing — don't strip them when spreading, and don't override them with a conflicting value.
- None of these hooks ships visible focus styles. Add your own `:focus-visible` CSS on interactive elements; screen-reader and keyboard support is handled, visual affordance is not.
