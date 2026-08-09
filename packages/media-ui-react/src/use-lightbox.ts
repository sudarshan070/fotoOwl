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
