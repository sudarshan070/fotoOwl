import { useEffect, useCallback } from 'react';
import type { MediaEventName, MediaEventPayload } from 'media-core';
import { useMediaClient } from './media-provider';

export function useMediaEvents<E extends MediaEventName>(
  event: E,
  handler: (payload: MediaEventPayload[E]) => void
): void {
  const client = useMediaClient();
  useEffect(() => client.events.on(event, handler), [client, event, handler]);
}

export function useTrackMediaEvent() {
  const client = useMediaClient();
  return useCallback(
    <E extends MediaEventName>(event: E, payload: MediaEventPayload[E]) => client.events.emit(event, payload),
    [client]
  );
}
