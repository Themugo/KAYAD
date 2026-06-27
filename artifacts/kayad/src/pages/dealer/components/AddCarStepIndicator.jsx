export default function AddCarStepIndicator({ step, setStep }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
      {['Basic Info', 'Specs & Features', 'Pricing & Mode', 'Photos'].map((s, i) => (
        <div key={s} onClick={() => setStep(i + 1)}
          style={{
            flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 8,
            background: step === i + 1 ? 'var(--gold-glow)' : 'var(--surface)',
            border: `1px solid ${step === i + 1 ? 'var(--gold)' : 'var(--border)'}`,
            cursor: 'pointer', fontSize: 13, fontWeight: step === i + 1 ? 600 : 400,
            color: step === i + 1 ? 'var(--gold)' : 'var(--text-muted)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{i + 1}</div>
          {s}
        </div>
      ))}
    </div>
  );
}
