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
    <div
      {...getOverlayProps()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16
      }}
    >
      {currentItem.type === 'photo' ? (
        <img src={currentItem.src.large} alt={currentItem.alt ?? ''} style={{ maxHeight: '80vh', maxWidth: '90vw' }} />
      ) : (
        <video src={currentItem.videoFiles[0]?.link} controls style={{ maxHeight: '80vh', maxWidth: '90vw' }} />
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button {...getPrevProps()}>◀ Prev</button>
        <button onClick={() => onDownload(currentItem)}>Download</button>
        <button {...getNextProps()}>Next ▶</button>
        <button {...getCloseProps()}>Close</button>
      </div>
    </div>
  );
}
