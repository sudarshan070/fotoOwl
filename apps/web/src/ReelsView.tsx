import { useReelSwiper } from 'media-ui-react';
import type { MediaItem } from 'media-core';
import { useEffect, useRef } from 'react';

export function ReelsView({ items, onView }: { items: MediaItem[]; onView: (item: MediaItem) => void }) {
  const { activeIndex, getContainerProps, getItemProps } = useReelSwiper({ items });
  const seenRef = useRef(new Set<number>());

  useEffect(() => {
    const item = items[activeIndex];
    if (item && !seenRef.current.has(item.id)) {
      seenRef.current.add(item.id);
      onView(item);
    }
  }, [activeIndex, items, onView]);

  const containerProps = getContainerProps();

  return (
    <div {...containerProps} style={{ ...containerProps.style, height: 500, width: 280 }}>
      {items.map((item, index) => {
        const itemProps = getItemProps(item, index);
        return item.type === 'video' ? (
          <video
            {...itemProps}
            style={{ ...itemProps.style, height: 500, width: 280, objectFit: 'cover' }}
            src={item.videoFiles[0]?.link}
            muted
            loop
            autoPlay={index === activeIndex}
          />
        ) : null;
      })}
    </div>
  );
}
