// src/components/ui/Fab.jsx
export default function Fab({ icon = '+', onClick, label = 'Add', className = '', style }) {
  return (
    <button
      className={`ui-fab ${className}`}
      onClick={onClick}
      aria-label={label}
      style={style}
    >
      {icon}
    </button>
  );
}
