import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const prefs = vi.fn();
const updatePrefs = vi.fn();
const changePw = vi.fn();
vi.mock('../../../api/api.exports', () => ({ communicationsAPI: { preferences: (...a: any[]) => prefs(...a), updatePreferences: (...a: any[]) => updatePrefs(...a) } }));
vi.mock('../../../services/authApi', () => {
  class AuthApiError extends Error {}
  return { AuthApiError, changePassword: (...a: any[]) => changePw(...a) };
});

import NotificationPreferences from '../../../components/account/NotificationPreferences';
import ChangePasswordForm, { passwordProblem } from '../../../components/account/ChangePasswordForm';
import { AuthApiError } from '../../../services/authApi';

const base = { emailTransactional: true, smsTransactional: false, whatsappTransactional: false, emailMarketing: false, smsMarketing: false, whatsappMarketing: false };

beforeEach(() => { prefs.mockReset(); updatePrefs.mockReset(); changePw.mockReset(); });

describe('NotificationPreferences', () => {
  it('shows the saved values from the server', async () => {
    prefs.mockResolvedValue({ data: { ...base, smsMarketing: true } });
    render(<NotificationPreferences />);
    expect(await screen.findByRole('switch', { name: /SMS - news/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Email - account/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /WhatsApp - news/ })).not.toBeChecked();
  });
  it('persists a toggle and reflects the stored value', async () => {
    prefs.mockResolvedValue({ data: base });
    updatePrefs.mockResolvedValue({ data: { ...base, emailMarketing: true } });
    render(<NotificationPreferences />);
    await userEvent.click(await screen.findByRole('switch', { name: /Email - news/ }));
    expect(updatePrefs).toHaveBeenCalledWith({ emailMarketing: true });
    await waitFor(() => expect(screen.getByRole('switch', { name: /Email - news/ })).toBeChecked());
  });
  it('a failed save keeps the old state and shows an error (no false success)', async () => {
    prefs.mockResolvedValue({ data: base });
    updatePrefs.mockRejectedValue({ response: { data: { message: 'nope' } } });
    render(<NotificationPreferences />);
    await userEvent.click(await screen.findByRole('switch', { name: /Email - news/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('nope');
    expect(screen.getByRole('switch', { name: /Email - news/ })).not.toBeChecked();
  });
  it('blocks a second toggle while one save is in flight', async () => {
    prefs.mockResolvedValue({ data: base });
    let resolve!: (v: any) => void;
    updatePrefs.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<NotificationPreferences />);
    await userEvent.click(await screen.findByRole('switch', { name: /Email - news/ }));
    expect(screen.getByRole('switch', { name: /SMS - news/ })).toBeDisabled();
    resolve({ data: { ...base, emailMarketing: true } });
    await waitFor(() => expect(screen.getByRole('switch', { name: /SMS - news/ })).not.toBeDisabled());
    expect(updatePrefs).toHaveBeenCalledTimes(1);
  });
  it('load failure is shown with a retry', async () => {
    prefs.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ data: base });
    render(<NotificationPreferences />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load/);
    await userEvent.click(screen.getByText('Retry'));
    expect(await screen.findByRole('switch', { name: /Email - account/ })).toBeInTheDocument();
  });
});

describe('ChangePasswordForm', () => {
  const fill = async (cur: string, nw: string, conf: string) => {
    await userEvent.type(screen.getByLabelText('Current password'), cur);
    await userEvent.type(screen.getByLabelText('New password'), nw);
    await userEvent.type(screen.getByLabelText('Confirm new password'), conf);
    await userEvent.click(screen.getByRole('button', { name: /change password/i }));
  };
  it('rule helper mirrors the server', () => {
    expect(passwordProblem('Aa1!aaaa')).toBeNull();
    expect(passwordProblem('aaaaaaaa1!')).toMatch(/uppercase/);
    expect(passwordProblem('Aa1aaaaa')).toMatch(/special/);
  });
  it('invalid input never reaches the server', async () => {
    render(<ChangePasswordForm />);
    await fill('Old1!aaa', 'weak', 'weak');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('New password'));
    expect(changePw).not.toHaveBeenCalled();
  });
  it('mismatch is refused client-side', async () => {
    render(<ChangePasswordForm />);
    await fill('Old1!aaa', 'NewPass1!', 'NewPass2!');
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/);
    expect(changePw).not.toHaveBeenCalled();
  });
  it('success calls the API once, clears the fields and reports success', async () => {
    changePw.mockResolvedValue({ success: true });
    render(<ChangePasswordForm />);
    await fill('Old1!aaa', 'NewPass1!', 'NewPass1!');
    expect(changePw).toHaveBeenCalledTimes(1);
    expect(changePw).toHaveBeenCalledWith({ currentPassword: 'Old1!aaa', newPassword: 'NewPass1!' });
    expect(await screen.findByRole('status')).toHaveTextContent(/Password changed/);
    expect(screen.getByLabelText('Current password')).toHaveValue('');
  });
  it('server rejection (wrong current password) shows the server message and no success', async () => {
    changePw.mockRejectedValue(new (AuthApiError as any)('Current password is incorrect'));
    render(<ChangePasswordForm />);
    await fill('Wrong1!aa', 'NewPass1!', 'NewPass1!');
    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
