// Admin Table Row Component
// Reusable row component for admin tables

import { MoreVertical, Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface Action {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'default';
}

interface AdminTableRowProps {
  id: string | number;
  columns: string[];
  actions?: Action[];
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
}

export function AdminCarRow({
  car,
  onView,
  onEdit,
  onDelete
}: {
  car: any;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <tr className="border-b border-[#D7E7E4] hover:bg-[#F6FAF9]">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {car.image && (
            <img
              src={car.image}
              alt={car.title}
              loading="lazy"
              decoding="async"
              className="w-12 h-12 object-cover rounded"
            />
          )}
          <div>
            <p className="font-medium">{car.title || car.brand}</p>
            <p className="text-sm text-[#64748B]">{car.year} • {car.mileage?.toLocaleString()} km</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="font-semibold">KES {(car.price || 0).toLocaleString()}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          car.status === 'active' ? 'bg-green-100 text-green-700' :
          car.status === 'pending' ? 'bg-[#DDF4F0] text-[#12576D]' :
          'bg-[#EEF7F5] text-[#12576D]'
        }`}>
          {car.status || 'Unknown'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {onView && (
            <button onClick={onView} className="p-1 hover:bg-[#EEF7F5] rounded">
              <Eye className="h-4 w-4 text-[#64748B]" />
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} className="p-1 hover:bg-[#EEF7F5] rounded">
              <Edit className="h-4 w-4 text-[#2F8F87]" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-[#EEF7F5] rounded">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AdminUserRow({
  user,
  onView,
  onSuspend,
  onDelete
}: {
  user: any;
  onView?: () => void;
  onSuspend?: () => void;
  onDelete?: () => void;
}) {
  return (
    <tr className="border-b border-[#D7E7E4] hover:bg-[#F6FAF9]">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#DDF4F0] rounded-full flex items-center justify-center">
            <span className="text-[#12576D] font-medium">
              {user.name?.[0] || user.email?.[0] || '?'}
            </span>
          </div>
          <div>
            <p className="font-medium">{user.name || 'Unknown'}</p>
            <p className="text-sm text-[#64748B]">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          user.role === 'admin' ? 'bg-[#DDF4F0] text-[#12576D]' :
          user.role === 'dealer' ? 'bg-[#DDF4F0] text-[#12576D]' :
          'bg-[#EEF7F5] text-[#12576D]'
        }`}>
          {user.role || 'user'}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          user.status === 'active' ? 'bg-green-100 text-green-700' :
          user.status === 'suspended' ? 'bg-red-100 text-red-700' :
          'bg-[#DDF4F0] text-[#12576D]'
        }`}>
          {user.status || 'pending'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {onView && (
            <button onClick={onView} className="p-1 hover:bg-[#EEF7F5] rounded">
              <Eye className="h-4 w-4 text-[#64748B]" />
            </button>
          )}
          {onSuspend && (
            <button onClick={onSuspend} className="p-1 hover:bg-[#EEF7F5] rounded">
              <XCircle className="h-4 w-4 text-[#176B87]" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-[#EEF7F5] rounded">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default AdminCarRow;
