import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../components/ui';

describe('Modal dialog behaviour', () => {
  it('is a labelled modal dialog with a named close button', () => {
    render(<Modal isOpen onClose={() => {}} title="Details"><p>Body</p></Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });
  it('closes on Escape and on a tap on the backdrop, but not on a tap inside the panel', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal isOpen onClose={onClose} title="Details"><p>Body</p></Modal>);
    fireEvent.mouseDown(screen.getByText('Body'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('stops the page behind from scrolling while open and restores it on close', () => {
    document.body.style.overflow = '';
    const { rerender } = render(<Modal isOpen onClose={() => {}} title="T"><p>x</p></Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Modal isOpen={false} onClose={() => {}} title="T"><p>x</p></Modal>);
    expect(document.body.style.overflow).toBe('');
  });
  it('moves focus into the dialog and gives it back to the opener', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { rerender } = render(<Modal isOpen onClose={() => {}} title="T"><p>x</p></Modal>);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
    rerender(<Modal isOpen={false} onClose={() => {}} title="T"><p>x</p></Modal>);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
