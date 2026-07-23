import { TimerReset, XCircle } from 'lucide-react';
import { formatKES } from '../../../api/api';
import { useCountdown } from '../../../hooks/useCountdown';
import { CountdownDisplay } from '../../../components/features/auction/CountdownDisplay';
import DealerAuctionStatusPill from './DealerAuctionStatusPill';
import DealerAuctionCarIdentity from './DealerAuctionCarIdentity';

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

const formatDateTime = (value) => {
  if (!value) return 'Not set';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function DealerAuctionLiveCard({ car, isLoading, onEnd, onExtend, onExtendHoursChange, styles }) {
  const time = useCountdown(car.auctionEnd);
  const extensionCount = car._extendCount || car.extensionCount || 0;
  const extensionLocked = extensionCount >= 3;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <DealerAuctionCarIdentity car={car} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <DealerAuctionStatusPill tone="live">Live</DealerAuctionStatusPill>
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
          <select value={car._extendHours || ''}
            onChange={(e) => onExtendHoursChange(car._id, e.target.value)}
            disabled={extensionLocked || !!isLoading}
            style={{ ...currencyInputStyle, width: 142, padding: '10px 11px' }}>
            <option value="" style={{ background: '#111' }}>Extend by</option>
            {EXTEND_OPTIONS.map((hours) => (
              <option key={hours} value={hours} style={{ background: '#111' }}>{hours} hour{hours === 1 ? '' : 's'}</option>
            ))}
          </select>
          <button onClick={() => onExtend(car._id, Number(car._extendHours || 0))}
            disabled={extensionLocked || !!isLoading}
            style={{
              ...styles.blueButton,
              opacity: extensionLocked || isLoading === 'extending' ? 0.55 : 1,
              cursor: extensionLocked || isLoading === 'extending' ? 'default' : 'pointer',
            }}>
            <TimerReset size={14} />
            {isLoading === 'extending' ? 'Extending...' : extensionLocked ? 'Limit Reached' : 'Extend Countdown'}
          </button>
        </div>
        <button onClick={() => onEnd(car._id)} disabled={!!isLoading}
          style={{
            ...styles.dangerButton,
            opacity: isLoading === 'ending' ? 0.55 : 1,
            cursor: isLoading === 'ending' ? 'wait' : 'pointer',
          }}>
          <XCircle size={14} />
          {isLoading === 'ending' ? 'Ending...' : 'End Auction'}
        </button>
      </div>
    </div>
  );
}
