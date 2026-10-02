import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Bookmark, Gavel, History, UserRound, WalletCards } from 'lucide-react';

export function runAuctionTransition(action: () => void) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const start = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
  if (!reduced && start) { start.call(document, action); return; }
  action();
}

export function triggerAuctionHaptic(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(pattern);
}

export function AuctionSurfaceReveal({ children, surface }: { children: React.ReactNode; surface: string }) {
  const reduce = useReducedMotion();
  return <motion.div key={surface} initial={reduce ? false : { opacity: 0, y: 8 }} animate={reduce ? undefined : { opacity: 1, y: 0 }} transition={{ duration: .24, ease: 'easeOut' }} className="auction-surface-reveal">{children}</motion.div>;
}

type DockItem = { id: string; label: string; icon: React.ElementType };
const dockItems: DockItem[] = [
  { id: 'auctions', label: 'Auctions', icon: Gavel },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'payments', label: 'Wallet', icon: WalletCards },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export function AuctionMobileDock({ active, onNavigate, onSaved, savedCount = 0 }: { active: string; onNavigate: (id: string) => void; onSaved?: () => void; savedCount?: number }) {
  return <nav className="auction-mobile-dock" aria-label="Auction navigation">
    {dockItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={active === id ? 'is-active' : ''} onClick={() => runAuctionTransition(() => id === 'saved' ? onSaved?.() : onNavigate(id))} aria-current={active === id ? 'page' : undefined}>
      <span className="auction-mobile-dock-icon"><Icon size={17} />{id === 'saved' && savedCount > 0 && <b>{savedCount > 99 ? '99+' : savedCount}</b>}</span><span>{label}</span>
    </button>)}
  </nav>;
}

export function AuctionSwipeHint({ children = 'Swipe to explore' }: { children?: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 3600); return () => window.clearTimeout(timer); }, []);
  return <AnimatePresence>{visible && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="auction-swipe-hint" onClick={() => setVisible(false)}><span>{children}</span><ArrowRight size={13} /></motion.div>}</AnimatePresence>;
}

export function AuctionSavedPulse({ active, onToggle, label = 'Save' }: { active: boolean; onToggle: () => void; label?: string }) {
  return <motion.button type="button" whileTap={{ scale: .91 }} whileHover={{ y: -1 }} className={`auction-save-control ${active ? 'is-active' : ''}`} onClick={onToggle} aria-pressed={active}>
    <motion.span animate={active ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={{ duration: .28 }}><Bookmark size={15} fill={active ? 'currentColor' : 'none'} /></motion.span><span>{active ? 'Saved' : label}</span>
  </motion.button>;
}

export function AuctionHistoryEmptyAction({ onExplore }: { onExplore: () => void }) {
  return <button type="button" className="auction-history-empty-action" onClick={onExplore}><History size={15} /> Explore the next room <ArrowRight size={15} /></button>;
}
