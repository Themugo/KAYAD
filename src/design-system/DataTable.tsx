
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
    <div className="w-full overflow-x-auto rounded-xl border border-[#0A3340]/60 bg-[#176B87]/90 backdrop-blur-md shadow-md">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#0A3340]/80 bg-[#176B87]/60 text-[#BDE5DE] text-xs uppercase tracking-wider font-semibold">
            {columns.map((col, idx) => (
              <th key={idx} className="px-5 py-3.5">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#0A3340]/60 text-sm text-[#DDF4F0]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-8 text-center text-[#94A3B8]">
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
