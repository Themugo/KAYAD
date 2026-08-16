export default function DealerAuctionStatusPill({ children, tone = 'muted' }) {
  const tones = {
    live: ['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.28)', '#22c55e'],
    draft: ['rgba(37, 99, 235,0.12)', 'rgba(37, 99, 235,0.28)', 'var(--gold)'],
    ended: ['rgba(148,163,184,0.10)', 'rgba(148,163,184,0.22)', 'rgba(226,232,240,0.75)'],
    muted: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.55)'],
  };
  const [background, border, color] = tones[tone] || tones.muted;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 9px',
      borderRadius: 999,
      background,
      border: `1px solid ${border}`,
      color,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}
