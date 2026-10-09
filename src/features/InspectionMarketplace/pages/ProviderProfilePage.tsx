import { useState } from 'react';
import { automotiveApi } from '../services/api';
import { ArrowLeft, CheckCircle2, Clock, FileCheck2, MapPin, Phone, Shield, Star, Wrench } from 'lucide-react';
import type { InspectionProvider, InspectionPackage, ServiceTaxonomy } from '../types/inspection';
import CapabilityBadges, { categoryLabel, capabilityScope } from '../components/CapabilityBadges';
import type React from 'react';

const COLORS = {
  navy: '#12576D',
  bg: '#F5F8F8',
  white: '#FFFFFF',
  teal: '#13B8A6',
  muted: '#64748b',
  line: '#D7E7E4',
};

interface ProviderProfilePageProps {
  provider: InspectionProvider;
  loading?: boolean;
  error?: string | null;
  onBack: () => void;
  onBook: () => void;
  taxonomy?: ServiceTaxonomy | null;
}

export default function ProviderProfilePage({ provider, loading, error, onBack, onBook, taxonomy = null }: ProviderProfilePageProps) {
  const packages = provider.packages || [];
  const [aff, setAff] = useState<{ state: 'idle' | 'busy' | 'ok' | 'error'; text?: string }>({ state: 'idle' });
  const requestAffiliation = async () => {
    setAff({ state: 'busy' });
    try {
      await automotiveApi.requestAffiliation(provider.id);
      setAff({ state: 'ok', text: 'Request sent. It only counts once this business confirms you.' });
    } catch (e: any) {
      const status = e?.response?.status;
      setAff({ state: 'error', text: status === 401 ? 'Sign in to request an affiliation.' : (e?.response?.data?.message || 'The request could not be sent.') });
    }
  };
  const caps = provider.capabilities || [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur" style={{ borderColor: COLORS.line }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 font-semibold" style={{ color: COLORS.navy }}>
            <ArrowLeft size={18} /> Back to providers
          </button>
          <span className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: COLORS.muted }}>Independent business</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {loading && <div className="rounded-2xl bg-white p-8 shadow-sm">Loading provider profile…</div>}
        {error && <div role="alert" className="rounded-2xl bg-white p-8 text-red-700 shadow-sm">{error}</div>}

        {!loading && !error && (
          <>
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm" style={{ border: `1px solid ${COLORS.line}` }}>
              <div className="relative h-44 md:h-56" style={{ backgroundColor: COLORS.navy }}>
                {provider.coverImage && <img src={provider.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />}
                <div className="absolute inset-0 bg-gradient-to-t from-[#12576D] via-transparent to-transparent" />
                <div className="absolute left-6 bottom-6 flex items-end gap-4 text-white">
                  <div className="w-20 h-20 rounded-2xl border-4 border-white bg-white overflow-hidden flex items-center justify-center text-2xl font-bold" style={{ color: COLORS.navy }}>
                    {provider.logo ? <img src={provider.logo} alt={provider.companyName} className="w-full h-full object-cover" /> : provider.companyName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl md:text-3xl font-bold">{provider.companyName}</h1>
                      {provider.verification.status === 'verified' && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-white/15"><Shield size={13} /> Verified business</span>}
                    </div>
                    <p className="mt-1 text-sm text-white/80">{provider.location.town}, {provider.location.county}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 grid lg:grid-cols-[1.5fr_1fr] gap-8">
                <div>
                  <div className="flex flex-wrap gap-5 text-sm mb-6" style={{ color: COLORS.muted }}>
                    {provider.stats.totalReviews > 0 && provider.stats.averageRating != null
                      ? <span className="inline-flex items-center gap-1.5"><Star size={16} fill="#B8EEE7" color="#2F8F87" /> <strong style={{ color: COLORS.navy }}>{Number(provider.stats.averageRating).toFixed(1)}</strong> ({provider.stats.totalReviews} reviews)</span>
                      : <span>No reviews yet</span>}
                    {provider.stats.completedInspections > 0 && <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={16} /> {provider.stats.completedInspections} inspections completed</span>}
                    {provider.team && provider.team.confirmedMembers > 0 && <span className="inline-flex items-center gap-1.5"><Shield size={16} /> {provider.team.confirmedMembers} confirmed team {provider.team.confirmedMembers === 1 ? 'member' : 'members'}</span>}
                  </div>

                  <div role="note" className="mb-6 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: COLORS.line, backgroundColor: COLORS.bg, color: COLORS.muted }}>
                    <strong style={{ color: COLORS.navy }}>{provider.tradingName || provider.companyName} is an independent business.</strong>{' '}
                    It performs and is responsible for its own work and sets its own prices. KAYAD lists businesses and checks the evidence described below;
                    it does not perform these services, and a verified badge reduces risk but is not a guarantee.
                  </div>

                  <h2 className="text-sm font-bold mb-3" style={{ color: COLORS.navy }}>Services</h2>
                  <CapabilityBadges capabilities={caps} taxonomy={taxonomy} />
                  {caps.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs" style={{ color: COLORS.muted }}>
                      {caps.map((c, i) => (
                        <li key={i}><strong style={{ color: COLORS.navy }}>{categoryLabel(taxonomy, c.category)}</strong>: {c.status === 'verified' ? 'verified by KAYAD' : 'declared by the business, not verified'} · {capabilityScope(c)}{c.travelsToCustomer ? ' · says it travels to the vehicle' : ''}{c.individual ? ' · specific team member' : ''}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mb-6" />

                  {provider.description && <p className="text-base leading-7" style={{ color: COLORS.muted }}>{provider.description}</p>}

                  <div className="mt-7 grid sm:grid-cols-2 gap-3">
                    <Info label="Location" value={[provider.location.address, provider.location.town, provider.location.county].filter(Boolean).join(', ')} icon={<MapPin size={17} />} />
                    <Info label="Service model" value={[provider.operatingModel.hasWorkshop && 'Workshop', provider.operatingModel.offersMobile && 'Mobile'].filter(Boolean).join(' · ') || 'Published services'} icon={<Wrench size={17} />} />
                    <Info label="Availability" value={[provider.operatingModel.sameDayAvailable && 'Same day', provider.operatingModel.weekendAvailable && 'Weekends'].filter(Boolean).join(' · ') || 'By published slots'} icon={<Clock size={17} />} />
                    {provider.contact.phone && <Info label="Provider contact" value={provider.contact.phone} icon={<Phone size={17} />} />}
                  </div>

                  {provider.specializations.inspectionTypes?.length > 0 && <TagSection title="Inspection services" items={provider.specializations.inspectionTypes} />}
                  {provider.specializations.vehicleTypes?.length > 0 && <TagSection title="Vehicle types" items={provider.specializations.vehicleTypes} />}
                </div>

                <aside className="rounded-2xl p-5 md:p-6 h-fit" style={{ backgroundColor: COLORS.bg }}>
                  <div className="flex items-center gap-2 font-semibold" style={{ color: COLORS.navy }}><FileCheck2 size={18} /> What you can book</div>
                  <p className="text-sm mt-2" style={{ color: COLORS.muted }}>Select from this business’s published inspection packages. The price is the business’s own; the amount you pay is calculated from your booking when you pay.</p>
                  <div className="mt-5 space-y-3">
                    {packages.length ? packages.map((pkg) => <PackageRow key={pkg.id} pkg={pkg} />) : <p className="text-sm" style={{ color: COLORS.muted }}>No active packages are currently published.</p>}
                  </div>
                  {packages.length > 0 && <button type="button" onClick={onBook} className="mt-5 w-full rounded-xl py-3.5 font-bold text-white shadow-sm min-h-[44px]" style={{ backgroundColor: '#0F766E' }}>Continue to booking</button>}
                  {packages.length === 0 && <p className="mt-4 text-sm" style={{ color: COLORS.muted }}>KAYAD does not take bookings or payments for this business’s other services yet. Contact the business directly to arrange work and agree the price.</p>}
                  <div className="mt-5 pt-4 border-t text-center" style={{ borderColor: COLORS.line }}>
                    <button type="button" onClick={() => void requestAffiliation()} disabled={aff.state === 'busy'} className="min-h-[44px] px-3 text-sm font-semibold underline" style={{ color: COLORS.navy }}>I work at this business</button>
                    <p className="text-xs" style={{ color: COLORS.muted }}>Asks the business to confirm you as part of its team.</p>
                    {aff.text && <p role={aff.state === 'error' ? 'alert' : 'status'} className="text-xs mt-1" style={{ color: aff.state === 'error' ? '#b91c1c' : COLORS.navy }}>{aff.text}</p>}
                  </div>
                  <p className="text-xs mt-3 text-center" style={{ color: COLORS.muted }}>Availability is checked again when you choose a time. Roadside help is not dispatched or tracked by KAYAD.</p>
                </aside>
              </div>
            </section>

            {(provider.credentials?.length || provider.recentReviews?.length) ? <section className="mt-6 grid md:grid-cols-2 gap-6">
              {!!provider.credentials?.length && <Panel title="Credentials checked by KAYAD"><p className="text-xs mb-3" style={{ color: COLORS.muted }}>These are business credentials. They do not certify the qualifications of individual staff.</p><div className="space-y-3">{provider.credentials.map(c => <div key={c.id} className="flex gap-3"><Shield size={17} style={{ color: COLORS.teal }} /><div><p className="font-semibold" style={{ color: COLORS.navy }}>{c.name}</p><p className="text-sm" style={{ color: COLORS.muted }}>{[c.issuingBody, c.expiryDate && `Valid to ${c.expiryDate}`].filter(Boolean).join(' · ')}</p></div></div>)}</div></Panel>}
              {!!provider.recentReviews?.length && <Panel title="Recent reviews"><div className="space-y-4">{provider.recentReviews.slice(0, 5).map(r => <div key={r.id}><div className="flex gap-1">{Array.from({length: 5}).map((_, i) => <Star key={i} size={14} fill={i < r.rating ? '#B8EEE7' : 'none'} color="#2F8F87" />)}</div>{r.comment && <p className="mt-1 text-sm leading-6" style={{ color: COLORS.muted }}>{r.comment}</p>}</div>)}</div></Panel>}
            </section> : null}
          </>
        )}
      </main>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl bg-white border p-4" style={{ borderColor: COLORS.line }}><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.muted }}>{icon}{label}</div><p className="mt-1 text-sm font-medium" style={{ color: COLORS.navy }}>{value || 'Not published'}</p></div>;
}
function TagSection({ title, items }: { title: string; items: string[] }) { return <div className="mt-7"><h2 className="text-sm font-bold" style={{ color: COLORS.navy }}>{title}</h2><div className="flex flex-wrap gap-2 mt-3">{items.map(item => <span key={item} className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: COLORS.bg, color: COLORS.navy }}>{item.replace(/_/g, ' ')}</span>)}</div></div>; }
function PackageRow({ pkg }: { pkg: InspectionPackage }) { return <div className="rounded-xl bg-white border p-4" style={{ borderColor: COLORS.line }}><div className="flex items-start justify-between gap-3"><div><p className="font-bold" style={{ color: COLORS.navy }}>{pkg.name}</p><p className="text-xs mt-1" style={{ color: COLORS.muted }}>{pkg.description || 'Published inspection package'} · {pkg.duration} min</p></div><p className="font-bold whitespace-nowrap" style={{ color: COLORS.navy }}>{pkg.currency} {Number(pkg.price).toLocaleString()}</p></div><div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: COLORS.muted }}>{pkg.includes.diagnostics && <span>Diagnostics</span>}{pkg.includes.roadTest && <span>Road test</span>}{pkg.includes.electrical && <span>Electrical</span>}{pkg.includes.suspension && <span>Suspension</span>}</div></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-2xl bg-white border p-6" style={{ borderColor: COLORS.line }}><h2 className="font-bold mb-4" style={{ color: COLORS.navy }}>{title}</h2>{children}</div>; }
