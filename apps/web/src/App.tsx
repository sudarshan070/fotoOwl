import { MediaProvider, useMediaEvents } from 'media-react';
import { SearchPage } from './SearchPage';

function ActivityLogger() {
  useMediaEvents('view', (payload) => console.log('[app] activity: view', payload));
  useMediaEvents('download', (payload) => console.log('[app] activity: download', payload));
  return null;
}

export function App() {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY as string;
  return (
    <MediaProvider config={{ apiKey }}>
      <ActivityLogger />
      <SearchPage />
    </MediaProvider>
  );
}
