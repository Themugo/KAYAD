import { describe, it, expect } from 'vitest';
import { isStaffRole, staffRoleLabel } from '../../utils/staffRoles';
import { STAFF_ROLES } from '../../utils/authRoutes';

describe('staffRoles (menu presentation helper)', () => {
  it('treats every canonical staff role except the inspector as staff', () => {
    for (const r of STAFF_ROLES) expect(isStaffRole(r)).toBe(r !== 'ghost_checker');
  });
  it('does not treat buyers, sellers, dealers, inspectors or junk as staff', () => {
    for (const r of ['user', 'buyer', 'individual_seller', 'broker', 'dealer', 'mechanic', 'ghost_checker', '', undefined, null, 42, {}]) expect(isStaffRole(r)).toBe(false);
  });
  it('labels superadmin as Super Admin and unknown staff generically', () => {
    expect(staffRoleLabel('superadmin')).toBe('Super Admin');
    expect(staffRoleLabel('admin')).toBe('Administrator');
    expect(staffRoleLabel('something_new')).toBe('Staff');
  });
});
