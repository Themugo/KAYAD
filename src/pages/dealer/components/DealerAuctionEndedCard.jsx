import { formatKES } from '../../../api/api';
import DealerAuctionStatusPill from './DealerAuctionStatusPill';
import DealerAuctionCarIdentity from './DealerAuctionCarIdentity';

const formatDateTime = (value) => {
  if (!value) return 'Not set';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function DealerAuctionEndedCard({ car, styles }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <DealerAuctionCarIdentity car={car} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <DealerAuctionStatusPill tone="ended">Ended</DealerAuctionStatusPill>
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
