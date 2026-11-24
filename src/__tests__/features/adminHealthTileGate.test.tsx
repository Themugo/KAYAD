import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const getInfrastructureHealth = vi.hoisted(() => vi.fn().mockResolvedValue({ health: { services: [{ name: 'api', status: 'healthy' }] } }));
vi.mock('../../api/api.exports', () => ({ adminAPI: { getInfrastructureHealth } }));
import AdminSystemHealthPanel from '../../features/AdminSystemHealthPanel';
import { userHasPermission, PERM } from '../../utils/permissions';

// OD-1: the tile follows the permission, never a role name. The server (view_system_health) stays authoritative.
const can = (role: string, extra: string[] = []) => userHasPermission({ role, grantedPermissions: extra } as any, PERM.VIEW_SYSTEM_HEALTH);

describe('System Health permission (OD-1)', () => {
  it.each(['moderator', 'hr', 'marketing', 'technical_support', 'accounts', 'admin', 'escrow_officer', 'ghost_checker', 'ad_manager'])('%s has no health access by default', (role) => {
    expect(can(role)).toBe(false);
  });
  it('Super Admin always has it', () => { expect(can('superadmin')).toBe(true); });
  it('technical_support only with an individual grant', () => { expect(can('technical_support', ['view_system_health'])).toBe(true); });
  it('a revoke removes a grant', () => { expect(userHasPermission({ role: 'technical_support', grantedPermissions: ['view_system_health'], revokedPermissions: ['view_system_health'] } as any, PERM.VIEW_SYSTEM_HEALTH)).toBe(false); });
});

describe('System Health tile', () => {
  it('not allowed: no request is made and an access boundary is shown', async () => {
    getInfrastructureHealth.mockClear();
    render(<MemoryRouter><AdminSystemHealthPanel allowed={false} /></MemoryRouter>);
    expect(await screen.findByText(/not included in your role/)).toBeInTheDocument();
    expect(getInfrastructureHealth).not.toHaveBeenCalled();
  });
  it('allowed: the health contract is read', async () => {
    getInfrastructureHealth.mockClear();
    render(<MemoryRouter><AdminSystemHealthPanel allowed /></MemoryRouter>);
    await waitFor(() => expect(getInfrastructureHealth).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Healthy')).toBeInTheDocument();
  });
});
