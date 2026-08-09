import type { Meta, StoryObj } from '@storybook/react';
import { useReelSwiper } from './use-reel-swiper';

function ReelSwiperExample() {
  const items = ['Reel A', 'Reel B', 'Reel C'];
  const { activeIndex, getContainerProps, getItemProps } = useReelSwiper({ items });

  return (
    <div>
      <p>Active: {activeIndex}</p>
      <div {...getContainerProps()} style={{ ...getContainerProps().style, height: 300, width: 200 }}>
        {items.map((item, index) => (
          <div
            {...getItemProps(item, index)}
            style={{ ...getItemProps(item, index).style, height: 300, width: 200, background: index % 2 ? '#333' : '#666', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof ReelSwiperExample> = { title: 'media-ui-react/useReelSwiper', component: ReelSwiperExample };
export default meta;
type Story = StoryObj<typeof ReelSwiperExample>;
export const Default: Story = {};
