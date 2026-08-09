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
