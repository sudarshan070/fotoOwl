import { useReelSwiper } from 'media-ui-react';
import type { MediaItem } from 'media-core';
import { useEffect, useRef } from 'react';

export function ReelsView({ items, onView }: { items: MediaItem[]; onView: (item: MediaItem) => void }) {
  const { activeIndex, getContainerProps, getItemProps } = useReelSwiper({ items });
  const seenRef = useRef(new Set<number>());
  const videoElementsRef = useRef(new Map<number, HTMLVideoElement>());

  useEffect(() => {
    const item = items[activeIndex];
    if (item && !seenRef.current.has(item.id)) {
      seenRef.current.add(item.id);
      onView(item);
    }
  }, [activeIndex, items, onView]);

  // The `autoPlay` attribute only takes effect when a <video> element first mounts —
  // toggling it via a React prop after that (e.g. when activeIndex changes on scroll)
  // does not start or stop playback. Drive play/pause imperatively instead.
  useEffect(() => {
    videoElementsRef.current.forEach((video, index) => {
      if (index === activeIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeIndex]);

  const containerProps = getContainerProps();

  return (
    <div {...containerProps} className="reels-container" style={{ ...containerProps.style, height: 500, width: 280 }}>
      {items.map((item, index) => {
        const itemProps = getItemProps(item, index);
        return item.type === 'video' ? (
          <video
            {...itemProps}
            ref={(node) => {
              itemProps.ref(node);
              if (node) {
                videoElementsRef.current.set(index, node);
              } else {
                videoElementsRef.current.delete(index);
              }
            }}
            className="reels-item"
            style={{ ...itemProps.style, height: 500, width: 280, objectFit: 'cover' }}
            src={item.videoFiles[0]?.link}
            muted
            loop
            playsInline
          />
        ) : null;
      })}
    </div>
  );
}
