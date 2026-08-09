import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { MediaClient, type MediaConfig } from 'media-core';

const MediaClientContext = createContext<MediaClient | null>(null);

export interface MediaProviderProps {
  config: MediaConfig;
  children: ReactNode;
}

export function MediaProvider({ config, children }: MediaProviderProps) {
  const client = useMemo(() => new MediaClient(config), [config.apiKey, config.baseUrl]);
  return <MediaClientContext.Provider value={client}>{children}</MediaClientContext.Provider>;
}

export function useMediaClient(): MediaClient {
  const client = useContext(MediaClientContext);
  if (!client) {
    throw new Error('useMediaClient must be used within a MediaProvider');
  }
  return client;
}
