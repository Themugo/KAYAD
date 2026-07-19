export default function Table({
  columns = [],
  data = [],
  keyField = 'id',
  loading = false,
  emptyMessage = 'No data available',
  variant = 'bordered',
  size = 'md',
  className = '',
  onRowClick,
  renderRow,
  footer,
}) {
  const classes = [
    'ui-table',
    `ui-table--${variant}`,
    `ui-table--${size}`,
    loading ? 'ui-table--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={classes}>
        <table>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={col.width ? { width: col.width } : undefined}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((_, j) => (
                  <td key={j}><div className="ui-skeleton ui-skeleton--text" style={{ width: `${60 + Math.random() * 30}%` }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={classes}>
        <table>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={col.width ? { width: col.width } : undefined}>{col.header}</th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="ui-table__empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={classes}>
      <table>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={col.width ? { width: col.width } : undefined}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => {
            if (renderRow) return renderRow(row, rowIdx);
            return (
              <tr
                key={row[keyField] || rowIdx}
                onClick={() => onRowClick?.(row)}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        {footer && <tfoot><tr><td colSpan={columns.length}>{footer}</td></tr></tfoot>}
      </table>
    </div>
  );
}
