import { useEffect, useRef, useState, useCallback } from 'react';
import type { MediaApiError, MediaItem, SearchParams } from 'media-core';
import { useMediaClient } from './media-provider';

export interface UseMediaSearchResult {
  items: MediaItem[];
  loading: boolean;
  error: MediaApiError | null;
  hasMore: boolean;
  loadMore: () => void;
}

export function useMediaSearch(params: SearchParams): UseMediaSearchResult {
  const client = useMediaClient();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MediaApiError | null>(null);
  // `page` is the page to fetch next; it only changes on a params reset or an
  // explicit loadMore() call. `nextPage` is purely the server-reported
  // pagination cursor used to compute hasMore and to seed the next loadMore().
  const [page, setPage] = useState<number | null>(1);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const requestedPage = useRef<number | null>(null);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setNextPage(1);
    setError(null);
    requestedPage.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    if (page === null || requestedPage.current === page) return;
    requestedPage.current = page;
    setLoading(true);
    client
      .search({ ...params, page })
      .then((response) => {
        setItems((prev) => (page === 1 ? response.items : [...prev, ...response.items]));
        setNextPage(response.nextPage);
        setError(null);
      })
      .catch((err: MediaApiError) => setError(err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, page]);

  const loadMore = useCallback(() => {
    if (nextPage !== null) setPage(nextPage);
  }, [nextPage]);

  return { items, loading, error, hasMore: nextPage !== null, loadMore };
}
