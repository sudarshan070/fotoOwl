import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { useGrid } from './use-grid';

function GridExample() {
  const [items, setItems] = useState(Array.from({ length: 12 }, (_, i) => ({ id: i })));
  const [loading, setLoading] = useState(false);
  const { getGridProps, getItemProps, getSentinelProps } = useGrid({
    items,
    hasMore: items.length < 40,
    loading,
    loadMore: () => {
      setLoading(true);
      setTimeout(() => {
        setItems((prev) => [...prev, ...Array.from({ length: 12 }, (_, i) => ({ id: prev.length + i }))]);
        setLoading(false);
      }, 300);
    }
  });

  return (
    <div>
      <div {...getGridProps()} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {items.map((item, index) => (
          <div {...getItemProps(item, index)} style={{ background: '#ddd', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.id}
          </div>
        ))}
      </div>
      <div {...getSentinelProps()} style={{ height: 1 }} />
      {loading && <p>Loading more...</p>}
    </div>
  );
}

const meta: Meta<typeof GridExample> = { title: 'media-ui-react/useGrid', component: GridExample };
export default meta;
type Story = StoryObj<typeof GridExample>;
export const Default: Story = {};
