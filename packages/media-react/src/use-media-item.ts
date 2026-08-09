import { useEffect, useState } from 'react';
import type { MediaApiError, MediaItem } from 'media-core';
import { useMediaClient } from './media-provider';

export function useMediaItem(id: number, mediaType: 'photo' | 'video') {
  const client = useMediaClient();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MediaApiError | null>(null);

  useEffect(() => {
    setLoading(true);
    client
      .getById(id, mediaType)
      .then((result) => {
        setItem(result);
        setError(null);
      })
      .catch((err: MediaApiError) => setError(err))
      .finally(() => setLoading(false));
  }, [client, id, mediaType]);

  return { item, loading, error };
}
