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
