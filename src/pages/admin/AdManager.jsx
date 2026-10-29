import { AdManagerPanel } from '../../features/AdManager/AdManagerPanel';

/**
 * Canonical Ad Manager route.
 *
 * The previous screen called the legacy /admin/ads API and expected a
 * `{ ads: [...] }` envelope, while the deployed advertising domain is
 * persisted at /api/ads and returns `{ success, data }`. Keep one source of
 * truth: use the existing AdSlot manager that controls the real delivered
 * placements, visibility, ticker behavior, styling, and delivery statistics.
 */
export default function AdManager() {
  return (
    <main className="page">
      <div className="container" style={{ paddingTop: 24, paddingBottom: 32 }}>
        <AdManagerPanel embedded />
      </div>
    </main>
  );
}
