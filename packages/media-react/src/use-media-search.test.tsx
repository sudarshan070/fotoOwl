import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMediaSearch } from './use-media-search';
import { MediaProvider } from './media-provider';
import * as mediaCore from 'media-core';

function page(pageNum: number, nextPage: number | null) {
  return {
    items: [{ id: pageNum, type: 'photo' } as any],
    page: pageNum, perPage: 1, totalResults: 2, nextPage
  };
}

describe('useMediaSearch', () => {
  it('loads the first page on mount and exposes loading/hasMore correctly', async () => {
    vi.spyOn(mediaCore.MediaClient.prototype, 'search').mockResolvedValue(page(1, 2));

    const { result } = renderHook(() => useMediaSearch({ query: 'cats' }), {
      wrapper: ({ children }) => <MediaProvider config={{ apiKey: 'k' }}>{children}</MediaProvider>
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('appends the next page and sets hasMore false once nextPage is null', async () => {
    vi.spyOn(mediaCore.MediaClient.prototype, 'search')
      .mockResolvedValueOnce(page(1, 2))
      .mockResolvedValueOnce(page(2, null));

    const { result } = renderHook(() => useMediaSearch({ query: 'cats' }), {
      wrapper: ({ children }) => <MediaProvider config={{ apiKey: 'k' }}>{children}</MediaProvider>
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('sets error and stops loading when the client rejects', async () => {
    const { MediaApiError } = mediaCore;
    vi.spyOn(mediaCore.MediaClient.prototype, 'search').mockRejectedValue(new MediaApiError('boom', 500));

    const { result } = renderHook(() => useMediaSearch({ query: 'cats' }), {
      wrapper: ({ children }) => <MediaProvider config={{ apiKey: 'k' }}>{children}</MediaProvider>
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(MediaApiError);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.hasMore).toBe(false);
  });
});
