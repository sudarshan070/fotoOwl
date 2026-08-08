import type { MediaEventName, MediaEventPayload } from './types';

type Handler<E extends MediaEventName> = (payload: MediaEventPayload[E]) => void;

export class MediaEmitter {
  private handlers: Map<MediaEventName, Set<Handler<any>>> = new Map();

  on<E extends MediaEventName>(event: E, handler: Handler<E>): () => void {
    let set = this.handlers.get(event) as Set<Handler<E>> | undefined;
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off<E extends MediaEventName>(event: E, handler: Handler<E>): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<E extends MediaEventName>(event: E, payload: MediaEventPayload[E]): void {
    (this.handlers.get(event) as Set<Handler<E>> | undefined)?.forEach((handler) => handler(payload));
  }
}
