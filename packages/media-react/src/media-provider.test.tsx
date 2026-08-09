import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MediaProvider, useMediaClient } from './media-provider';
import { MediaClient } from 'media-core';

describe('MediaProvider', () => {
  it('provides a MediaClient instance built from the given config', () => {
    const { result } = renderHook(() => useMediaClient(), {
      wrapper: ({ children }) => <MediaProvider config={{ apiKey: 'k' }}>{children}</MediaProvider>
    });

    expect(result.current).toBeInstanceOf(MediaClient);
  });

  it('throws a clear error when a hook is used outside MediaProvider', () => {
    expect(() => renderHook(() => useMediaClient())).toThrow(/MediaProvider/);
  });
});
