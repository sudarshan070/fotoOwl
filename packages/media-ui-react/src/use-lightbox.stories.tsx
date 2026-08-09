import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { useLightbox } from './use-lightbox';

function LightboxExample() {
  const [open, setOpen] = useState(true);
  const { currentItem, getOverlayProps, getNextProps, getPrevProps, getCloseProps } = useLightbox({
    items: ['🐶', '🐱', '🦊', '🐻'],
    initialIndex: 0,
    onClose: () => setOpen(false)
  });

  if (!open) return <button onClick={() => setOpen(true)}>Reopen</button>;

  return (
    <div {...getOverlayProps()} style={{ background: '#000a', padding: 40, display: 'inline-block' }}>
      <button {...getPrevProps()}>◀</button>
      <span style={{ fontSize: 48, margin: '0 24px' }}>{currentItem}</span>
      <button {...getNextProps()}>▶</button>
      <button {...getCloseProps()} style={{ display: 'block', marginTop: 16 }}>Close</button>
    </div>
  );
}

const meta: Meta<typeof LightboxExample> = { title: 'media-ui-react/useLightbox', component: LightboxExample };
export default meta;
type Story = StoryObj<typeof LightboxExample>;
export const Default: Story = {};
