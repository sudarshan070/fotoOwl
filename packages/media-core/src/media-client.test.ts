import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaClient } from './media-client';
import type { Photo, Video } from './types';

function mockPexelsPhotoResponse() {
  return {
    page: 1,
    per_page: 2,
    total_results: 2,
    next_page: 'https://api.pexels.com/v1/curated?page=2',
    photos: [
      {
        id: 1, width: 100, height: 100, url: 'https://x', photographer: 'a',
        src: { original: 'o', large: 'l', medium: 'm', small: 's', tiny: 't' }, alt: null
      }
    ]
  };
}

function mockPexelsSinglePhotoResponse() {
  return {
    id: 42, width: 100, height: 100, url: 'https://x', photographer: 'a',
    src: { original: 'o', large: 'l', medium: 'm', small: 's', tiny: 't' }, alt: null
  };
}

function mockPexelsSingleVideoResponse() {
  return {
    id: 99, width: 200, height: 200, duration: 10, image: 'https://img',
    video_files: [{ id: 1, quality: 'hd', width: 200, height: 200, link: 'https://vid' }]
  };
}

describe('MediaClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('sends the API key as an Authorization header and never in the URL', async () => {
    (fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => mockPexelsPhotoResponse() });
    const client = new MediaClient({ apiKey: 'secret-key' });

    await client.curated();

    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).not.toContain('secret-key');
    expect(init.headers.Authorization).toBe('secret-key');
  });

  it('maps a curated photo response into the PaginatedResponse<MediaItem> shape', async () => {
    (fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => mockPexelsPhotoResponse() });
    const client = new MediaClient({ apiKey: 'k' });

    const result = await client.curated();

    expect(result.items).toHaveLength(1);
    const item = result.items[0] as Photo;
    expect(item.type).toBe('photo');
    expect(item.id).toBe(1);
    expect(result.nextPage).toBe(2);
  });

  it('throws a MediaApiError with the response status on a non-2xx response', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const client = new MediaClient({ apiKey: 'k' });

    await expect(client.curated()).rejects.toMatchObject({ name: 'MediaApiError', status: 429 });
  });

  it('throws a MediaApiError with a null status when fetch itself rejects', async () => {
    (fetch as any).mockRejectedValue(new Error('offline'));
    const client = new MediaClient({ apiKey: 'k' });

    await expect(client.curated()).rejects.toMatchObject({ name: 'MediaApiError', status: null });
  });

  it('does not issue a second HTTP call for an identical curated() call made twice in a row', async () => {
    (fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => mockPexelsPhotoResponse() });
    const client = new MediaClient({ apiKey: 'k' });

    await client.curated({ page: 1 });
    await client.curated({ page: 1 });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('builds the correct Pexels photo search URL (/v1/search, not /v1/photos/search)', async () => {
    (fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => mockPexelsPhotoResponse() });
    const client = new MediaClient({ apiKey: 'k' });

    await client.search({ query: 'cats', mediaType: 'photos' });

    const [url] = (fetch as any).mock.calls[0];
    expect(url).toBe('https://api.pexels.com/v1/search?query=cats&page=1&per_page=20');
  });

  it('builds the correct Pexels video search URL (/videos/search, no /v1/ prefix)', async () => {
    (fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => ({ page: 1, per_page: 20, total_results: 0, next_page: null, videos: [] }) });
    const client = new MediaClient({ apiKey: 'k' });

    await client.search({ query: 'cats', mediaType: 'videos' });

    const [url] = (fetch as any).mock.calls[0];
    expect(url).toBe('https://api.pexels.com/videos/search?query=cats&page=1&per_page=20');
  });

  it('maps a getById photo response into a Photo', async () => {
    (fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => mockPexelsSinglePhotoResponse() });
    const client = new MediaClient({ apiKey: 'k' });

    const result = await client.getById(42, 'photo') as Photo;

    const [url] = (fetch as any).mock.calls[0];
    expect(url).toBe('https://api.pexels.com/v1/photos/42');
    expect(result.type).toBe('photo');
    expect(result.id).toBe(42);
  });

  it('maps a getById video response into a Video', async () => {
    (fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => mockPexelsSingleVideoResponse() });
    const client = new MediaClient({ apiKey: 'k' });

    const result = await client.getById(99, 'video') as Video;

    const [url] = (fetch as any).mock.calls[0];
    expect(url).toBe('https://api.pexels.com/videos/videos/99');
    expect(result.type).toBe('video');
    expect(result.id).toBe(99);
    expect(result.videoFiles).toHaveLength(1);
  });
});
