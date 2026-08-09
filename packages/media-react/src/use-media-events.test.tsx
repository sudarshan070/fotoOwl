import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useMediaEvents, useTrackMediaEvent } from './use-media-events';
import { MediaProvider, useMediaClient } from './media-provider';
import { useImperativeHandle, forwardRef } from 'react';

const Harness = forwardRef<{ client: ReturnType<typeof useMediaClient>; track: ReturnType<typeof useTrackMediaEvent> }, { onView: (p: any) => void }>(
  ({ onView }, ref) => {
    const client = useMediaClient();
    const track = useTrackMediaEvent();
    useMediaEvents('view', onView);
    useImperativeHandle(ref, () => ({ client, track }));
    return null;
  }
);

describe('useMediaEvents + useTrackMediaEvent', () => {
  it('subscribes, tracks, and unsubscribes against the same provider-scoped client', () => {
    const handler = vi.fn();
    const ref = { current: null as any };
    const { unmount } = render(
      <MediaProvider config={{ apiKey: 'k' }}>
        <Harness ref={ref} onView={handler} />
      </MediaProvider>
    );

    ref.current.track('view', { item: { id: 1 } as any, source: 'grid' as any });
    expect(handler).toHaveBeenCalledTimes(1);

    // Capture `track` before unmount: useImperativeHandle nulls out `ref.current`
    // on unmount, so `ref.current.track` would throw for reasons unrelated to
    // the hook under test.
    const track = ref.current.track;
    unmount();

    // `track` just calls `client.events.emit(...)`, a plain method call that never
    // throws regardless of subscription state — so `not.toThrow()` alone doesn't
    // prove unsubscribe happened. The assertion that actually exercises
    // useMediaEvents' cleanup is that `handler`'s call count stays at 1 (its
    // pre-unmount count) after emitting again post-unmount.
    track('view', { item: { id: 1 } as any, source: 'grid' as any });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
