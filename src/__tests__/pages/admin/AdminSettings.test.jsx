import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const getConfig = vi.fn();
const updateConfig = vi.fn();
const getAuditLog = vi.fn();
const toast = vi.fn();
vi.mock('../../../api/api', () => ({
  adminAPI: {
    getConfig: (...args) => getConfig(...args),
    updateConfig: (...args) => updateConfig(...args),
    getAuditLog: (...args) => getAuditLog(...args),
  },
}));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'superadmin' }, isSuperAdmin: true }) }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../../pages/admin/AdminSettingsBranding', () => ({ default: () => <div>branding-child</div> }));
vi.mock('../../../pages/admin/AdminSettingsOnboarding', () => ({ default: () => <div>onboarding-child</div> }));

import AdminSettings from '../../../pages/admin/AdminSettings';

beforeEach(() => {
  vi.clearAllMocks();
  getAuditLog.mockResolvedValue({ entries: [] });
  updateConfig.mockResolvedValue({ success: true, config: { platformName: 'KAYAD' } });
});

describe('AdminSettings safe loading and saving', () => {
  it('does not allow general settings to be saved when the server load fails', async () => {
    getConfig.mockRejectedValueOnce(new Error('network unavailable'));
    render(<AdminSettings />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Saving is disabled until the saved configuration loads successfully/i);
    const save = screen.getByRole('button', { name: /Save General Settings/i });
    expect(save).toBeDisabled();
    await userEvent.click(save);
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it('does not treat a malformed configuration response as loaded settings', async () => {
    getConfig.mockResolvedValueOnce({ success: true });
    render(<AdminSettings />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save General Settings/i })).toBeDisabled();
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it('enables saving after a valid server configuration is loaded and requires server confirmation', async () => {
    getConfig.mockResolvedValue({ success: true, config: { platformName: 'Saved KAYAD' } });
    render(<AdminSettings />);
    const save = await screen.findByRole('button', { name: /Save General Settings/i });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);
    await waitFor(() => expect(updateConfig).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith('Settings saved', 'success');
  });
});
