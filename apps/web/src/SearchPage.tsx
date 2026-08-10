import { useState } from 'react';
import { useMediaSearch, useCuratedMedia, useTrackMediaEvent } from 'media-react';
import { useGrid } from 'media-ui-react';
import type { MediaItem } from 'media-core';
import { LightboxOverlay } from './LightboxOverlay';
import { ReelsView } from './ReelsView';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const track = useTrackMediaEvent();

  const searchResult = useMediaSearch({ query, mediaType: 'photos' });
  const curatedResult = useCuratedMedia({ mediaType: 'photos' });
  const { items, loading, error, loadMore, hasMore } = query ? searchResult : curatedResult;

  const videoResult = useMediaSearch({ query: query || 'nature', mediaType: 'videos' });

  const { getGridProps, getItemProps, getSentinelProps } = useGrid({ items, hasMore, loading, loadMore });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setQuery(pendingQuery.trim());
    setOpenIndex(null);
  }

  function openItem(item: MediaItem, index: number) {
    track('view', { item, source: query ? 'search' : 'curated' });
    setOpenIndex(index);
  }

  return (
    <div className="page-content">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          className="search-input"
          value={pendingQuery}
          onChange={(event) => setPendingQuery(event.target.value)}
          placeholder="Search Pexels..."
        />
        <button className="search-button" type="submit">
          Search
        </button>
      </form>

      {error && (
        <p className="error-banner" role="alert">
          Failed to load: {error.message}
        </p>
      )}

      <div {...getGridProps()} className="media-grid">
        {items.map((item, index) => (
          <button {...getItemProps(item, index)} className="media-tile" onClick={() => openItem(item, index)}>
            {item.type === 'photo' ? (
              <img src={item.src.medium} alt={item.alt ?? ''} />
            ) : (
              <img src={item.image} alt="" />
            )}
          </button>
        ))}
      </div>
      <div {...getSentinelProps()} />
      {loading && <p className="loading-text">Loading...</p>}

      {openIndex !== null && (
        <LightboxOverlay items={items} initialIndex={openIndex} onClose={() => setOpenIndex(null)} onDownload={(item) => track('download', { item, variant: 'original' })} />
      )}

      <h2 className="section-heading">Video reels</h2>
      <ReelsView items={videoResult.items} onView={(item) => track('view', { item, source: 'reel' })} />
    </div>
  );
}
