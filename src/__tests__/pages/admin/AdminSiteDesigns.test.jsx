import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = { siteDesigns: vi.fn(), siteDesignHistory: vi.fn(), siteDesign: vi.fn(), siteDesignCreate: vi.fn(), siteDesignSave: vi.fn(), siteDesignDuplicate: vi.fn(), siteDesignDelete: vi.fn(), siteDesignPublish: vi.fn(), siteDesignRollback: vi.fn(), siteDesignUploadLogo: vi.fn() };
vi.mock('../../../api/api', () => ({ adminAPI: new Proxy({}, { get: (_t, k) => (...a) => api[k](...a) }) }));
import AdminSiteDesigns, { DesignPreviewPane } from '../../../pages/admin/AdminSiteDesigns';
import { getActivePreview, stopPreview } from '../../../services/designPreview';

const cfg = () => ({
  brand: { logoType: 'text', logoUrl: '', logoText: 'KAYAD', brandTagline: 'Tagline', footerDescription: 'Footer text', footerCopyright: 'Copy' },
  colors: { primaryColor: '#176B87', primaryLight: '#13B8A6', primaryDark: '#0A3340', primaryGlow: 'rgba(23, 107, 135, 0.22)', accentColor: '#13B8A6', backgroundColor: '#F6FAF9', surfaceColor: '#EEF7F5', cardColor: '#FFFFFF', textColor: '#0A3340', textMutedColor: '#64748B', textDimColor: '#94A3B8', borderColor: '#D7E7E4', successColor: '#10B981', dangerColor: '#EF4444', warningColor: '#176B87', infoColor: '#176B87' },
  typography: { fontDisplay: 'Outfit', fontBody: 'Plus Jakarta Sans' },
  hero: { backgroundUrl: '/hero/x.jpg', overlayColor: '#EEF7F5', overlayOpacityPct: 18, showVehicleInfoCards: true, rotationSeconds: 6.5 },
  announcement: { enabled: true, text: 'Welcome', backgroundColor: '#0A3340', textColor: '#FFFFFF', heightPx: 36, scrollSeconds: 34, direction: 'left', transition: 'scroll' },
});
const D1 = (over = {}) => ({ id: 'd1', name: 'Spring', description: 'desc', revision: 1, config: cfg(), createdAt: '2026-11-01T08:00:00Z', updatedAt: '2026-11-01T08:00:00Z', isPublished: false, hasUnpublishedChanges: false, ...over });
const overview = (over = {}) => ({ success: true, designs: [{ ...D1(), config: undefined }], starters: [{ id: 'kayad-default', name: 'KAYAD default' }], published: null, live: cfg(), ...over });

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  api.siteDesigns.mockResolvedValue(overview()); api.siteDesignHistory.mockResolvedValue({ history: [] });
  api.siteDesign.mockResolvedValue({ design: D1() });
});
const open = async (user) => { render(<AdminSiteDesigns />); await user.click(await screen.findByRole('button', { name: /Spring/ })); await screen.findByLabelText('Design name'); };

describe('AdminSiteDesigns', () => {
  test('lists saved designs, says nothing is published yet, and offers only supported areas', async () => {
    render(<AdminSiteDesigns />);
    expect(await screen.findByTestId('published-summary')).toHaveTextContent(/No design has been published/);
    expect(screen.getByRole('button', { name: /Spring/ })).toBeInTheDocument();
    expect(screen.getByText(/Page sections and header layouts are not configurable here/)).toBeInTheDocument();
  });
  test('identifies the live design and flags unpublished edits and out-of-editor drift', async () => {
    api.siteDesigns.mockResolvedValue(overview({ designs: [{ ...D1({ isPublished: true, hasUnpublishedChanges: true }), config: undefined }], published: { id: 'p1', designId: 'd1', designName: 'Spring', kind: 'publish', publishedAt: '2026-11-01T09:00:00Z', liveMatchesPublication: false } }));
    render(<AdminSiteDesigns />);
    expect(await screen.findByTestId('badge-live-Spring')).toHaveTextContent('LIVE');
    expect(screen.getByText(/unpublished edits/)).toBeInTheDocument();
    expect(screen.getByTestId('drift-note')).toHaveTextContent(/changed outside this editor/);
  });
  test('editing updates the preview immediately (colours, logo text, announcement, mobile viewport) and does not call the server', async () => {
    const user = userEvent.setup(); await open(user);
    fireEvent.change(screen.getByLabelText('Logo text'), { target: { value: 'ACME' } });
    expect(within(screen.getByTestId('preview-pane')).getAllByText('ACME').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: 'Announcement strip' }));
    fireEvent.change(screen.getByLabelText('Announcement text'), { target: { value: 'Big sale' } });
    expect(screen.getByTestId('preview-announcement')).toHaveTextContent('Big sale');
    await user.click(screen.getByLabelText('Show announcement strip')); expect(screen.queryByTestId('preview-announcement')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Mobile' })); expect(screen.getByTestId('preview-pane')).toHaveAttribute('data-viewport', 'mobile');
    await user.click(screen.getByRole('tab', { name: 'Hero' })); await user.click(screen.getByLabelText('Show vehicle info cards')); expect(screen.queryByTestId('preview-info-card')).toBeNull();
    expect(api.siteDesignSave).not.toHaveBeenCalled(); expect(api.siteDesignPublish).not.toHaveBeenCalled();
  });
  test('Save draft sends the edited config with the loaded revision and reports that the site did not change', async () => {
    const user = userEvent.setup(); await open(user);
    fireEvent.change(screen.getByLabelText('Logo text'), { target: { value: 'ACME' } });
    api.siteDesignSave.mockResolvedValue({ design: D1({ revision: 2, config: { ...cfg(), brand: { ...cfg().brand, logoText: 'ACME' } } }) });
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.siteDesignSave).toHaveBeenCalledWith('d1', expect.objectContaining({ expectedRevision: 1, config: expect.objectContaining({ brand: expect.objectContaining({ logoText: 'ACME' }) }) })));
    expect(await screen.findByTestId('notice')).toHaveTextContent(/public site has not changed/);
  });
  test('a failed save shows the server error, field messages and does not claim success', async () => {
    const user = userEvent.setup(); await open(user);
    fireEvent.change(screen.getByLabelText('Logo text'), { target: { value: 'X' } });
    api.siteDesignSave.mockRejectedValue({ response: { data: { message: 'The design has invalid settings.', errors: { 'brand.logoText': 'Invalid value.' } } } });
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByTestId('notice')).toHaveTextContent(/invalid settings/);
    expect(screen.getByText('Invalid value.')).toBeInTheDocument();
    expect(screen.queryByText(/Draft saved/)).toBeNull();
  });
  test('unsaved edits survive a refresh (remount) and can be discarded', async () => {
    const user = userEvent.setup(); const first = render(<AdminSiteDesigns />);
    await user.click(await screen.findByRole('button', { name: /Spring/ })); await screen.findByLabelText('Design name');
    fireEvent.change(screen.getByLabelText('Logo text'), { target: { value: 'KEPT' } });
    await waitFor(() => expect(localStorage.getItem('kayad_design_draft_d1')).toContain('KEPT'));
    first.unmount();
    render(<AdminSiteDesigns />); await user.click(await screen.findByRole('button', { name: /Spring/ })); await screen.findByTestId('restored-note');
    expect(screen.getByLabelText('Logo text')).toHaveValue('KEPT');
    await user.click(screen.getByRole('button', { name: 'Discard them' })); expect(screen.getByLabelText('Logo text')).toHaveValue('KAYAD'); expect(localStorage.getItem('kayad_design_draft_d1')).toBeNull();
  });
  test('Publish is blocked while there are unsaved edits, then needs an explicit confirmation and reports the result', async () => {
    const user = userEvent.setup(); await open(user);
    fireEvent.change(screen.getByLabelText('Logo text'), { target: { value: 'Z' } });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled(); expect(screen.getByTestId('dirty-note')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Logo text'), { target: { value: 'KAYAD' } });
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const dlg = await screen.findByRole('dialog', { name: 'Publish this design?' }); expect(api.siteDesignPublish).not.toHaveBeenCalled();
    api.siteDesignPublish.mockResolvedValue({ publication: { id: 'p1' } });
    await user.click(within(dlg).getByRole('button', { name: 'Publish to the public site' }));
    await waitFor(() => expect(api.siteDesignPublish).toHaveBeenCalledWith('d1', 1));
    expect(await screen.findByTestId('notice')).toHaveTextContent(/is now live/);
  });
  test('cancelling the publish dialog changes nothing', async () => {
    const user = userEvent.setup(); await open(user); await user.click(screen.getByRole('button', { name: 'Publish' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' })); expect(api.siteDesignPublish).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).toBeNull();
  });
  test('delete needs confirmation; a refused delete (live design) shows the reason', async () => {
    const user = userEvent.setup(); await open(user); await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dlg = await screen.findByRole('dialog', { name: 'Delete this design?' }); expect(api.siteDesignDelete).not.toHaveBeenCalled();
    api.siteDesignDelete.mockRejectedValue({ response: { data: { message: 'This design is the one currently live.' } } });
    await user.click(within(dlg).getByRole('button', { name: 'Delete design' }));
    expect(await screen.findByTestId('notice')).toHaveTextContent(/currently live/); expect(screen.getByLabelText('Design name')).toBeInTheDocument();
  });
  test('delete success removes the design from the editor and reloads the list', async () => {
    const user = userEvent.setup(); await open(user); await user.click(screen.getByRole('button', { name: 'Delete' }));
    api.siteDesignDelete.mockResolvedValue({ deleted: { id: 'd1' } }); api.siteDesigns.mockResolvedValue(overview({ designs: [] }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete design' }));
    await waitFor(() => expect(api.siteDesignDelete).toHaveBeenCalledWith('d1')); await screen.findByText(/No saved designs yet/); expect(screen.queryByLabelText('Design name')).toBeNull();
  });
  test('create from the current site / a starter / a design, then open it', async () => {
    const user = userEvent.setup(); render(<AdminSiteDesigns />); await user.click(await screen.findByRole('button', { name: 'New design' }));
    await user.type(screen.getByLabelText('New design name'), 'Autumn'); await user.selectOptions(screen.getByLabelText('Start from'), 'starter:kayad-default');
    api.siteDesignCreate.mockResolvedValue({ design: D1({ id: 'd2', name: 'Autumn' }) }); api.siteDesign.mockResolvedValue({ design: D1({ id: 'd2', name: 'Autumn' }) });
    await user.click(screen.getByRole('button', { name: 'Create design' }));
    await waitFor(() => expect(api.siteDesignCreate).toHaveBeenCalledWith({ name: 'Autumn', description: undefined, from: { type: 'starter', id: 'kayad-default' } }));
    await waitFor(() => expect(screen.getByLabelText('Design name')).toHaveValue('Autumn'));
  });
  test('duplicate and rename call the server', async () => {
    const user = userEvent.setup(); await open(user);
    api.siteDesignDuplicate.mockResolvedValue({ design: D1({ id: 'd3', name: 'Spring (copy)' }) }); api.siteDesign.mockResolvedValue({ design: D1({ id: 'd3', name: 'Spring (copy)' }) });
    await user.click(screen.getByRole('button', { name: 'Duplicate' })); await waitFor(() => expect(api.siteDesignDuplicate).toHaveBeenCalledWith('d1'));
    await waitFor(() => expect(screen.getByLabelText('Design name')).toHaveValue('Spring (copy)'));
    fireEvent.change(screen.getByLabelText('Design name'), { target: { value: 'Renamed' } });
    api.siteDesignSave.mockResolvedValue({ design: D1({ id: 'd3', name: 'Renamed', revision: 2 }) });
    await user.click(screen.getByRole('button', { name: 'Save draft' })); await waitFor(() => expect(api.siteDesignSave).toHaveBeenCalledWith('d3', expect.objectContaining({ name: 'Renamed' })));
  });
  test('history shows what is live and restores an earlier version only after confirmation', async () => {
    api.siteDesignHistory.mockResolvedValue({ history: [{ id: 'p2', designName: 'Summer', kind: 'publish', publishedAt: '2026-11-02T09:00:00Z' }, { id: 'p1', designName: 'Spring', kind: 'publish', publishedAt: '2026-11-01T09:00:00Z' }] });
    const user = userEvent.setup(); render(<AdminSiteDesigns />);
    const hist = await screen.findByTestId('history'); expect(within(hist).getAllByRole('button', { name: 'Restore this version' })).toHaveLength(1); expect(hist).toHaveTextContent('(live)');
    await user.click(within(hist).getByRole('button', { name: 'Restore this version' }));
    const dlg = await screen.findByRole('dialog', { name: 'Restore this version?' }); expect(api.siteDesignRollback).not.toHaveBeenCalled();
    api.siteDesignRollback.mockResolvedValue({ publication: { id: 'p3' } });
    await user.click(within(dlg).getByRole('button', { name: 'Restore and publish' })); await waitFor(() => expect(api.siteDesignRollback).toHaveBeenCalledWith('p1'));
    expect(await screen.findByTestId('notice')).toHaveTextContent(/is now live|It is now live/);
  });
  test('preview on the site stores the DRAFT for this tab only and does not publish', async () => {
    const user = userEvent.setup(); const openSpy = vi.spyOn(window, 'open').mockReturnValue(null); await open(user);
    fireEvent.change(screen.getByLabelText('Logo text'), { target: { value: 'PREVIEWED' } });
    await user.click(screen.getByRole('button', { name: 'Preview on the site' }));
    expect(getActivePreview()?.config.brand.logoText).toBe('PREVIEWED'); expect(openSpy).toHaveBeenCalled(); expect(api.siteDesignPublish).not.toHaveBeenCalled(); stopPreview(); openSpy.mockRestore();
  });
  test('logo upload is sent as multipart FormData (field "logo"), applies to the draft only, and rejects bad files client-side', async () => {
    const user = userEvent.setup({ applyAccept: false }); await open(user);
    api.siteDesignUploadLogo.mockResolvedValue({ url: 'https://res.cloudinary.com/x/logo.png' });
    const input = screen.getByLabelText('Upload logo');
    await user.upload(input, new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' }));
    await waitFor(() => expect(api.siteDesignUploadLogo).toHaveBeenCalledTimes(1));
    const form = api.siteDesignUploadLogo.mock.calls[0][0]; expect(form).toBeInstanceOf(FormData); expect(form.get('logo')).toBeInstanceOf(File);
    await waitFor(() => expect(screen.getByTestId('preview-logo')).toHaveAttribute('src', 'https://res.cloudinary.com/x/logo.png'));
    expect(api.siteDesignSave).not.toHaveBeenCalled();
    await waitFor(() => expect(input).not.toBeDisabled());
    await user.upload(input, new File([new Uint8Array(10)], 'x.gif', { type: 'image/gif' }));
    expect(await screen.findByTestId('notice')).toHaveTextContent(/PNG, JPEG or WebP/); expect(api.siteDesignUploadLogo).toHaveBeenCalledTimes(1);
  });
  test('a failed logo upload keeps the current logo and says so', async () => {
    const user = userEvent.setup(); await open(user); api.siteDesignUploadLogo.mockRejectedValue({ response: { data: { message: 'The image storage service did not accept the upload.' } } });
    await user.upload(screen.getByLabelText('Upload logo'), new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' }));
    expect(await screen.findByTestId('notice')).toHaveTextContent(/current logo was not changed/); expect(screen.queryByTestId('preview-logo')).toBeNull();
  });
  test('load error is shown honestly', async () => {
    api.siteDesigns.mockRejectedValue({ response: { data: { message: 'Forbidden' } } }); render(<AdminSiteDesigns />); expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
  });
});

describe('DesignPreviewPane', () => {
  test('desktop and mobile widths, image logo when configured', () => {
    const c = cfg(); c.brand = { ...c.brand, logoType: 'image', logoUrl: '/branding/kayad-road-mark.svg' };
    const { rerender } = render(<DesignPreviewPane config={c} mobile={false} />);
    expect(screen.getByTestId('preview-logo')).toHaveAttribute('src', '/branding/kayad-road-mark.svg'); expect(screen.getByTestId('preview-pane')).toHaveAttribute('data-viewport', 'desktop');
    rerender(<DesignPreviewPane config={c} mobile />); expect(screen.getByTestId('preview-pane')).toHaveStyle({ width: '360px' });
  });
});
