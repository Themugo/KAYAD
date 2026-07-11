// src/components/ui/Skeleton.jsx
export default function Skeleton({ variant = 'text', width, height, className = '', style, count = 1 }) {
  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`ui-skeleton ui-skeleton--${variant} ${className}`}
            style={{ width, height, ...style }}
          />
        ))}
      </>
    );
  }
  return (
    <div
      className={`ui-skeleton ui-skeleton--${variant} ${className}`}
      style={{ width, height, ...style }}
    />
  );
}
