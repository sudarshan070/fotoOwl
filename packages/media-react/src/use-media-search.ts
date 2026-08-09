import type { MediaApiError, MediaItem, SearchParams } from 'media-core';
import { useMediaClient } from './media-provider';
import { usePaginatedMedia } from './use-paginated-media';

export interface UseMediaSearchResult {
  items: MediaItem[];
  loading: boolean;
  error: MediaApiError | null;
  hasMore: boolean;
  loadMore: () => void;
}

export function useMediaSearch(params: SearchParams): UseMediaSearchResult {
  const client = useMediaClient();
  const paramsKey = JSON.stringify(params);
  return usePaginatedMedia((page) => client.search({ ...params, page }), paramsKey);
}
