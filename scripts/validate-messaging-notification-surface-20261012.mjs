import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const hub = read('src/features/UnifiedCommunicationHub.tsx');
const chatApi = read('src/services/chatApi.ts');
const appShell = read('src/App.tsx');
const navbar = read('src/components/Navbar.tsx');
const notificationContext = read('src/context/NotificationContext.tsx');
const notificationPage = read('src/pages/NotificationsPage.tsx');
const notificationPanel = read('src/components/layout/NotificationPanel.tsx');
const notificationController = read('backend/controllers/notificationController.js');
const notificationRoutes = read('backend/routes/notificationRoutes.js');
const chatRoutes = read('backend/routes/chatRoutes.js');
const chatController = read('backend/controllers/chatController.js');
const app = read('src/App.tsx');

const checks = [
  ['signed-out Messages renders a dedicated private-inbox state', /Your conversations, kept private/.test(hub) && /Sign in to Messages/.test(hub)],
  ['sign-in returns to the canonical Messages surface', /buildAuthPath\('login', \{ next: '\/\?nav=chat' \}\)/.test(hub)],
  ['signed-out Messages does not render private inbox counts', /if \(!user \|\| !currentUserId\)\s*\{\s*return/.test(hub)],
  ['account identity changes clear composer and selection state', /setInputText\(''\)[\s\S]*?setSearchQuery\(''\)[\s\S]*?setMobileView\('list'\)/.test(hub)],
  ['inbox polling discards stale identity responses', /currentUserIdRef\.current !== currentUserId/.test(hub) && /let cancelled = false;[\s\S]*?clearInterval\(timer\)/.test(hub)],
  ['prior-account conversations are masked synchronously during identity change', /visibleThreads = currentUserId && threadsOwnerId === currentUserId \? threads : \[\]/.test(hub)],
  ['send completion is guarded against account changes', /currentUserIdRef\.current !== sendingUserId/.test(hub)],
  ['conversation counts do not imply zero while loading or failing', /inboxLoading \|\| threadsError \? '—' : visibleThreads\.length/.test(hub) && /inboxLoading \|\| threadsError \? '—' : totalUnreadCount/.test(hub)],
  ['message loading errors use customer-safe text and retry', /Conversations could not be loaded right now\. Please try again\./.test(hub) && /Try again/.test(hub)],
  ['network failures are classified as network failures', /!error\.status \? 'network'/.test(chatApi)],
  ['navbar message badge uses the canonical authenticated unread endpoint', /getUnreadChatCount/.test(chatApi) && /import\('\.\/services\/chatApi'\)/.test(appShell) && /getUnreadChatCount\(\)/.test(appShell) && /unreadCount=\{visibleUnreadMessageCount\}/.test(appShell) && /const effectiveUnread = Math\.max\(0, Math\.floor\(unreadCount\)\)/.test(navbar)],
  ['unread endpoint is protected and queries only participant chats', /router\.get\("\/unread", protect/.test(chatRoutes) && /contains\("participants", \[req\.user\.id\]\)/.test(chatController) && /if \(chatsError\) throw chatsError/.test(chatController)],
  ['navbar unread count is masked to the active account and does not zero on fetch failure', /unreadMessageOwnerId === currentAuthUserId/.test(appShell) && /Keep this account's last confirmed count/.test(appShell)],
  ['navbar badge regression test covers authoritative unread count', /uses the supplied authoritative unread count/.test(read('src/__tests__/components/Navbar.test.jsx'))],
  ['notification DTO uses an explicit field allow-list', /_id: String\(n\.id \|\| n\._id \|\| ""\)/.test(notificationController) && !/const mapNotification = \(n\) => \(\{\s*\.\.\.n/.test(notificationController)],
  ['notification DTO excludes recipient contacts and internal action data', /Explicit public DTO/.test(notificationController) && !/recipient_email|recipient_phone|action_data/.test(notificationController.slice(notificationController.indexOf('const mapNotification'), notificationController.indexOf('export const getNotifications')))],
  ['notification links are local-path-only', /startsWith\("\/\/"\)/.test(notificationController) && /link\.includes\("\\\\"\)/.test(notificationController)],
  ['notification mutations verify owner before update/delete', /String\(notification\.user\) !== String\(req\.user\.id\)/.test(notificationController)],
  ['notification routes remain authenticated', /router\.use\(protect\)/.test(notificationRoutes)],
  ['notification client normalization is allow-listed', /_id: String\(n\?\._id \|\| n\?\.id \|\| ''\)/.test(notificationContext) && !/\.\.\.n/.test(notificationContext.slice(notificationContext.indexOf('const normalizeNotification'), notificationContext.indexOf('const fetchNotifications')))],
  ['notification fetch errors are distinguishable from an empty inbox', /error: string \| null/.test(notificationContext) && /Notifications could not be loaded/.test(notificationContext) && /Notifications are temporarily unavailable/.test(notificationPage)],
  ['notification mutations reject stale account responses', /sessionKeyRef\.current = sessionKey/.test(notificationContext) && /requestUserId !== sessionKeyRef\.current/.test(notificationContext)],
  ['prior-account notifications are masked synchronously during identity change', /visibleSession = Boolean\(sessionKey && dataSessionKey === sessionKey\)/.test(notificationContext)],
  ['fetch and action errors remain distinct', /errorKind: 'fetch' \| 'action' \| null/.test(notificationContext) && /visibleErrorKind = visibleError \? \(actionError \? 'action' : 'fetch'\) : null/.test(notificationContext)],
  ['notification counts refresh if realtime subscription missed bootstrap', /setInterval\(\(\) => \{ void fetchNotifications\(\); \}, 30000\)/.test(notificationContext)],
  ['notification history exposes safe load-more pagination', /loadMoreNotifications = useCallback/.test(notificationContext) && /existingIds = new Set/.test(notificationContext) && /Load older notifications/.test(notificationPage)],
  ['notification mutations invalidate stale fetches and reconcile counts', /invalidate reads started before this mutation/.test(notificationContext) && /reconcile with the server's authoritative count/.test(notificationContext)],
  ['notification full page provides retry and does not fake an empty success', /onClick=\{\(\) => void fetchNotifications\(\)\}/.test(notificationPage) && /error && errorKind === 'fetch' && notifications\.length === 0/.test(notificationPage)],
  ['notification popover has keyboard-operable notification buttons', /aria-label=\{`Open notification: \$\{notif\.title\}`\}/.test(notificationPanel) && /type="button"/.test(notificationPanel)],
  ['protected notification route remains behind RequireAuth', /path === '\/notifications'\) return <RequireAuth><NotificationsPage \/><\/RequireAuth>/.test(app)],
];

for (const [label, pass] of checks) {
  assert.ok(pass, label);
  console.log(`PASS ${label}`);
}
console.log(`Messaging/notification surface validation: ${checks.length}/${checks.length} PASS`);
