import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({ uploadLogo: vi.fn(), getConfig: vi.fn(), updateConfig: vi.fn(), getAuditLog: vi.fn(), toast: vi.fn() }));
vi.mock('../../../api/api', async (orig) => {
  const real: any = await orig();
  return { ...real, adminAPI: { ...real.adminAPI, uploadLogo: (...a: any[]) => m.uploadLogo(...a), getConfig: (...a: any[]) => m.getConfig(...a), updateConfig: (...a: any[]) => m.updateConfig(...a), getAuditLog: (...a: any[]) => m.getAuditLog(...a) } };
});
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'superadmin', name: 'Super' }, isSuperAdmin: true }) }));

import AdminSettings from '../../../pages/admin/AdminSettings';
import { detectImageType } from '../../../components/admin/LogoUploader';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4];
const file = (bytes: number[], name = 'logo.png', type = 'image/png') => new File([new Uint8Array(bytes)], name, { type });
const cfg = (branding: any = {}) => ({ success: true, config: { platformName: 'KAYAD', branding } });

beforeEach(() => {
  Object.values(m).forEach((f: any) => f.mockReset?.());
  m.getConfig.mockResolvedValue(cfg({ logoType: 'image', logoUrl: '/branding/kayad-road-mark.svg' }));
  m.getAuditLog.mockResolvedValue({ entries: [] });
});
const openBranding = async () => {
  render(<MemoryRouter><AdminSettings /></MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: 'Branding' }));
  await screen.findByText('Logo & Identity');
};
const chooser = () => document.querySelector('input[type="file"]') as HTMLInputElement;

describe('Branding tab - logo upload', () => {
  it('Choose image opens the file picker and the Image Upload type is selectable', async () => {
    await openBranding();
    const click = vi.spyOn(chooser(), 'click');
    await userEvent.click(screen.getByRole('button', { name: 'Choose image' }));
    expect(click).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Text Logo' }));
    expect(screen.queryByRole('button', { name: 'Choose image' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Image Upload' }));
    expect(screen.getByRole('button', { name: 'Choose image' })).toBeInTheDocument();
  });
  it('a valid PNG is sent as multipart, the new logo is shown and reported as applied', async () => {
    m.uploadLogo.mockResolvedValue({ success: true, url: '/api/admin/public/logo/0123456789abcdef.png', storage: 'database' });
    await openBranding();
    fireEvent.change(chooser(), { target: { files: [file(PNG)] } });
    await screen.findByText(/applied to the site/);
    const form = m.uploadLogo.mock.calls[0][0] as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect((form.get('logo') as File).name).toBe('logo.png');
    expect(screen.getByAltText('Current logo')).toHaveAttribute('src', '/api/admin/public/logo/0123456789abcdef.png');
    expect(screen.getAllByText(/stored on the platform/i).length).toBeGreaterThanOrEqual(2); // status line + source label
  });
  it.each([
    ['wrong type', file(PNG, 'a.gif', 'image/gif'), /PNG, JPEG or WebP/],
    ['renamed non-image', file([0x4d, 0x5a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'logo.png'), /not a valid/],
    ['empty', file([], 'logo.png'), /empty/],
  ])('%s is refused before any request', async (_n, f, msg) => {
    await openBranding();
    fireEvent.change(chooser(), { target: { files: [f] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(msg as RegExp);
    expect(m.uploadLogo).not.toHaveBeenCalled();
  });
  it('a server refusal shows its message and code, keeps the old logo and shows no success', async () => {
    m.uploadLogo.mockRejectedValue({ response: { data: { message: 'The logo could not be saved. Nothing was changed.', code: 'LOGO_STORAGE_UNAVAILABLE' } } });
    await openBranding();
    fireEvent.change(chooser(), { target: { files: [file(PNG)] } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('LOGO_STORAGE_UNAVAILABLE');
    expect(alert).toHaveTextContent(/current logo was not changed/i);
    expect(screen.getByAltText('Current logo')).toHaveAttribute('src', '/branding/kayad-road-mark.svg');
    expect(screen.queryByText(/applied to the site/)).toBeNull();
  });
  it('controls are disabled during an upload, so it cannot be started twice', async () => {
    let done: any; m.uploadLogo.mockReturnValue(new Promise((r) => { done = r; }));
    await openBranding();
    fireEvent.change(chooser(), { target: { files: [file(PNG)] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled());
    fireEvent.change(chooser(), { target: { files: [file(PNG)] } });
    expect(m.uploadLogo).toHaveBeenCalledTimes(1);
    done({ success: true, url: '/api/admin/public/logo/0123456789abcdef.png' });
    await screen.findByText(/applied to the site/);
  });
  it('Use default logo is a draft change that Save then persists; Save is off until something changed', async () => {
    m.getConfig.mockResolvedValue(cfg({ logoType: 'image', logoUrl: '/api/admin/public/logo/0123456789abcdef.png' }));
    m.updateConfig.mockResolvedValue({ success: true, config: {} });
    await openBranding();
    const save = screen.getByRole('button', { name: 'Save Branding Settings' });
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Use default logo' }));
    expect(screen.getByText(/unsaved branding changes/i)).toBeInTheDocument();
    await userEvent.click(save);
    await waitFor(() => expect(m.updateConfig).toHaveBeenCalledTimes(1));
    expect(m.updateConfig.mock.calls[0][0].branding.logoUrl).toBe('/branding/kayad-road-mark.svg');
  });
  it('when settings could not be loaded, saving is disabled and the reason with a retry is shown', async () => {
    m.getConfig.mockRejectedValue(new Error('down'));
    render(<MemoryRouter><AdminSettings /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Branding' }));
    expect(await screen.findAllByText(/Could not load saved settings/)).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Save Branding Settings' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retry loading' })).toBeInTheDocument();
  });
  it('detectImageType reads the real signature', async () => {
    expect(await detectImageType(file(PNG))).toBe('image/png');
    expect(await detectImageType(file([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0], 'a.jpg', 'image/jpeg'))).toBe('image/jpeg');
    expect(await detectImageType(file([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], 'a.webp', 'image/webp'))).toBe('image/webp');
    expect(await detectImageType(file([1, 2, 3]))).toBeNull();
  });
});

describe('Branding tab - save control beside the logo', () => {
  it('has a Save logo & identity button that is disabled until something changes, then saves', async () => {
    m.updateConfig.mockResolvedValue({ success: true, config: { branding: {} } });
    await openBranding();
    const save = screen.getByRole('button', { name: 'Save logo & identity' });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Brand Tagline'), ' x');
    expect(screen.getByRole('button', { name: 'Save logo & identity' })).toBeEnabled();
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
  });
});
