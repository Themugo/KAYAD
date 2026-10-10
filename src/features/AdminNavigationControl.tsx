import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { adminAPI } from '../api/api.exports';
import { Button, Card } from '../components/ui';
import { NAV_PRIMARY, NAV_LOCKED_VISIBLE, applyNavigationConfig } from '../components/navigation/navConfig';

/**
 * Admin control of the public navigation's PRESENTATION STATE only (Stage 14A).
 *
 * Lives in the existing admin console (AdminView) and saves through the
 * existing PUT /api/admin/config (platform_config.navigation, MANAGE_SETTINGS +
 * admin/superadmin, audited). It can show/hide and reorder destinations that
 * already exist in code; it cannot add destinations, labels, links, styles or
 * markup. The backend independently re-validates every write, so this UI is a
 * convenience, never the authority.
 */
interface ChildModel { id: string; visible: boolean }
interface ItemModel { id: string; visible: boolean; dropdown: boolean; children: ChildModel[] }

function toModel(stored: unknown): ItemModel[] {
  const resolved = applyNavigationConfig(stored);
  const entries: any[] = Array.isArray((stored as any)?.items) ? (stored as any).items : [];
  const byId: Record<string, any> = Object.fromEntries(entries.filter((e) => e && typeof e.id === 'string').map((e) => [e.id, e]));
  const order = [...resolved.map((r) => r.id), ...NAV_PRIMARY.map((n) => n.id).filter((id) => !resolved.some((r) => r.id === id))];
  return order.map((id) => {
    const canon = NAV_PRIMARY.find((n) => n.id === id)!;
    const entry = byId[id] || {};
    const kidsCanon = canon.children || [];
    const kidEntries: any[] = Array.isArray(entry.children) ? entry.children.filter((c: any) => c && typeof c.id === 'string') : [];
    const listed = kidEntries.map((c) => c.id as string);
    const kidOrder = [...listed.filter((k, i) => kidsCanon.some((c) => c.id === k) && listed.indexOf(k) === i), ...kidsCanon.map((c) => c.id).filter((k) => !listed.includes(k))];
    const hidden = new Set(kidEntries.filter((c) => c.visible === false).map((c) => c.id));
    return {
      id,
      visible: resolved.some((r) => r.id === id),
      dropdown: entry.dropdown !== false,
      children: kidOrder.map((k) => ({ id: k, visible: !hidden.has(k) })),
    };
  });
}

const toPayload = (model: ItemModel[]) => ({
  items: model.map((m) => {
    const canon = NAV_PRIMARY.find((n) => n.id === m.id)!;
    const base = { id: m.id, visible: NAV_LOCKED_VISIBLE.includes(m.id) ? true : m.visible };
    return canon.children?.length ? { ...base, dropdown: m.dropdown, children: m.children } : base;
  }),
});

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export const AdminNavigationControl: React.FC = () => {
  const [model, setModel] = useState<ItemModel[]>(() => toModel(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    adminAPI.getConfig()
      .then((res: any) => { if (alive) setModel(toModel((res?.config ?? res?.data?.config)?.navigation ?? null)); })
      .catch(() => { if (alive) setMessage({ kind: 'error', text: 'Could not load the stored navigation settings. Saving will replace them.' }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const patchItem = (i: number, patch: Partial<ItemModel>) => setModel((m) => m.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const patchChild = (i: number, j: number, patch: Partial<ChildModel>) => setModel((m) => m.map((x, k) => (k === i ? { ...x, children: x.children.map((c, n) => (n === j ? { ...c, ...patch } : c)) } : x)));
  const reason = (err: any) => err?.response?.data?.errors?.join('; ') || err?.response?.data?.message || err?.message || 'The server rejected this change.';

  const send = async (payload: unknown, okText: string, after?: () => void) => {
    setSaving(true); setMessage(null);
    try { await adminAPI.updateConfig({ navigation: payload }); after?.(); setMessage({ kind: 'ok', text: okText }); }
    catch (err) { setMessage({ kind: 'error', text: reason(err) }); }
    finally { setSaving(false); }
  };

  return (
    <Card className="p-5 space-y-4" data-testid="admin-navigation-control">
      <div>
        <h3 className="font-bold text-[#176B87]">Public navigation</h3>
        <p className="text-sm text-[#64748B] mt-1">
          Show, hide and reorder the existing destinations. The design, labels and destinations are fixed by KAYAD.
          Marketplace and Support are always shown. Hiding a menu item only removes the link — access to the page itself is still enforced by the platform.
          Changes reach visitors on their next page load.
        </p>
      </div>
      {message && <div role="status" className={`text-sm rounded-lg px-3 py-2 ${message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-[#F3FAF9] text-[#0A3340]'}`}>{message.text}</div>}
      <ol className="space-y-3" aria-busy={loading}>
        {model.map((item, i) => {
          const canon = NAV_PRIMARY.find((n) => n.id === item.id)!;
          const locked = NAV_LOCKED_VISIBLE.includes(item.id);
          return (
            <li key={item.id} className="rounded-xl border border-[#D7E7E4] p-3" data-nav-admin-item={item.id}>
              <div className="flex flex-wrap items-center gap-3">
                <strong className="flex-1 min-w-[140px]">{canon.label}</strong>
                <label className="text-sm flex items-center gap-1.5"><input type="checkbox" checked={item.visible} disabled={locked || loading} onChange={(e) => patchItem(i, { visible: e.target.checked })} />Shown{locked ? ' (always)' : ''}</label>
                {!!canon.children?.length && <label className="text-sm flex items-center gap-1.5"><input type="checkbox" checked={item.dropdown} disabled={loading} onChange={(e) => patchItem(i, { dropdown: e.target.checked })} />Dropdown</label>}
                <Button variant="outline" size="sm" aria-label={`Move ${canon.label} up`} disabled={i === 0 || loading} onClick={() => setModel((m) => move(m, i, -1))}><ArrowUp className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" aria-label={`Move ${canon.label} down`} disabled={i === model.length - 1 || loading} onClick={() => setModel((m) => move(m, i, 1))}><ArrowDown className="w-4 h-4" /></Button>
              </div>
              {!!canon.children?.length && item.dropdown && (
                <ul className="mt-2 ml-4 space-y-1.5">
                  {item.children.map((c, j) => {
                    const cc = canon.children!.find((x) => x.id === c.id)!;
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-3">
                        <span className="flex-1 min-w-[140px] text-sm">{cc.label}{cc.requiresAuth ? ' · signed-in only' : ''}</span>
                        <label className="text-sm flex items-center gap-1.5"><input type="checkbox" checked={c.visible} disabled={loading} onChange={(e) => patchChild(i, j, { visible: e.target.checked })} />Shown</label>
                        <Button variant="outline" size="sm" aria-label={`Move ${cc.label} up`} disabled={j === 0 || loading} onClick={() => setModel((m) => m.map((x, k) => (k === i ? { ...x, children: move(x.children, j, -1) } : x)))}><ArrowUp className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" aria-label={`Move ${cc.label} down`} disabled={j === item.children.length - 1 || loading} onClick={() => setModel((m) => m.map((x, k) => (k === i ? { ...x, children: move(x.children, j, 1) } : x)))}><ArrowDown className="w-4 h-4" /></Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={saving || loading} onClick={() => void send(toPayload(model), 'Navigation saved.')}>{saving ? 'Saving…' : 'Save navigation'}</Button>
        <Button variant="outline" disabled={saving || loading} onClick={() => void send({ items: [] }, 'Navigation reset to the KAYAD default.', () => setModel(toModel(null)))}>Reset to default</Button>
      </div>
    </Card>
  );
};

export default AdminNavigationControl;
