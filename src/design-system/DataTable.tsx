import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#1A2A4E]/60 bg-[#1E3063]/90 backdrop-blur-md shadow-md">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#1A2A4E]/80 bg-[#1E3063]/60 text-slate-300 text-xs uppercase tracking-wider font-semibold">
            {columns.map((col, idx) => (
              <th key={idx} className="px-5 py-3.5">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#0B1628]/60 text-sm text-slate-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-8 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={keyExtractor(row)} className="hover:bg-white/5 transition-colors">
                {columns.map((col, idx) => (
                  <td key={idx} className="px-5 py-3.5 whitespace-nowrap">
                    {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey] ?? '') : '')}
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
