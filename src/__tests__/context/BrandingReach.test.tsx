import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const getPublicConfig = vi.fn();
vi.mock('../../api/api', () => ({ adminAPI: { getPublicConfig: (...a: unknown[]) => getPublicConfig(...a) } }));

import { BrandingProvider, announceBrandingUpdated } from '../../context/BrandingContext';
import PremiumAuthShell from '../../components/auth/PremiumAuthShell';
import BrandMark from '../../components/BrandMark';

const cfg = (b: Record<string, unknown>) => ({ success: true, config: { branding: b } });

beforeEach(() => { getPublicConfig.mockReset(); try { localStorage.clear(); } catch { /* ignore */ } document.documentElement.removeAttribute('style'); });

describe('saved branding reaches the login / register shell', () => {
  it('shows the uploaded logo and tagline instead of the hardcoded mark', async () => {
    getPublicConfig.mockResolvedValue(cfg({ logoType: 'image', logoUrl: '/api/admin/public/logo/0123456789abcdef.png', logoText: 'Acme Autos', brandTagline: 'Drive happy' }));
    const { container } = render(<MemoryRouter><BrandingProvider><PremiumAuthShell title="Sign in"><div /></PremiumAuthShell></BrandingProvider></MemoryRouter>);
    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/admin/public/logo/0123456789abcdef.png'));
    expect(screen.getByText('Acme Autos')).toBeInTheDocument();
    expect(screen.getByText('Drive happy')).toBeInTheDocument();
  });

  it('a save elsewhere in the app refreshes the logo without a reload', async () => {
    getPublicConfig.mockResolvedValueOnce(cfg({ logoType: 'image', logoUrl: '/api/admin/public/logo/aaaa111122223333.png', logoText: 'KAYAD' }));
    const { container } = render(<BrandingProvider><BrandMark /></BrandingProvider>);
    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/admin/public/logo/aaaa111122223333.png'));
    getPublicConfig.mockResolvedValueOnce(cfg({ logoType: 'image', logoUrl: '/api/admin/public/logo/fedcba9876543210.webp', logoText: 'KAYAD' }));
    act(() => { announceBrandingUpdated(); });
    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/admin/public/logo/fedcba9876543210.webp'));
  });

  it('renders built-in branding without a provider (isolated renders do not crash)', () => {
    render(<BrandMark />);
    expect(screen.getByText('KAYAD')).toBeInTheDocument();
  });
});

describe('navbar / footer colours are applied as site-wide CSS variables', () => {
  it('sets them when saved and removes them when reset to default', async () => {
    getPublicConfig.mockResolvedValueOnce(cfg({ navbarBg: '#112233', navbarText: '#ffffff', navbarNavBg: '#445566', footerBg: '#001122', footerText: '#cccccc', footerAccent: '#ff8800' }));
    render(<BrandingProvider><div /></BrandingProvider>);
    const root = document.documentElement;
    await waitFor(() => expect(root.style.getPropertyValue('--navbar-bg')).toBe('#112233'));
    expect(root.style.getPropertyValue('--navbar-nav-bg')).toBe('#445566');
    expect(root.style.getPropertyValue('--footer-bg')).toBe('#001122');
    expect(root.style.getPropertyValue('--footer-accent')).toBe('#ff8800');
    getPublicConfig.mockResolvedValueOnce(cfg({ navbarBg: '', footerBg: '' }));
    act(() => { announceBrandingUpdated(); });
    await waitFor(() => expect(root.style.getPropertyValue('--navbar-bg')).toBe(''));
    expect(root.style.getPropertyValue('--footer-bg')).toBe('');
  });
});
