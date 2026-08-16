const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 7,
};

export default function DealerAuctionField({ label, children, hint }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{hint}</div>}
    </div>
  );
}
