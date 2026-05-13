export default function LifeTimeline({ history }) {
  if (!history || history.length === 0) return null;

  return (
    <div style={{ position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: 16, paddingLeft: 32, marginTop: 40, marginBottom: 40 }}>
      {history.map((event, index) => (
        <div key={index} style={{ position: 'relative', marginBottom: 32 }}>
          <div style={{
            position: 'absolute', left: -37, width: 16, height: 16,
            borderRadius: '50%', background: 'var(--gold)',
            border: '4px solid black',
          }} />
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--gold)', textTransform: 'uppercase' }}>{event.date}</p>
          <h5 style={{ fontSize: 14, fontWeight: 700, color: 'white', marginTop: 4 }}>{event.title}</h5>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{event.description}</p>
          {event.mileage && (
            <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', color: '#cbd5e1' }}>
              Verified Odometer: {event.mileage} KM
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
