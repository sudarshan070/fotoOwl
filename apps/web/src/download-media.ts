import type { MediaItem } from 'media-core';

function getDownloadUrl(item: MediaItem): string | undefined {
  return item.type === 'photo' ? item.src.original : item.videoFiles[0]?.link;
}

function getFileName(item: MediaItem): string {
  return item.type === 'photo' ? `pexels-photo-${item.id}.jpg` : `pexels-video-${item.id}.mp4`;
}

// Pexels' CDN sends `access-control-allow-origin: *` on both photo and video
// files, so we can fetch the bytes and save them via a blob: URL — this forces
// a real download regardless of the CDN's own Content-Disposition header,
// which a plain `<a href download>` link cannot reliably do across origins.
export async function downloadMedia(item: MediaItem): Promise<void> {
  const url = getDownloadUrl(item);
  if (!url) {
    throw new Error('No downloadable file for this item');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = getFileName(item);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
