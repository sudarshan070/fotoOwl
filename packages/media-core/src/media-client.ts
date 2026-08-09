import { MediaEmitter } from './media-emitter';
import { RequestCache } from './request-cache';
import type { CuratedParams, MediaConfig, MediaItem, PaginatedResponse, Photo, SearchParams, Video } from './types';
import { MediaApiError } from './types';

const DEFAULT_BASE_URL = 'https://api.pexels.com';

function extractPageNumber(nextPageUrl: string | null): number | null {
  if (!nextPageUrl) return null;
  const match = nextPageUrl.match(/[?&]page=(\d+)/);
  return match ? Number(match[1]) : null;
}

function mapPhoto(raw: any): Photo {
  return {
    id: raw.id, type: 'photo', width: raw.width, height: raw.height, url: raw.url,
    photographer: raw.photographer, src: raw.src, alt: raw.alt ?? null
  };
}

function mapVideo(raw: any): Video {
  return {
    id: raw.id, type: 'video', width: raw.width, height: raw.height, duration: raw.duration,
    image: raw.image,
    videoFiles: (raw.video_files ?? []).map((f: any) => ({
      id: f.id, quality: f.quality, width: f.width, height: f.height, link: f.link
    }))
  };
}

export class MediaClient {
  readonly events = new MediaEmitter();
  private config: MediaConfig;
  private cache = new RequestCache();

  constructor(config: MediaConfig) {
    this.config = config;
    this.events.on('view', (payload) => console.log('[media-core] view', payload));
    this.events.on('download', (payload) => console.log('[media-core] download', payload));
  }

  async search(params: SearchParams): Promise<PaginatedResponse<MediaItem>> {
    const mediaType = params.mediaType ?? 'photos';
    const query = new URLSearchParams({
      query: params.query,
      page: String(params.page ?? 1),
      per_page: String(params.perPage ?? 20)
    });
    const key = `search:${mediaType}:${query.toString()}`;
    return this.cache.getOrFetch(key, () =>
      this.fetchJson(`/v1/${mediaType}/search?${query.toString()}`, mediaType)
    );
  }

  async curated(params: CuratedParams = {}): Promise<PaginatedResponse<MediaItem>> {
    const mediaType = params.mediaType ?? 'photos';
    const path = mediaType === 'videos' ? '/videos/popular' : '/v1/curated';
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      per_page: String(params.perPage ?? 20)
    });
    const key = `curated:${mediaType}:${query.toString()}`;
    return this.cache.getOrFetch(key, () => this.fetchJson(`${path}?${query.toString()}`, mediaType));
  }

  async getById(id: number, mediaType: 'photo' | 'video'): Promise<MediaItem> {
    const path = mediaType === 'video' ? `/videos/videos/${id}` : `/v1/photos/${id}`;
    const key = `item:${mediaType}:${id}`;
    return this.cache.getOrFetch(key, async () => {
      const raw = await this.rawFetch(path);
      return mediaType === 'video' ? mapVideo(raw) : mapPhoto(raw);
    });
  }

  private async fetchJson(path: string, mediaType: 'photos' | 'videos'): Promise<PaginatedResponse<MediaItem>> {
    const raw = await this.rawFetch(path);
    const rawItems: any[] = mediaType === 'videos' ? raw.videos : raw.photos;
    const items = rawItems.map((item) => (mediaType === 'videos' ? mapVideo(item) : mapPhoto(item)));
    return {
      items,
      page: raw.page,
      perPage: raw.per_page,
      totalResults: raw.total_results,
      nextPage: extractPageNumber(raw.next_page ?? null)
    };
  }

  private async rawFetch(path: string): Promise<any> {
    const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL;
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: this.config.apiKey }
      });
    } catch (cause) {
      throw new MediaApiError('Network request failed', null, cause);
    }
    if (!response.ok) {
      throw new MediaApiError(`Pexels API returned ${response.status}`, response.status);
    }
    return response.json();
  }
}
