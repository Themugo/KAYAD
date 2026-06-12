import { useMemo } from 'react';
import { ChevronDown, ChevronUp, Play, CalendarClock, Clock } from 'lucide-react';
import { formatKES } from '../../../api/api';
import DealerAuctionField from './DealerAuctionField';
import DealerAuctionStatusPill from './DealerAuctionStatusPill';
import DealerAuctionCarIdentity from './DealerAuctionCarIdentity';

const DURATIONS = [
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
  { label: '72 hours', value: 72 },
  { label: '5 days', value: 120 },
  { label: '7 days', value: 168 },
];

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

const formatDateTime = (value) => {
  if (!value) return 'Not set';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const toHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
};

export default function DealerAuctionDraftCard({ car, expanded, isLoading, onToggle, onChange, onStart, styles }) {
  const durationHours = toHours(car._durationHours);
  const estimatedEnd = useMemo(() => new Date(Date.now() + durationHours * 60 * 60 * 1000), [durationHours]);
  const startingBid = Number(car._startingBid || 0);
  const reservePrice = car._reservePrice ? Number(car._reservePrice) : 0;
  const hasReserveIssue = reservePrice > 0 && reservePrice < startingBid;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <DealerAuctionCarIdentity car={car} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <DealerAuctionStatusPill tone="draft">Ready to configure</DealerAuctionStatusPill>
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
              <DealerAuctionStatusPill tone="muted"><CalendarClock size={12} /> Starts immediately</DealerAuctionStatusPill>
              <DealerAuctionStatusPill tone="draft"><Clock size={12} /> Ends {formatDateTime(estimatedEnd)}</DealerAuctionStatusPill>
            </div>
          </div>

          <div style={styles.formGrid}>
            <DealerAuctionField label="Starting bid" hint="Minimum KES 1,000. This becomes the opening auction price.">
              <input type="number" min={1000} value={car._startingBid}
                onChange={(e) => onChange('_startingBid', e.target.value)}
                placeholder="1000" style={currencyInputStyle} />
            </DealerAuctionField>
            <DealerAuctionField label="Reserve price" hint="Optional. Must be at least the starting bid when provided.">
              <input type="number" min={0} value={car._reservePrice}
                onChange={(e) => onChange('_reservePrice', e.target.value)}
                placeholder="Optional"
                style={{ ...currencyInputStyle, borderColor: hasReserveIssue ? 'rgba(239,68,68,0.55)' : currencyInputStyle.border }} />
            </DealerAuctionField>
            <DealerAuctionField label="Duration" hint="Choose a preset or enter custom auction hours.">
              <select value={DURATIONS.some((d) => d.value === durationHours) ? durationHours : 'custom'}
                onChange={(e) => { if (e.target.value !== 'custom') onChange('_durationHours', Number(e.target.value)); }}
                style={currencyInputStyle}>
                {DURATIONS.map((duration) => (
                  <option key={duration.value} value={duration.value} style={{ background: '#111' }}>{duration.label}</option>
                ))}
                <option value="custom" style={{ background: '#111' }}>Custom hours</option>
              </select>
            </DealerAuctionField>
            <DealerAuctionField label="Custom hours" hint="Auctions must run at least 24 hours.">
              <input type="number" min={24} max={720} value={durationHours}
                onChange={(e) => onChange('_durationHours', e.target.value)} style={currencyInputStyle} />
            </DealerAuctionField>
          </div>

          <div style={styles.timeline}>
            <div>
              <div style={styles.timelineLabel}>Start Time</div>
              <div style={styles.timelineValue}>{formatDateTime(new Date())}</div>
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
            <button onClick={onStart} disabled={isLoading === 'starting' || hasReserveIssue}
              style={{
                ...styles.primaryButton,
                opacity: isLoading === 'starting' || hasReserveIssue ? 0.55 : 1,
                cursor: isLoading === 'starting' || hasReserveIssue ? 'default' : 'pointer',
              }}>
              <Play size={15} />
              {isLoading === 'starting' ? 'Starting Auction...' : 'Start Live Auction'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
