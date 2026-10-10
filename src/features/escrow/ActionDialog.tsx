import React, { useEffect, useId, useRef } from 'react';

interface ActionDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  error?: string | null;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Small accessible confirmation dialog: role="dialog" + aria-modal, labelled
 * and described, focus moves in on open and returns on close, Tab is kept
 * inside, Escape cancels (unless an action is in flight).
 */
export const ActionDialog: React.FC<ActionDialogProps> = ({
  open, title, description, confirmLabel, cancelLabel = 'Cancel', tone = 'primary', busy = false, error, confirmDisabled, onConfirm, onClose, children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('textarea, input, select') || node?.querySelector<HTMLElement>(FOCUSABLE);
    (first || node)?.focus();
    return () => { opener.current?.focus?.(); };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab') return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) || []);
    if (items.length === 0) return;
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#0A3340]/50 p-0 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <h2 id={titleId} className="text-base font-extrabold text-[#0A3340]">{title}</h2>
        {description && <div id={descId} className="text-sm text-[#64748B] leading-relaxed">{description}</div>}
        {children}
        {error && <p role="alert" className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-[44px] px-4 rounded-xl border border-[#BDE5DE] text-sm font-bold text-[#12576D] hover:bg-[#F6FAF9] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]">{cancelLabel}</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-bold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87] ${tone === 'danger' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-[#176B87] hover:bg-[#12556b]'}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionDialog;
