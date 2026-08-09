import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { useLightbox } from './use-lightbox';

function LightboxHarness({ onClose }: { onClose: () => void }) {
  const { currentItem, getOverlayProps, getNextProps, getPrevProps, getCloseProps } = useLightbox({
    items: ['a', 'b', 'c'],
    initialIndex: 0,
    onClose
  });
  return (
    <div {...getOverlayProps()}>
      <span>current:{currentItem}</span>
      <button {...getPrevProps()}>Previous</button>
      <button {...getNextProps()}>Next</button>
      <button {...getCloseProps()}>Close</button>
    </div>
  );
}

describe('useLightbox', () => {
  it('navigates forward and backward via the next/prev prop-getters', () => {
    render(<LightboxHarness onClose={vi.fn()} />);
    expect(screen.getByText('current:a')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Next'));
    expect(screen.getByText('current:b')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Previous'));
    expect(screen.getByText('current:a')).toBeTruthy();
  });

  it('navigates via ArrowRight/ArrowLeft keydown and closes on Escape', () => {
    const onClose = vi.fn();
    render(<LightboxHarness onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('current:b')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('current:a')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables Previous at the first item and Next at the last item', () => {
    render(<LightboxHarness onClose={vi.fn()} />);
    expect((screen.getByLabelText('Previous') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText('Next'));
    fireEvent.click(screen.getByLabelText('Next'));
    expect((screen.getByLabelText('Next') as HTMLButtonElement).disabled).toBe(true);
  });
});
