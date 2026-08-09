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
