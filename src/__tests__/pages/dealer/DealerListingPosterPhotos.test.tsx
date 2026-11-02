import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ setCoverImage: vi.fn(), addCarImages: vi.fn(), deleteCarImage: vi.fn() }));
vi.mock('../../../services/vehicleApi', async (orig) => ({ ...(await orig<any>()), setCoverImage: m.setCoverImage, addCarImages: m.addCarImages, deleteCarImage: m.deleteCarImage }));

import DealerListingPhotoPicker, { acceptPhotos, makePoster } from '../../../pages/dealer/dashboard/DealerListingPhotoPicker';
import DealerListingPhotos from '../../../pages/dealer/dashboard/DealerListingPhotos';
import { useState } from 'react';

beforeAll(() => {
  (URL as any).createObjectURL = vi.fn((f: File) => `blob:${f.name}`);
  (URL as any).revokeObjectURL = vi.fn();
});
beforeEach(() => vi.clearAllMocks());

const img = (name: string, type = 'image/jpeg', size = 1000) => new File([new Uint8Array(size)], name, { type, lastModified: 1 });

describe('photo helpers', () => {
  it('makePoster moves the chosen photo to the front and keeps the order of the rest', () => {
    const [a, b, c] = [img('a.jpg'), img('b.jpg'), img('c.jpg')];
    expect(makePoster([a, b, c], 2).map((f) => f.name)).toEqual(['c.jpg', 'a.jpg', 'b.jpg']);
    expect(makePoster([a, b, c], 0)).toEqual([a, b, c]);
  });
  it('acceptPhotos skips duplicates, wrong types, oversize files and anything over the limit, and says why', () => {
    const cur = [img('a.jpg')];
    const r = acceptPhotos(cur, [img('a.jpg'), img('doc.pdf', 'application/pdf'), img('big.jpg', 'image/jpeg', 6 * 1024 * 1024), img('ok.png', 'image/png')], 2);
    expect(r.next.map((f) => f.name)).toEqual(['a.jpg', 'ok.png']);
    expect(r.message).toMatch(/doc\.pdf.*only JPG, PNG or WEBP/);
    expect(r.message).toMatch(/big\.jpg.*larger than 5 MB/);
    const full = acceptPhotos([img('a.jpg'), img('b.jpg')], [img('c.jpg')], 2);
    expect(full.message).toMatch(/limit of 2 photos/);
  });
});

function Harness() {
  const [files, setFiles] = useState<File[]>([]);
  return <DealerListingPhotoPicker files={files} onChange={setFiles} max={10} />;
}

describe('new-listing photo picker', () => {
  it('previews every chosen photo, marks the first as poster, and Make poster reorders', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    fireEvent.change(document.getElementById('listing-images')!, { target: { files: [img('front.jpg'), img('side.jpg'), img('rear.jpg')] } });
    const list = await screen.findByRole('list', { name: 'Selected photos' });
    expect(within(list).getAllByRole('img')).toHaveLength(3);
    expect(within(list).getAllByRole('img')[0]).toHaveAttribute('alt', expect.stringContaining('(poster)'));
    await user.click(screen.getByRole('button', { name: 'Make photo 3 the poster' }));
    const after = within(screen.getByRole('list', { name: 'Selected photos' })).getAllByRole('img');
    expect(after[0]).toHaveAttribute('alt', expect.stringContaining('rear.jpg'));
    expect(after[0]).toHaveAttribute('alt', expect.stringContaining('(poster)'));
  });
  it('a photo can be removed before saving, and later picks add to the selection', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = document.getElementById('listing-images')!;
    fireEvent.change(input, { target: { files: [img('a.jpg'), img('b.jpg')] } });
    await user.click(await screen.findByRole('button', { name: 'Remove photo 1' }));
    expect(within(screen.getByRole('list', { name: 'Selected photos' })).getAllByRole('img')).toHaveLength(1);
    fireEvent.change(input, { target: { files: [img('c.jpg')] } });
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Selected photos' })).getAllByRole('img')).toHaveLength(2));
  });
});

describe('existing-listing photos: choose the poster', () => {
  const imgs = [{ url: 'u1', public_id: 'p1' }, { url: 'u2', public_id: 'p2' }, { url: 'u3', public_id: 'p3' }];
  it('first photo is the poster; Make poster calls the server and shows the order it returns', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    m.setCoverImage.mockResolvedValue({ success: true, data: { images: [imgs[2], imgs[0], imgs[1]], coverImage: 0 } });
    render(<DealerListingPhotos carId="c1" initialImages={imgs} onChanged={onChanged} />);
    expect(screen.queryByRole('button', { name: 'Make photo 1 the poster' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Make photo 3 the poster' }));
    await waitFor(() => expect(m.setCoverImage).toHaveBeenCalledWith('c1', 2));
    expect(await screen.findByRole('status')).toHaveTextContent(/poster updated/i);
    expect(within(screen.getByRole('list', { name: 'Current photos' })).getAllByRole('img')[0]).toHaveAttribute('src', 'u3');
    expect(onChanged).toHaveBeenCalled();
  });
  it('a server refusal is shown and the order is not changed', async () => {
    const user = userEvent.setup();
    m.setCoverImage.mockRejectedValue(new Error('boom'));
    render(<DealerListingPhotos carId="c1" initialImages={imgs} />);
    await user.click(screen.getByRole('button', { name: 'Make photo 2 the poster' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Current photos' })).getAllByRole('img')[0]).toHaveAttribute('src', 'u1');
  });
  it('files picked for upload are previewed and can be dropped before uploading', async () => {
    const user = userEvent.setup();
    render(<DealerListingPhotos carId="c1" initialImages={imgs} />);
    fireEvent.change(document.getElementById('listing-add-photos')!, { target: { files: [img('new1.jpg'), img('new2.jpg')] } });
    const ready = await screen.findByRole('list', { name: 'Photos ready to upload' });
    expect(within(ready).getAllByRole('img')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Do not upload new1.jpg' }));
    expect(within(screen.getByRole('list', { name: 'Photos ready to upload' })).getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^Upload 1$/ })).toBeEnabled();
  });
});
