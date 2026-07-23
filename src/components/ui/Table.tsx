import React, { memo } from 'react';

// Design System Table Component
export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField?: keyof T;
  loading?: boolean;
  empty?: React.ReactNode;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
}

function TableComponent<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id' as keyof T,
  loading = false,
  empty,
  striped = false,
  hoverable = true,
  compact = false,
  className = '',
  onRowClick,
}: TableProps<T>) {
  const getValue = (row: T, key: string): any => {
    if (key.includes('.')) {
      return key.split('.').reduce((obj, k) => obj?.[k], row);
    }
    return row[key];
  };

  if (loading) {
    return (
      <div className={`overflow-hidden rounded-xl border border-[var(--border)] ${className}`}>
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                >
                  {typeof col.header === 'string' ? col.header : '...'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-4">
                    <div className="h-4 bg-[var(--surface)] rounded animate-pulse" style={{ width: '80%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`overflow-hidden rounded-xl border border-[var(--border)] ${className}`}>
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="p-8 text-center text-[var(--text-muted)]">
          {empty || 'No data available'}
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-[var(--border)] ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]
                  ${col.align === 'center' ? 'text-center' : ''}
                  ${col.align === 'right' ? 'text-right' : ''}
                  ${col.sortable ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''}
                `}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {data.map((row, rowIndex) => {
            const key = String(getValue(row, String(keyField)) ?? rowIndex);
            return (
              <tr
                key={key}
                className={`
                  border-b border-[var(--border)] last:border-0
                  ${striped && rowIndex % 2 === 1 ? 'bg-[var(--surface)]/50' : ''}
                  ${hoverable ? 'hover:bg-[var(--surface)]/50' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                  transition-colors duration-150
                `}
                onClick={() => onRowClick?.(row, rowIndex)}
              >
                {columns.map((col) => {
                  const value = getValue(row, col.key);
                  return (
                    <td
                      key={col.key}
                      className={`
                        px-4 py-3 text-sm text-[var(--text-secondary)]
                        ${compact ? 'py-2' : 'py-4'}
                        ${col.align === 'center' ? 'text-center' : ''}
                        ${col.align === 'right' ? 'text-right' : ''}
                      `}
                    >
                      {col.render ? col.render(row, rowIndex) : value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const Table = memo(TableComponent) as typeof TableComponent;

// Table subcomponents for more complex use cases
export interface TableHeaderCellProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  onSort?: () => void;
  sortDirection?: 'asc' | 'desc' | null;
}

export function TableHeaderCell({
  children,
  align = 'left',
  sortable = false,
  onSort,
  sortDirection,
}: TableHeaderCellProps) {
  return (
    <th
      className={`
        px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]
        ${align === 'center' ? 'text-center' : ''}
        ${align === 'right' ? 'text-right' : ''}
        ${sortable ? 'cursor-pointer select-none hover:text-[var(--text-primary)]' : ''}
      `}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <svg className={`w-3 h-3 ${sortDirection ? 'opacity-100' : 'opacity-40'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sortDirection === 'asc' ? (
              <path d="M5 15l7-7 7 7" />
            ) : sortDirection === 'desc' ? (
              <path d="M19 9l-7 7-7-7" />
            ) : (
              <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
            )}
          </svg>
        )}
      </div>
    </th>
  );
}

export default Table;
