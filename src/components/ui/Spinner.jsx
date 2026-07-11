// src/components/ui/Spinner.jsx
export default function Spinner({ size = 'md', className = '', style }) {
  return (
    <span
      className={`ui-spinner ui-spinner--${size} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
}
