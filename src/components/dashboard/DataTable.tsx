import { ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => ReactNode;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  emptyMessage?: string;
  className?: string;
}

export default function DataTable({ columns, data, emptyMessage = 'No data available', className = '' }: DataTableProps) {
  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8">
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className={`text-left text-white/40 text-xs uppercase tracking-wider font-semibold py-4 px-6 ${column.className || ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                {columns.map((column) => (
                  <td 
                    key={column.key} 
                    className={`py-4 px-6 text-white text-sm ${column.className || ''}`}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40 text-sm">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
