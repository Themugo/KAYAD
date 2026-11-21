import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), del: vi.fn(), policy: vi.fn(), toast: vi.fn() }));
vi.mock('../../../api/api', () => ({ adminAPI: { createStaffLevel: m.create, updateStaffLevel: m.update, deleteStaffLevel: m.del, updateStaffEmailPolicy: m.policy } }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: m.toast }) }));
import AdminStaffLevels from '../../../pages/admin/components/AdminStaffLevels';

const data = {
  levels: [{ key: 'sales', label: 'Sales', description: 'Sales team', baseRole: 'marketing', permissions: ['manage_cars'], members: 2 }],
  baseRoles: ['marketing', 'hr'],
  permissions: [{ key: 'manage_cars', label: 'Manage Listings', desc: '', group: 'Marketplace' }, { key: 'view_analytics', label: 'View Analytics', desc: '', group: 'Insight' }],
  companyEmailDomain: 'kayad.space', requireCompanyEmail: false,
};
beforeEach(() => { vi.clearAllMocks(); });

describe('Admin staff > Employment levels', () => {
  it('lists levels with member counts', () => {
    render(<AdminStaffLevels data={data} onChanged={vi.fn()} />);
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText(/2 members/)).toBeInTheDocument();
  });
  it('creates a level with chosen permissions and derives the key from the name', async () => {
    m.create.mockResolvedValue({});
    const onChanged = vi.fn().mockResolvedValue();
    render(<AdminStaffLevels data={data} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: 'New level' }));
    await userEvent.type(screen.getByLabelText('Level name'), 'Customer Success');
    await userEvent.click(screen.getByLabelText(/View Analytics/));
    await userEvent.click(screen.getByRole('button', { name: 'Save level' }));
    expect(m.create).toHaveBeenCalledWith({ key: 'customer_success', label: 'Customer Success', description: '', baseRole: 'marketing', permissions: ['view_analytics'] });
    expect(onChanged).toHaveBeenCalled();
  });
  it('shows server validation errors and keeps the form open', async () => {
    m.create.mockRejectedValue({ response: { data: { errors: ['choose at least one permission'] } } });
    render(<AdminStaffLevels data={data} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'New level' }));
    await userEvent.type(screen.getByLabelText('Level name'), 'Ops');
    await userEvent.click(screen.getByRole('button', { name: 'Save level' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('choose at least one permission');
    expect(screen.getByRole('form', { name: 'New employment level' })).toBeInTheDocument();
  });
  it('saves the company e-mail policy', async () => {
    m.policy.mockResolvedValue({});
    render(<AdminStaffLevels data={data} onChanged={vi.fn().mockResolvedValue()} />);
    await userEvent.click(screen.getByLabelText(/Require a company address/));
    await userEvent.click(screen.getByRole('button', { name: 'Save e-mail policy' }));
    expect(m.policy).toHaveBeenCalledWith({ companyEmailDomain: 'kayad.space', requireCompanyEmail: true });
  });
  it('reports a delete refusal from the server', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    m.del.mockRejectedValue({ response: { data: { message: '2 staff member(s) still hold this level.' } } });
    render(<AdminStaffLevels data={data} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Sales' }));
    expect(m.toast).toHaveBeenCalledWith('2 staff member(s) still hold this level.', 'error');
  });
});
