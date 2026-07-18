import { useState } from 'react';

export default function Table({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowKey = '_id',
  sortable = false,
  className = '',
  style: customStyle,
  ...rest
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const styles = {
    wrapper: {
      overflowX: 'auto',
      borderRadius: 12,
      border: '1px solid rgba(15, 23, 42, 0.08)',
      background: '#FFFFFF',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13,
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      fontWeight: 600,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'rgba(15, 23, 42, 0.5)',
      background: 'rgba(15, 23, 42, 0.02)',
      borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
      whiteSpace: 'nowrap',
    },
    thSortable: {
      cursor: sortable ? 'pointer' : 'default',
      userSelect: sortable ? 'none' : 'auto',
    },
    td: {
      padding: '14px 16px',
      borderBottom: '1px solid rgba(15, 23, 42, 0.04)',
      color: '#0F172A',
    },
    tr: {
      transition: 'background 0.15s ease',
    },
    empty: {
      textAlign: 'center',
      padding: '48px 16px',
      color: 'rgba(15, 23, 42, 0.4)',
      fontSize: 14,
    },
  };

  return (
    <div style={styles.wrapper} className={className} {...rest}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...styles.th,
                  textAlign: col.align || 'left',
                  ...(sortable ? styles.thSortable : {}),
                  width: col.width,
                }}
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                {col.label}
                {sortable && sortConfig.key === col.key && (
                  <span style={{ marginLeft: 6 }}>
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={styles.empty}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <div className="ui-spinner ui-spinner--sm" />
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row) => (
              <tr
                key={row[rowKey]}
                style={{
                  ...styles.tr,
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
                onClick={() => onRowClick?.(row)}
                onMouseEnter={(e) => {
                  if (onRowClick) {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '';
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      ...styles.td,
                      textAlign: col.align || 'left',
                    }}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
