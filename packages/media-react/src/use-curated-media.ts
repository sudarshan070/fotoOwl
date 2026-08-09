import type { CuratedParams } from 'media-core';
import { useMediaClient } from './media-provider';
import { usePaginatedMedia } from './use-paginated-media';
import type { UseMediaSearchResult } from './use-media-search';

export function useCuratedMedia(params: CuratedParams = {}): UseMediaSearchResult {
  const client = useMediaClient();
  const paramsKey = JSON.stringify(params);
  return usePaginatedMedia((page) => client.curated({ ...params, page }), paramsKey);
}
