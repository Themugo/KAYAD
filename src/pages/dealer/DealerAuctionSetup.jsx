import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock,
  Gavel,
  Play,
  RefreshCw,
  TimerReset,
  XCircle,
} from 'lucide-react';
import { dealerAPI, dealerAuctionAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { CountdownDisplay, useCountdown } from '../../hooks/useCountdown';

const DURATIONS = [
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
  { label: '72 hours', value: 72 },
  { label: '5 days', value: 120 },
  { label: '7 days', value: 168 },
];

const EXTEND_OPTIONS = [1, 3, 6, 12, 24, 48];

const currencyInputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.045)',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 7,
};

const formatDateTime = (value) => {
  if (!value) return 'Not set';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
};

const getImage = (car) => car.images?.[0]?.url || car.images?.[0] || car.image || '';

function Field({ label, children, hint }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{hint}</div>}
    </div>
  );
}

function StatusPill({ children, tone = 'muted' }) {
  const tones = {
    live: ['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.28)', '#22c55e'],
    draft: ['rgba(212,196,168,0.12)', 'rgba(212,196,168,0.28)', 'var(--gold)'],
    ended: ['rgba(148,163,184,0.10)', 'rgba(148,163,184,0.22)', 'rgba(226,232,240,0.75)'],
    muted: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.55)'],
  };
  const [background, border, color] = tones[tone] || tones.muted;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 9px',
      borderRadius: 999,
      background,
      border: `1px solid ${border}`,
      color,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function CarIdentity({ car }) {
  const img = getImage(car);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
      {img ? (
        <img
          src={img}
          alt={car.title || 'Auction vehicle'}
          loading="lazy"
          decoding="async"
          style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 72, height: 54, borderRadius: 8, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {car.title || 'Untitled vehicle'}
        </div>
        <div style={{ marginTop: 3, fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>
          {car.year || 'Year not set'} · {car.mileage ? `${Number(car.mileage).toLocaleString()} km` : 'Mileage not set'}
        </div>
      </div>
    </div>
  );
}

function DraftAuctionCard({ car, expanded, isLoading, onToggle, onChange, onStart, styles }) {
  const durationHours = toHours(car._durationHours);
  const now = new Date();
  const estimatedEnd = useMemo(() => new Date(Date.now() + durationHours * 60 * 60 * 1000), [durationHours]);
  const startingBid = Number(car._startingBid || 0);
  const reservePrice = car._reservePrice ? Number(car._reservePrice) : 0;
  const hasReserveIssue = reservePrice > 0 && reservePrice < startingBid;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <CarIdentity car={car} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StatusPill tone="draft">Ready to configure</StatusPill>
          <div style={{ textAlign: 'right' }}>
            <div style={styles.metricLabel}>List Price</div>
            <div style={styles.goldValue}>{formatKES(car.price || 0)}</div>
          </div>
          <button onClick={onToggle} style={styles.secondaryButton}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {expanded ? 'Close Setup' : 'Setup Auction'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={styles.configPanel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.sectionKicker}>Auction Timing</div>
              <h2 style={styles.sectionTitle}>Start now, set the countdown</h2>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <StatusPill tone="muted"><CalendarClock size={12} /> Starts immediately</StatusPill>
              <StatusPill tone="draft"><Clock size={12} /> Ends {formatDateTime(estimatedEnd)}</StatusPill>
            </div>
          </div>

          <div style={styles.formGrid}>
            <Field label="Starting bid" hint="Minimum KES 1,000. This becomes the opening auction price.">
              <input
                type="number"
                min={1000}
                value={car._startingBid}
                onChange={(e) => onChange('_startingBid', e.target.value)}
                placeholder="1000"
                style={currencyInputStyle}
              />
            </Field>
            <Field label="Reserve price" hint="Optional. Must be at least the starting bid when provided.">
              <input
                type="number"
                min={0}
                value={car._reservePrice}
                onChange={(e) => onChange('_reservePrice', e.target.value)}
                placeholder="Optional"
                style={{
                  ...currencyInputStyle,
                  borderColor: hasReserveIssue ? 'rgba(239,68,68,0.55)' : currencyInputStyle.border,
                }}
              />
            </Field>
            <Field label="Duration" hint="Choose a preset or enter custom auction hours.">
              <select
                value={DURATIONS.some((d) => d.value === durationHours) ? durationHours : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') onChange('_durationHours', Number(e.target.value));
                }}
                style={currencyInputStyle}
              >
                {DURATIONS.map((duration) => (
                  <option key={duration.value} value={duration.value} style={{ background: '#111' }}>
                    {duration.label}
                  </option>
                ))}
                <option value="custom" style={{ background: '#111' }}>Custom hours</option>
              </select>
            </Field>
            <Field label="Custom hours" hint="Auctions must run at least 24 hours.">
              <input
                type="number"
                min={24}
                max={720}
                value={durationHours}
                onChange={(e) => onChange('_durationHours', e.target.value)}
                style={currencyInputStyle}
              />
            </Field>
          </div>

          <div style={styles.timeline}>
            <div>
              <div style={styles.timelineLabel}>Start Time</div>
              <div style={styles.timelineValue}>{formatDateTime(now)}</div>
            </div>
            <div style={styles.timelineRule} />
            <div>
              <div style={styles.timelineLabel}>Countdown Length</div>
              <div style={styles.timelineValue}>{durationHours} hours</div>
            </div>
            <div style={styles.timelineRule} />
            <div>
              <div style={styles.timelineLabel}>Estimated End</div>
              <div style={styles.timelineValue}>{formatDateTime(estimatedEnd)}</div>
            </div>
          </div>

          {hasReserveIssue && (
            <div style={styles.errorNote}>Reserve price must be greater than or equal to the starting bid.</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>
              Current backend starts auctions immediately. The selected duration controls the live countdown and end time.
            </div>
            <button
              onClick={onStart}
              disabled={isLoading === 'starting' || hasReserveIssue}
              style={{
                ...styles.primaryButton,
                opacity: isLoading === 'starting' || hasReserveIssue ? 0.55 : 1,
                cursor: isLoading === 'starting' || hasReserveIssue ? 'default' : 'pointer',
              }}
            >
              <Play size={15} />
              {isLoading === 'starting' ? 'Starting Auction...' : 'Start Live Auction'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveAuctionCard({ car, isLoading, onEnd, onExtend, onExtendHoursChange, styles }) {
  const time = useCountdown(car.auctionEnd);
  const extensionCount = car._extendCount || car.extensionCount || 0;
  const extensionLocked = extensionCount >= 3;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <CarIdentity car={car} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StatusPill tone="live">Live</StatusPill>
          <div style={{ textAlign: 'right' }}>
            <div style={styles.metricLabel}>Current Bid</div>
            <div style={styles.goldValue}>{formatKES(car.currentBid || car.price || 0)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={styles.metricLabel}>Bids</div>
            <div style={styles.whiteValue}>{car.bidsCount || 0}</div>
          </div>
        </div>
      </div>

      <div style={styles.livePanel}>
        <div style={{ minWidth: 260 }}>
          <div style={styles.sectionKicker}>Countdown</div>
          <CountdownDisplay endTime={car.auctionEnd} size="md" showDays="auto" />
          <div style={{ marginTop: 12, fontSize: 12, color: time.urgent ? '#ef4444' : 'rgba(255,255,255,0.45)' }}>
            Ends {formatDateTime(car.auctionEnd)}
          </div>
        </div>

        <div style={styles.liveMetaGrid}>
          <div style={styles.metaBox}>
            <div style={styles.metricLabel}>Started</div>
            <div style={styles.whiteValue}>{formatDateTime(car.auctionStartTime || car.createdAt)}</div>
          </div>
          <div style={styles.metaBox}>
            <div style={styles.metricLabel}>Reserve</div>
            <div style={styles.whiteValue}>{car.reservePrice ? formatKES(car.reservePrice) : 'None'}</div>
          </div>
          <div style={styles.metaBox}>
            <div style={styles.metricLabel}>Extensions</div>
            <div style={styles.whiteValue}>{extensionCount}/3 used</div>
          </div>
        </div>
      </div>

      <div style={styles.actionsRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={car._extendHours || ''}
            onChange={(e) => onExtendHoursChange(car._id, e.target.value)}
            disabled={extensionLocked || !!isLoading}
            style={{ ...currencyInputStyle, width: 142, padding: '10px 11px' }}
          >
            <option value="" style={{ background: '#111' }}>Extend by</option>
            {EXTEND_OPTIONS.map((hours) => (
              <option key={hours} value={hours} style={{ background: '#111' }}>{hours} hour{hours === 1 ? '' : 's'}</option>
            ))}
          </select>
          <button
            onClick={() => onExtend(car._id, Number(car._extendHours || 0))}
            disabled={extensionLocked || !!isLoading}
            style={{
              ...styles.blueButton,
              opacity: extensionLocked || isLoading === 'extending' ? 0.55 : 1,
              cursor: extensionLocked || isLoading === 'extending' ? 'default' : 'pointer',
            }}
          >
            <TimerReset size={14} />
            {isLoading === 'extending' ? 'Extending...' : extensionLocked ? 'Limit Reached' : 'Extend Countdown'}
          </button>
        </div>
        <button
          onClick={() => onEnd(car._id)}
          disabled={!!isLoading}
          style={{
            ...styles.dangerButton,
            opacity: isLoading === 'ending' ? 0.55 : 1,
            cursor: isLoading === 'ending' ? 'wait' : 'pointer',
          }}
        >
          <XCircle size={14} />
          {isLoading === 'ending' ? 'Ending...' : 'End Auction'}
        </button>
      </div>
    </div>
  );
}

function EndedAuctionCard({ car, styles }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <CarIdentity car={car} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StatusPill tone="ended">Ended</StatusPill>
          <div style={{ textAlign: 'right' }}>
            <div style={styles.metricLabel}>Final Bid</div>
            <div style={styles.goldValue}>{formatKES(car.currentBid || car.price || 0)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={styles.metricLabel}>Ended</div>
            <div style={styles.whiteValue}>{formatDateTime(car.auctionEnd)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DealerAuctionSetup() {
  const { toast } = useToast();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('draft');
  const [actionLoading, setActionLoading] = useState({});

  const fetchCars = useCallback(async () => {
    setLoading(true);
    try {
      const carsRes = await dealerAPI.cars({ limit: 300 });
      const allCars = carsRes.cars || carsRes.data || [];
      setCars(allCars.map((car) => ({
        ...car,
        _startingBid: car.currentBid || car.price || '',
        _reservePrice: car.reservePrice || '',
        _durationHours: 24,
        _extendHours: '',
        _extendCount: car.extensionCount || 0,
      })));
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to load auction cars', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  const groupedCars = useMemo(() => {
    const now = Date.now();
    return cars.reduce((groups, car) => {
      const end = car.auctionEnd ? new Date(car.auctionEnd).getTime() : 0;
      const isEnded = car.auctionStatus === 'ended' || (end > 0 && end <= now);
      const isLive = !isEnded && (car.auctionStatus === 'live' || end > now);

      if (isLive) groups.live.push(car);
      else if (isEnded) groups.ended.push(car);
      else groups.draft.push(car);
      return groups;
    }, { draft: [], live: [], ended: [] });
  }, [cars]);

  const tabs = [
    { key: 'draft', label: 'Setup', icon: Play, count: groupedCars.draft.length },
    { key: 'live', label: 'Live', icon: Gavel, count: groupedCars.live.length },
    { key: 'ended', label: 'Ended', icon: Clock, count: groupedCars.ended.length },
  ];

  const styles = useMemo(() => ({
    container: { background: '#050505', minHeight: '100vh' },
    headerBar: {
      background: 'linear-gradient(180deg, rgba(212,196,168,0.045) 0%, transparent 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '30px 0 0',
    },
    inner: { maxWidth: 1180, margin: '0 auto', padding: '0 32px' },
    contentInner: { maxWidth: 1180, margin: '0 auto', padding: '30px 32px 64px' },
    card: {
      background: '#0C0C0C',
      border: '1px solid rgba(255,255,255,0.075)',
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 18px 50px rgba(0,0,0,0.18)',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 18,
      padding: '17px 20px',
      flexWrap: 'wrap',
    },
    configPanel: {
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: 20,
      background: 'rgba(255,255,255,0.015)',
    },
    panelHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
      marginBottom: 18,
    },
    sectionKicker: {
      fontSize: 9,
      color: 'var(--gold)',
      fontWeight: 900,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      marginBottom: 5,
    },
    sectionTitle: {
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontStyle: 'italic',
      fontSize: '1.25rem',
      color: '#fff',
      margin: 0,
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
      gap: 16,
      marginBottom: 18,
    },
    timeline: {
      display: 'grid',
      gridTemplateColumns: 'minmax(140px, 1fr) 48px minmax(140px, 1fr) 48px minmax(140px, 1fr)',
      alignItems: 'center',
      gap: 10,
      padding: 16,
      borderRadius: 10,
      border: '1px solid rgba(212,196,168,0.13)',
      background: 'rgba(212,196,168,0.045)',
      marginBottom: 16,
      overflowX: 'auto',
    },
    timelineRule: { height: 1, background: 'rgba(212,196,168,0.28)' },
    timelineLabel: {
      fontSize: 9,
      color: 'rgba(255,255,255,0.38)',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      fontWeight: 800,
      marginBottom: 5,
    },
    timelineValue: { color: '#fff', fontSize: 13, fontWeight: 800 },
    livePanel: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 20,
      flexWrap: 'wrap',
      padding: '4px 20px 20px',
    },
    liveMetaGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))',
      gap: 10,
      flex: '1 1 420px',
    },
    metaBox: {
      padding: 13,
      borderRadius: 9,
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.07)',
    },
    actionsRow: {
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: 800,
      color: 'rgba(255,255,255,0.35)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: 4,
    },
    goldValue: {
      fontSize: 15,
      fontWeight: 900,
      color: 'var(--gold)',
      fontFamily: 'var(--font-display)',
      fontStyle: 'italic',
      whiteSpace: 'nowrap',
    },
    whiteValue: { fontSize: 13, color: '#fff', fontWeight: 800, whiteSpace: 'nowrap' },
    primaryButton: {
      padding: '11px 18px',
      background: 'var(--gold)',
      border: 'none',
      borderRadius: 8,
      color: '#000',
      fontSize: 12,
      fontWeight: 900,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    },
    secondaryButton: {
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.045)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      color: '#fff',
      fontSize: 12,
      fontWeight: 800,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      whiteSpace: 'nowrap',
    },
    blueButton: {
      padding: '10px 16px',
      background: 'rgba(59,130,246,0.11)',
      border: '1px solid rgba(59,130,246,0.24)',
      borderRadius: 8,
      color: '#60a5fa',
      fontSize: 12,
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
    },
    dangerButton: {
      padding: '10px 16px',
      background: 'rgba(239,68,68,0.11)',
      border: '1px solid rgba(239,68,68,0.24)',
      borderRadius: 8,
      color: '#ef4444',
      fontSize: 12,
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
    },
    errorNote: {
      marginBottom: 14,
      padding: '10px 12px',
      borderRadius: 8,
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.2)',
      color: '#fca5a5',
      fontSize: 12,
      fontWeight: 700,
    },
  }), []);

  const updateCar = (id, field, value) => {
    setCars((previous) => previous.map((car) => (car._id === id ? { ...car, [field]: value } : car)));
  };

  const handleStartAuction = async (car) => {
    const startingBid = Number(car._startingBid);
    const reservePrice = car._reservePrice ? Number(car._reservePrice) : undefined;
    const durationHours = toHours(car._durationHours);

    if (!startingBid || startingBid < 1000) {
      toast('Starting bid must be at least KES 1,000', 'error');
      return;
    }
    if (durationHours < 24) {
      toast('Auction duration must be at least 24 hours', 'error');
      return;
    }
    if (reservePrice !== undefined && reservePrice < startingBid) {
      toast('Reserve price must be greater than or equal to starting bid', 'error');
      return;
    }

    setActionLoading((previous) => ({ ...previous, [car._id]: 'starting' }));
    try {
      await dealerAuctionAPI.start(car._id, {
        durationMs: durationHours * 60 * 60 * 1000,
        startingBid,
        ...(reservePrice !== undefined && { reservePrice }),
      });
      toast('Auction is live and countdown has started', 'success');
      setExpandedId(null);
      setActiveTab('live');
      await fetchCars();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to start auction', 'error');
    } finally {
      setActionLoading((previous) => ({ ...previous, [car._id]: null }));
    }
  };

  const handleEndAuction = async (carId) => {
    if (!window.confirm('End this auction now?')) return;
    setActionLoading((previous) => ({ ...previous, [carId]: 'ending' }));
    try {
      await dealerAuctionAPI.end(carId);
      toast('Auction ended', 'info');
      await fetchCars();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to end auction', 'error');
    } finally {
      setActionLoading((previous) => ({ ...previous, [carId]: null }));
    }
  };

  const handleExtendAuction = async (carId, hours) => {
    const car = cars.find((item) => item._id === carId);
    const currentExtends = car?._extendCount || car?.extensionCount || 0;
    if (currentExtends >= 3) {
      toast('Maximum 3 extensions reached', 'error');
      return;
    }
    if (!hours || hours < 1) {
      toast('Choose an extension time first', 'error');
      return;
    }

    setActionLoading((previous) => ({ ...previous, [carId]: 'extending' }));
    try {
      await dealerAuctionAPI.extend(carId, hours);
      toast(`Auction countdown extended by ${hours}h`, 'success');
      await fetchCars();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to extend auction', 'error');
    } finally {
      setActionLoading((previous) => ({ ...previous, [carId]: null }));
    }
  };

  const activeCars = groupedCars[activeTab] || [];

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <div style={styles.inner}>
          <div style={styles.sectionKicker}>Dealer Auctions</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.65rem,3vw,2.35rem)', color: '#fff', margin: 0 }}>
                Auction Setup
              </h1>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.48)', fontSize: 13 }}>
                Configure starting bids, reserve prices, countdown duration, live extensions, and auction endings.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={fetchCars} style={styles.secondaryButton}>
                <RefreshCw size={14} /> Refresh
              </button>
              <Link to="/dealer" style={{ ...styles.secondaryButton, textDecoration: 'none' }}>
                Back to Dashboard
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '13px 18px',
                    background: selected ? 'rgba(212,196,168,0.08)' : 'none',
                    border: 'none',
                    borderBottom: `2px solid ${selected ? 'var(--gold)' : 'transparent'}`,
                    color: selected ? '#fff' : 'rgba(255,255,255,0.42)',
                    fontSize: 13,
                    fontWeight: 850,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                  <span style={{
                    minWidth: 22,
                    height: 22,
                    padding: '0 7px',
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: selected ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                    color: selected ? '#000' : 'rgba(255,255,255,0.55)',
                    fontSize: 11,
                    fontWeight: 900,
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={styles.contentInner}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}><div className="spinner" /></div>
        ) : activeCars.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#0C0C0C', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
            <Gavel size={42} style={{ color: 'rgba(255,255,255,0.14)', marginBottom: 14 }} />
            <div style={{ fontSize: 15, color: '#fff', fontWeight: 850, marginBottom: 6 }}>No {activeTab} auctions</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>
              {activeTab === 'draft'
                ? 'Add or edit a listing, then return here to configure its auction.'
                : 'Auctions will appear here after they move into this state.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activeTab === 'draft' && activeCars.map((car) => (
              <DraftAuctionCard
                key={car._id}
                car={car}
                expanded={expandedId === car._id}
                isLoading={actionLoading[car._id]}
                onToggle={() => setExpandedId(expandedId === car._id ? null : car._id)}
                onChange={(field, value) => updateCar(car._id, field, value)}
                onStart={() => handleStartAuction(car)}
                styles={styles}
              />
            ))}
            {activeTab === 'live' && activeCars.map((car) => (
              <LiveAuctionCard
                key={car._id}
                car={car}
                isLoading={actionLoading[car._id]}
                onEnd={handleEndAuction}
                onExtend={handleExtendAuction}
                onExtendHoursChange={(id, hours) => updateCar(id, '_extendHours', hours)}
                styles={styles}
              />
            ))}
            {activeTab === 'ended' && activeCars.map((car) => (
              <EndedAuctionCard key={car._id} car={car} styles={styles} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
