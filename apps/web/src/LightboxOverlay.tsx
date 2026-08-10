import { useState } from 'react';
import { useLightbox } from 'media-ui-react';
import type { MediaItem } from 'media-core';
import { downloadMedia } from './download-media';

export function LightboxOverlay({
  items,
  initialIndex,
  onClose,
  onDownload
}: {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
  onDownload: (item: MediaItem) => void;
}) {
  const { currentItem, getOverlayProps, getNextProps, getPrevProps, getCloseProps } = useLightbox({
    items,
    initialIndex,
    onClose
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadMedia(currentItem);
      onDownload(currentItem);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div {...getOverlayProps()} className="lightbox-overlay">
      {currentItem.type === 'photo' ? (
        <img className="lightbox-media" src={currentItem.src.large} alt={currentItem.alt ?? ''} />
      ) : (
        <video className="lightbox-media" src={currentItem.videoFiles[0]?.link} controls />
      )}
      {downloadError && (
        <p className="error-banner" role="alert">
          {downloadError}
        </p>
      )}
      <div className="lightbox-controls">
        <button {...getPrevProps()} className="lightbox-button">
          ◀ Prev
        </button>
        <button className="lightbox-button lightbox-button-primary" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? 'Downloading…' : 'Download'}
        </button>
        <button {...getNextProps()} className="lightbox-button">
          Next ▶
        </button>
        <button {...getCloseProps()} className="lightbox-button lightbox-button-close">
          Close
        </button>
      </div>
    </div>
  );
}
