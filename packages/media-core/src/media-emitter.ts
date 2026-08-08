import type { MediaEventName, MediaEventPayload } from './types';

type Handler<E extends MediaEventName> = (payload: MediaEventPayload[E]) => void;

export class MediaEmitter {
  private handlers: { [K in MediaEventName]?: Set<Handler<K>> } = {};

  on<E extends MediaEventName>(event: E, handler: Handler<E>): () => void {
    const set = (this.handlers[event] ??= new Set()) as Set<Handler<E>>;
    set.add(handler);
    return () => this.off(event, handler);
  }

  off<E extends MediaEventName>(event: E, handler: Handler<E>): void {
    (this.handlers[event] as Set<Handler<E>> | undefined)?.delete(handler);
  }

  emit<E extends MediaEventName>(event: E, payload: MediaEventPayload[E]): void {
    (this.handlers[event] as Set<Handler<E>> | undefined)?.forEach((handler) => handler(payload));
  }
}
