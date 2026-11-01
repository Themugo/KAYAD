import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const getDealerPaperwork = vi.fn();
const updateDealerPaperwork = vi.fn();
vi.mock('../../../api/api', () => ({ adminAPI: { getDealerPaperwork: (...a) => getDealerPaperwork(...a), updateDealerPaperwork: (...a) => updateDealerPaperwork(...a) } }));

import AdminSettingsDealerPaperwork, { previewFor } from '../../../pages/admin/AdminSettingsDealerPaperwork';

const item = (key, label, over = {}) => ({ key, label, help: `${label} help`, kind: 'entry', enabled: true, required: false, ...over });
const items = (over = {}) => [item('governmentId', 'Government ID', over.governmentId), item('kraPin', 'KRA PIN', over.kraPin), item('phoneVerification', 'Phone verification', { kind: 'verification', ...(over.phoneVerification || {}) })];

beforeEach(() => vi.clearAllMocks());

describe('previewFor', () => {
  const mk = (...modes) => modes.map(([label, mode]) => ({ label, mode }));
  test('no paperwork at all', () => expect(previewFor(mk(['A', 'off'], ['B', 'off']))).toMatch(/not be asked for any paperwork/i));
  test('all optional: nothing blocks approval', () => expect(previewFor(mk(['A', 'optional']))).toMatch(/No document is mandatory/));
  test('required items are named', () => expect(previewFor(mk(['KRA PIN', 'required'], ['ID', 'optional']))).toMatch(/must provide: KRA PIN/));
});

describe('AdminSettingsDealerPaperwork', () => {
  test('shows the server configuration and the default is onboarding-friendly (nothing required)', async () => {
    getDealerPaperwork.mockResolvedValue({ items: items(), revision: 0, canChange: true });
    render(<AdminSettingsDealerPaperwork />);
    expect(await screen.findByLabelText('KRA PIN')).toHaveValue('optional');
    expect(screen.getByRole('status', { name: /effect of these settings/i })).toHaveTextContent(/No document is mandatory/);
  });

  test('non-owner cannot change anything', async () => {
    getDealerPaperwork.mockResolvedValue({ items: items(), revision: 0, canChange: false });
    render(<AdminSettingsDealerPaperwork />);
    expect(await screen.findByLabelText('KRA PIN')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
    expect(screen.getByText(/Only the platform owner can change/i)).toBeInTheDocument();
  });

  test('previews the effect BEFORE saving, then saves with the loaded revision and shows the server answer', async () => {
    const user = userEvent.setup();
    getDealerPaperwork.mockResolvedValue({ items: items(), revision: 3, canChange: true });
    updateDealerPaperwork.mockResolvedValue({ items: items({ kraPin: { required: true } }), revision: 4 });
    render(<AdminSettingsDealerPaperwork />);
    await user.selectOptions(await screen.findByLabelText('KRA PIN'), 'required');
    expect(screen.getByRole('status', { name: /effect of these settings/i })).toHaveTextContent(/If you save:.*must provide: KRA PIN/);
    expect(updateDealerPaperwork).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Save 1 change/ }));
    await waitFor(() => expect(updateDealerPaperwork).toHaveBeenCalledWith({ expectedRevision: 3, items: { kraPin: { enabled: true, required: true } } }));
    expect(await screen.findByText(/nothing already submitted was deleted/i)).toBeInTheDocument();
    expect(screen.getByLabelText('KRA PIN')).toHaveValue('required');
  });

  test('"No paperwork at all" turns every item off in the draft and only saves on confirmation', async () => {
    const user = userEvent.setup();
    getDealerPaperwork.mockResolvedValue({ items: items(), revision: 0, canChange: true });
    render(<AdminSettingsDealerPaperwork />);
    await user.click(await screen.findByRole('button', { name: /No paperwork at all/i }));
    expect(screen.getByLabelText('Government ID')).toHaveValue('off');
    expect(screen.getByRole('status', { name: /effect of these settings/i })).toHaveTextContent(/not be asked for any paperwork/i);
    expect(updateDealerPaperwork).not.toHaveBeenCalled();
  });

  test('a failed save says nothing was changed', async () => {
    const user = userEvent.setup();
    getDealerPaperwork.mockResolvedValue({ items: items(), revision: 0, canChange: true });
    updateDealerPaperwork.mockRejectedValue({ response: { status: 400, data: { message: 'bad' } } });
    render(<AdminSettingsDealerPaperwork />);
    await user.selectOptions(await screen.findByLabelText('KRA PIN'), 'off');
    await user.click(screen.getByRole('button', { name: /Save 1 change/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Not saved: bad.*Nothing was changed/);
  });

  test('a revision conflict reloads the latest values', async () => {
    const user = userEvent.setup();
    getDealerPaperwork.mockResolvedValueOnce({ items: items(), revision: 0, canChange: true }).mockResolvedValue({ items: items({ kraPin: { required: true } }), revision: 1, canChange: true });
    updateDealerPaperwork.mockRejectedValue({ response: { status: 409, data: { code: 'DEALER_PAPERWORK_CONFLICT' } } });
    render(<AdminSettingsDealerPaperwork />);
    await user.selectOptions(await screen.findByLabelText('Government ID'), 'off');
    await user.click(screen.getByRole('button', { name: /Save 1 change/ }));
    await waitFor(() => expect(screen.getByLabelText('KRA PIN')).toHaveValue('required'));
  });

  test('a load failure is shown with a retry, not an empty form', async () => {
    getDealerPaperwork.mockRejectedValue({ response: { data: { message: 'down' } } });
    render(<AdminSettingsDealerPaperwork />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/down/);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
