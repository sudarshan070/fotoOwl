export interface MediaConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface Photo {
  id: number;
  type: 'photo';
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: { original: string; large: string; medium: string; small: string; tiny: string };
  alt: string | null;
}

export interface Video {
  id: number;
  type: 'video';
  width: number;
  height: number;
  duration: number;
  image: string;
  videoFiles: { id: number; quality: string; width: number; height: number; link: string }[];
}

export type MediaItem = Photo | Video;

export interface SearchParams {
  query: string;
  page?: number;
  perPage?: number;
  mediaType?: 'photos' | 'videos';
}

export interface CuratedParams {
  page?: number;
  perPage?: number;
  mediaType?: 'photos' | 'videos';
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalResults: number;
  nextPage: number | null;
}

export type MediaEventName = 'view' | 'download';

export interface MediaEventPayload {
  view: { item: MediaItem; source: 'search' | 'curated' | 'lightbox' | 'reel' };
  download: { item: MediaItem; variant: string };
}

export class MediaApiError extends Error {
  readonly status: number | null;
  readonly cause?: unknown;

  constructor(message: string, status: number | null, cause?: unknown) {
    super(message);
    this.name = 'MediaApiError';
    this.status = status;
    this.cause = cause;
  }
}
