import { describe, it, expect, vi } from 'vitest';
import { MediaEmitter } from './media-emitter';

describe('MediaEmitter', () => {
  it('calls a subscribed handler with the emitted payload', () => {
    const emitter = new MediaEmitter();
    const handler = vi.fn();
    emitter.on('view', handler);

    const payload = { item: { id: 1 } as any, source: 'search' as const };
    emitter.emit('view', payload);

    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('stops calling a handler after off() or the on() return value is invoked', () => {
    const emitter = new MediaEmitter();
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const unsubscribeA = emitter.on('download', handlerA);
    emitter.on('download', handlerB);

    unsubscribeA();
    emitter.off('download', handlerB);
    emitter.emit('download', { item: { id: 1 } as any, variant: 'original' });

    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).not.toHaveBeenCalled();
  });

  it('does not throw when emitting an event with no subscribers', () => {
    const emitter = new MediaEmitter();
    expect(() => emitter.emit('view', { item: { id: 1 } as any, source: 'curated' })).not.toThrow();
  });
});
