export default function Card({ children, style, className, ...props }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
