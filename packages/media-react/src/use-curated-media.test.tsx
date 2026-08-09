import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCuratedMedia } from './use-curated-media';
import { MediaProvider } from './media-provider';
import * as mediaCore from 'media-core';

describe('useCuratedMedia', () => {
  it('loads curated items on mount using client.curated', async () => {
    vi.spyOn(mediaCore.MediaClient.prototype, 'curated').mockResolvedValue({
      items: [{ id: 1, type: 'photo' } as any], page: 1, perPage: 1, totalResults: 1, nextPage: null
    });

    const { result } = renderHook(() => useCuratedMedia(), {
      wrapper: ({ children }) => <MediaProvider config={{ apiKey: 'k' }}>{children}</MediaProvider>
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(mediaCore.MediaClient.prototype.curated).toHaveBeenCalled();
  });
});
