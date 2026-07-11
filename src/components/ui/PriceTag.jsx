export default function PriceTag({ value, size = 'md', sub, currency = 'KES', className = '', style }) {
  const formatted = typeof value === 'number'
    ? `${currency} ${value.toLocaleString('en-KE')}`
    : value;

  return (
    <div className={className} style={style}>
      <div className={`ui-price ui-price--${size}`}>{formatted}</div>
      {sub && <div className="ui-price__sub">{sub}</div>}
    </div>
  );
}
