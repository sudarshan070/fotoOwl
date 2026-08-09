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
