import { useLightbox } from 'media-ui-react';
import type { MediaItem } from 'media-core';

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

  return (
    <div {...getOverlayProps()} className="lightbox-overlay">
      {currentItem.type === 'photo' ? (
        <img className="lightbox-media" src={currentItem.src.large} alt={currentItem.alt ?? ''} />
      ) : (
        <video className="lightbox-media" src={currentItem.videoFiles[0]?.link} controls />
      )}
      <div className="lightbox-controls">
        <button {...getPrevProps()} className="lightbox-button">
          ◀ Prev
        </button>
        <button className="lightbox-button lightbox-button-primary" onClick={() => onDownload(currentItem)}>
          Download
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
