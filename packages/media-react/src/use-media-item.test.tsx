import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMediaItem } from './use-media-item';
import { MediaProvider } from './media-provider';
import * as mediaCore from 'media-core';

describe('useMediaItem', () => {
  it('fetches a single item by id and mediaType', async () => {
    const photo = { id: 5, type: 'photo' } as any;
    vi.spyOn(mediaCore.MediaClient.prototype, 'getById').mockResolvedValue(photo);

    const { result } = renderHook(() => useMediaItem(5, 'photo'), {
      wrapper: ({ children }) => <MediaProvider config={{ apiKey: 'k' }}>{children}</MediaProvider>
    });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.item).toEqual(photo);
    expect(mediaCore.MediaClient.prototype.getById).toHaveBeenCalledWith(5, 'photo');
  });
});
