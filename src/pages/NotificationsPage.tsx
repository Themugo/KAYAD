import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock3, ExternalLink, Trash2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { timeAgo } from '../utils/helpers';

/** Full-page destination for notification links across the marketplace and dealer shells. */
export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllRead, deleteNotif } = useNotifications();
  const navigate = useNavigate();

  const openNotification = async (notification: (typeof notifications)[number]) => {
    if (!notification.read) await markAsRead(notification._id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <main id="main-content" className="min-h-[65vh] bg-[#F6FAF9] px-4 py-8 text-[#1E293B] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#DDF4F0] text-[#176B87]"><Bell size={21} /></span>
            <div>
              <h1 className="text-2xl font-bold text-[#0A3340]">Notifications</h1>
              <p className="mt-1 text-sm text-[#64748B]">Your account alerts and activity updates.</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={() => void markAllRead()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D7E7E4] bg-white px-4 text-sm font-semibold text-[#176B87] hover:bg-[#EEF7F5]">
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
        </div>

        <section aria-label="Notification list" className="overflow-hidden rounded-2xl border border-[#D7E7E4] bg-white shadow-sm">
          {loading && notifications.length === 0 ? (
            <div role="status" className="p-10 text-center text-sm text-[#64748B]">Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#EEF7F5] text-[#176B87]"><Bell size={21} /></span>
              <h2 className="font-semibold text-[#0A3340]">You’re all caught up</h2>
              <p className="mt-1 text-sm text-[#64748B]">New account and transaction alerts will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#D7E7E4]">
              {notifications.map((notification) => (
                <li key={notification._id} className={`flex gap-3 p-4 sm:p-5 ${notification.read ? '' : 'bg-[#F3FAF9]'}`}>
                  <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#DDF4F0] text-[#176B87]"><Bell size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => void openNotification(notification)} className="block text-left font-semibold text-[#0A3340] hover:text-[#176B87]">
                      {notification.title}
                    </button>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#475569]">{notification.message}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#64748B]"><Clock3 size={12} />{timeAgo(notification.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    {notification.link && <button type="button" title="Open related activity" aria-label={`Open ${notification.title}`} onClick={() => void openNotification(notification)} className="rounded-lg p-2 text-[#176B87] hover:bg-[#EEF7F5]"><ExternalLink size={16} /></button>}
                    {!notification.read && <button type="button" title="Mark as read" aria-label={`Mark ${notification.title} as read`} onClick={() => void markAsRead(notification._id)} className="rounded-lg p-2 text-[#176B87] hover:bg-[#EEF7F5]"><CheckCheck size={16} /></button>}
                    <button type="button" title="Delete notification" aria-label={`Delete ${notification.title}`} onClick={() => void deleteNotif(notification._id)} className="rounded-lg p-2 text-[#64748B] hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
