import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Loader2 } from 'lucide-react';

type Props = { compact?: boolean; onSignOut?: () => Promise<{ ok: boolean; message?: string }> };

/** Shared personal-account sign-out entry point. Uses the canonical AuthContext logout flow. */
export default function PersonalSignOutButton({ compact = false, onSignOut }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!onSignOut) return null;

  const handleSignOut = async () => {
    if (busy || !window.confirm('Are you sure you want to sign out?')) return;
    setBusy(true);
    try {
      const result = await onSignOut();
      if (result.ok) navigate('/', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={busy}
      data-testid="personal-sign-out"
      className={`inline-flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${compact ? 'justify-center border border-[#DCE9E7] bg-white text-[#9F1239] hover:bg-rose-50' : 'text-white/85 hover:bg-white/10 hover:text-white'}`}
    >
      {busy ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <LogOut size={17} aria-hidden="true" />}
      <span>{busy ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}
