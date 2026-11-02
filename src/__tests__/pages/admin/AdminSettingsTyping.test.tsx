import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
const m = vi.hoisted(() => ({ getConfig: vi.fn(), getAuditLog: vi.fn() }));
vi.mock('../../../api/api', async (orig) => ({ ...(await orig() as any), adminAPI: { ...(await orig() as any).adminAPI, getConfig: m.getConfig, getAuditLog: m.getAuditLog } }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'superadmin' }, isSuperAdmin: true }) }));
import AdminSettings from '../../../pages/admin/AdminSettings';

// Regression: Field used to be defined inside AdminSettings, so every keystroke
// remounted the input and focus was lost after one character.
describe('Settings inputs keep focus while typing', () => {
  beforeEach(() => {
    m.getConfig.mockResolvedValue({ success: true, config: { platformName: 'K', daraja: {}, bank: {} } });
    m.getAuditLog.mockResolvedValue({ entries: [] });
  });
  const open = async (name: string) => {
    render(<MemoryRouter><AdminSettings /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name }));
  };
  it('Payments (Daraja/bank text fields)', async () => {
    await open('Payments');
    const input = (await screen.findAllByRole('textbox'))[0] as HTMLInputElement;
    await userEvent.type(input, 'abcdef');
    expect(((await screen.findAllByRole('textbox'))[0] as HTMLInputElement).value).toBe('abcdef');
  });
  it('Reconciliation (number field)', async () => {
    await open('Reconciliation');
    const input = (await screen.findByRole('spinbutton')) as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, '120');
    expect(((await screen.findByRole('spinbutton')) as HTMLInputElement).value).toBe('120');
  });
  it('General (platform name)', async () => {
    render(<MemoryRouter><AdminSettings /></MemoryRouter>);
    const input = (await screen.findByLabelText('Platform Name')) as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, 'KAYAD Motors');
    expect(((await screen.findByLabelText('Platform Name')) as HTMLInputElement).value).toBe('KAYAD Motors');
  });
});
