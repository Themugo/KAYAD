import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const getInfrastructureHealth = vi.hoisted(() => vi.fn().mockResolvedValue({ health: { services: [{ name: 'api', status: 'healthy' }] } }));
vi.mock('../../api/api.exports', () => ({ adminAPI: { getInfrastructureHealth } }));
import AdminSystemHealthPanel from '../../features/AdminSystemHealthPanel';

describe('System Health tile follows the server role rule', () => {
  it.each(['moderator', 'hr', 'marketing', 'technical_support', 'accounts'])('%s: no request is made and an access boundary is shown', async (role) => {
    getInfrastructureHealth.mockClear();
    render(<MemoryRouter><AdminSystemHealthPanel role={role} /></MemoryRouter>);
    expect(await screen.findByText(/not included in your role/)).toBeInTheDocument();
    expect(getInfrastructureHealth).not.toHaveBeenCalled();
  });
  it.each(['admin', 'superadmin'])('%s: the health contract is read', async (role) => {
    getInfrastructureHealth.mockClear();
    render(<MemoryRouter><AdminSystemHealthPanel role={role} /></MemoryRouter>);
    await waitFor(() => expect(getInfrastructureHealth).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Healthy')).toBeInTheDocument();
  });
});
