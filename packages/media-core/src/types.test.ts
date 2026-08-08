import { describe, it, expect } from 'vitest';
import type { Photo, Video, MediaItem, PaginatedResponse } from './types';

describe('types', () => {
  it('Photo and Video are assignable to MediaItem', () => {
    const photo: Photo = {
      id: 1, type: 'photo', width: 100, height: 100, url: 'https://x', photographer: 'a',
      src: { original: '', large: '', medium: '', small: '', tiny: '' }, alt: null
    };
    const video: Video = {
      id: 2, type: 'video', width: 100, height: 100, duration: 5, image: '',
      videoFiles: [{ id: 1, quality: 'hd', width: 100, height: 100, link: '' }]
    };
    const items: MediaItem[] = [photo, video];
    const page: PaginatedResponse<MediaItem> = { items, page: 1, perPage: 2, totalResults: 2, nextPage: null };
    expect(page.items).toHaveLength(2);
  });
});
