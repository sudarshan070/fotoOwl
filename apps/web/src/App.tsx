import { MediaProvider, useMediaEvents } from 'media-react';
import { SearchPage } from './SearchPage';
import './theme.css';

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
      <div className="app-shell">
        <header className="app-header">
          <div className="app-brand">
            <span className="app-brand-mark" aria-hidden="true">
              🦉
            </span>
            <span className="app-brand-name">
              Foto<span>Owl</span>
            </span>
          </div>
          <span className="app-tagline">Media Browser</span>
        </header>
        <SearchPage />
      </div>
    </MediaProvider>
  );
}
