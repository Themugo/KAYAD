import { memo } from 'react';

const AdminUserRow = memo(function AdminUserRow({ user, onBan, onApprove, onSelect, actionId, selected }) {
  const isSelected = selected?._id === user._id;
  return (
    <tr key={user._id} className={isSelected ? 'row-selected' : ''} onClick={() => onSelect?.(user)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
      <td><input type="checkbox" checked={isSelected} onChange={() => onSelect?.(user)} /></td>
      <td><strong>{user.name || 'N/A'}</strong></td>
      <td>{user.email}</td>
      <td><span className={`badge ${user.role === 'dealer' ? 'badge-gold' : user.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{user.role}</span></td>
      <td>{user.phone || '—'}</td>
      <td>{new Date(user.created_at).toLocaleDateString()}</td>
      <td>
        <span className={`badge ${user.is_banned ? 'badge-red' : user.approved ? 'badge-green' : 'badge-orange'}`}>
          {user.is_banned ? 'Banned' : user.approved ? 'Active' : 'Pending'}
        </span>
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          {user.role === 'dealer' && !user.approved && (
            <button className="btn btn-sm btn-gold" onClick={(e) => { e.stopPropagation(); onApprove?.(user); }} disabled={actionId === user._id + '-app'}>
              {actionId === user._id + '-app' ? '...' : 'Approve'}
            </button>
          )}
          <button className={`btn btn-sm ${user.is_banned ? 'btn-success' : 'btn-danger'}`} onClick={(e) => { e.stopPropagation(); onBan?.(user); }} disabled={actionId === user._id + '-ban'}>
            {actionId === user._id + '-ban' ? '...' : user.is_banned ? 'Unban' : 'Ban'}
          </button>
        </div>
      </td>
    </tr>
  );
});

const AdminCarRow = memo(function AdminCarRow({ car, onDelete, onSelect, actionId }) {
  return (
    <tr key={car._id} onClick={() => onSelect?.(car)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
      <td>
        <div style={{ width: 48, height: 36, borderRadius: 4, overflow: 'hidden', background: 'var(--surface)' }}>
          <img src={car.image || car.images?.[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        </div>
      </td>
      <td><strong>{car.title}</strong></td>
      <td>KES {(car.price || 0).toLocaleString()}</td>
      <td>{car.brand} {car.year}</td>
      <td><span className={`badge ${car.auction_status === 'live' ? 'badge-green' : car.auction_status === 'sold' ? 'badge-gold' : 'badge-muted'}`}>{car.auction_status || 'draft'}</span></td>
      <td>{new Date(car.created_at).toLocaleDateString()}</td>
      <td>
        <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); onDelete?.(car); }} disabled={actionId === car._id + '-del'}>
          {actionId === car._id + '-del' ? '...' : 'Delete'}
        </button>
      </td>
    </tr>
  );
});

export { AdminUserRow, AdminCarRow };
