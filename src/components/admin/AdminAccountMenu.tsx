import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getEffectivePermissions, PAGE_PERMISSIONS } from '../../utils/permissions';

interface AdminAccountMenuProps {
  displayName: string;
  roleLabel: string;
  initials: string;
}

/**
 * Header account menu for the admin shell. Only existing destinations are offered, and only when the
 * session is allowed to open them (display convenience: the server still enforces every route and API).
 * Sign out uses the real backend revocation and only clears the client session when the server confirms.
 */
export default function AdminAccountMenu({ displayName, roleLabel, initials }: AdminAccountMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const isOwner = (user as { isOwner?: boolean } | null)?.isOwner === true;
  const canSettings = !!user && getEffectivePermissions(user).includes(PAGE_PERMISSIONS['/admin/settings'] as never);

  const items = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: Event) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); close(true); }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const openAndFocus = (index: 'first' | 'last') => {
    setOpen(true);
    window.setTimeout(() => {
      const list = items();
      (index === 'first' ? list[0] : list[list.length - 1])?.focus();
    }, 0);
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); openAndFocus('first'); }
    if (event.key === 'ArrowUp') { event.preventDefault(); openAndFocus('last'); }
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); list[(index + 1) % list.length]?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); list[(index - 1 + list.length) % list.length]?.focus(); }
    else if (event.key === 'Home') { event.preventDefault(); list[0]?.focus(); }
    else if (event.key === 'End') { event.preventDefault(); list[list.length - 1]?.focus(); }
    else if (event.key === 'Tab') close(false);
  };

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signOut();
    setBusy(false);
    if (result.ok) {
      setOpen(false);
      navigate('/login', { replace: true });
    } else {
      setError(result.message || 'Sign-out could not be confirmed. You are still signed in.');
    }
  };

  return (
    <div className="kayad-admin-account" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="kayad-admin-account__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${displayName}, ${roleLabel}`}
        onClick={() => setOpen(value => !value)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="kayad-admin-header__identity-copy">
          <span className="kayad-admin-header__identity-name">{displayName}</span>
          <span className="kayad-admin-header__identity-role">{roleLabel}</span>
        </span>
        <span className="kayad-admin-header__avatar" aria-hidden="true">{initials}</span>
        <ChevronDown className="kayad-admin-account__chevron" size={14} aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} className="kayad-admin-account__menu" role="menu" aria-label="Account" onKeyDown={onMenuKeyDown}>
          <div className="kayad-admin-account__summary" role="presentation">
            <strong>{displayName}</strong>
            <small>{roleLabel}</small>
          </div>
          <Link role="menuitem" to="/profile" className="kayad-admin-account__item" onClick={() => close(false)}>
            <UserRound size={15} aria-hidden="true" /> My profile
          </Link>
          {canSettings && (
            <Link role="menuitem" to="/admin/settings" className="kayad-admin-account__item" onClick={() => close(false)}>
              <KeyRound size={15} aria-hidden="true" /> Account &amp; platform settings
            </Link>
          )}
          {isOwner && (
            <Link role="menuitem" to="/admin/owners" className="kayad-admin-account__item" onClick={() => close(false)}>
              <ShieldCheck size={15} aria-hidden="true" /> Owner management
            </Link>
          )}
          <button type="button" role="menuitem" className="kayad-admin-account__item is-danger" onClick={handleSignOut} disabled={busy} aria-busy={busy}>
            <LogOut size={15} aria-hidden="true" /> {busy ? 'Signing out…' : 'Sign out'}
          </button>
          {error && <p className="kayad-admin-account__error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
