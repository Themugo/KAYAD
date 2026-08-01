# KAYAD Media Event Engine

## Overview

The **Media Event Engine** is the real-time orchestration layer responsible for synchronizing every live auction event across the KAYAD ecosystem. It acts as the central nervous system of KAYAD's live auction ecosystem, enabling every auction event to flow seamlessly into broadcasts, notifications, analytics, replays, and future multimedia experiences.

## Architecture

```
┌─────────────────┐
│ Auction Engine  │
│  (Business      │
│   Logic)        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│     MEDIA EVENT ENGINE          │
│  ┌───────────────────────────┐  │
│  │    Event Bus & Types     │  │
│  │   (Standardized Events)   │  │
│  └───────────┬───────────────┘  │
│              │                  │
│  ┌───────────▼───────────────┐  │
│  │   Channel Distribution   │  │
│  │   (Multi-channel Router)  │  │
│  └───────────┬───────────────┘  │
│              │                  │
│  ┌───────────▼───────────────┐  │
│  │   Broadcast Services     │  │
│  │  Commentary | Sync       │  │
│  └───────────┬───────────────┘  │
└──────────────┼──────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Public  │ │Bidder  │ │Organizer│
│View     │ │Room    │ │Console │
└────────┘ └────────┘ └────────┘
```

## Core Components

### 1. Event Types (`types/`)

Standardized event types for consistent event handling:

| Category | Events |
|----------|--------|
| **Auction Lifecycle** | `AUCTION_CREATED`, `AUCTION_PUBLISHED`, `AUCTION_STARTED`, `AUCTION_PAUSED`, `AUCTION_RESUMED`, `AUCTION_EXTENDED`, `AUCTION_CLOSED`, `AUCTION_COMPLETED` |
| **Bidding** | `NEW_HIGHEST_BID`, `RESERVE_PRICE_MET`, `RESERVE_PRICE_NOT_MET`, `FINAL_FIVE_MINUTES`, `FINAL_MINUTE` |
| **Registration** | `REGISTRATION_OPENED`, `REGISTRATION_CLOSED` |
| **Viewing** | `VIEWING_DAY_STARTED`, `VIEWING_DAY_CLOSED`, `INSPECTION_BOOKED`, `INSPECTION_COMPLETED` |
| **Outcome** | `WINNER_CONFIRMED`, `DIGITAL_CERTIFICATE_ISSUED`, `PAYMENT_PENDING`, `VEHICLE_COLLECTED` |
| **Administrative** | `AUCTION_CANCELLED`, `AUCTION_POSTPONED`, `AUCTION_RELISTED` |

### 2. Channel Distribution (`channels/`)

Event routing to multiple consumers:

| Channel | Access Level | Purpose |
|---------|-------------|---------|
| `PUBLIC_BROADCAST` | Public | Public spectator view |
| `BIDDER_ROOM` | Registered Bidders | Bid updates and personal notifications |
| `ORGANIZER_CONSOLE` | Organizers | Full operational control |
| `DEALER_BUSINESS_CENTER` | Dealers | Inventory and bidding management |
| `NOTIFICATIONS` | System | Push, email, SMS routing |
| `REPLAY_SERVICE` | System | Event recording and playback |
| `ANALYTICS` | System | Metrics and insights |
| `VIDEO_LAYER` | System | Future video streaming |
| `MOBILE_APP` | Registered Users | Future mobile integration |
| `API_CONSUMERS` | Public | Developer API access |

### 3. Broadcast Synchronization (`services/broadcastSync.js`)

Automatically updates:
- Current Bid
- Countdown
- Reserve Status
- Bid Count
- Commentary Feed
- Live Overlays
- Auction Timeline
- Viewer Panels

### 4. Commentary Integration (`services/commentaryService.js`)

Supports:
- Manual announcer audio
- Automated text updates
- Future AI narration
- Outbid notifications
- Milestone announcements

### 5. Replay Engine (`replay/`)

Automatically records:
- Timestamp
- Event
- Bid Amount
- Vehicle
- Auction Status
- Commentary Reference
- Overlay State

### 6. Audit Logging (`audit/`)

Maintains immutable logs for:
- Event Created
- Event Delivered
- Delivery Success/Failure
- Retry Attempts
- Replay Generation
- Notification Status

### 7. Failover & Resilience (`services/failoverService.js`)

- Circuit breaker pattern for service protection
- Automatic fallback mechanisms
- Health checks and recovery
- Alert integration

### 8. Output Adapters (`adapters/`)

Pluggable adapters for:
- **LiveTextAdapter**: Live text feeds
- **MobileNotificationAdapter**: Push notifications
- **EmailAdapter**: Email notifications
- **SMSAdapter**: SMS alerts
- **PushNotificationAdapter**: Browser push
- **PartnerAPIAdapter**: Third-party integrations
- **VideoOverlayAdapter**: Future video layer

## Usage

### Initialize the Engine

```javascript
import { initializeMediaEventEngine, mediaEventEngine } from './mediaEventEngine';

// Initialize on server startup
await initializeMediaEventEngine();
```

### Publish Events

```javascript
// Publish auction started
await mediaEventEngine.auctionStarted({
  id: 'auction-123',
  vehicleId: 'vehicle-456',
  startTime: Date.now(),
  endTime: Date.now() + 3 * 60 * 60 * 1000,
});

// Publish new bid
await mediaEventEngine.newHighestBid(
  { id: 'bid-789', amount: 55000, userId: 'bidder-1' },
  { id: 'auction-123', vehicleId: 'vehicle-456', reservePrice: 50000 }
);

// Publish winner
await mediaEventEngine.winnerConfirmed(
  { id: 'auction-123', highestBid: 85000 },
  { userId: 'winner-1', bidderTag: 'Bidder-5678' }
);
```

### Register Event Handlers

```javascript
mediaEventEngine.on('bid.new_highest', (event) => {
  console.log(`New bid: ${event.payload.amount}`);
  // Update external systems, trigger webhooks, etc.
});
```

### Use Commentary

```javascript
import { commentaryService } from './mediaEventEngine';

// Send manual commentary
await commentaryService.sendManualCommentary(
  'auction-123',
  'This is an exciting moment!',
  { announcerName: 'John' }
);
```

### Get Replay Data

```javascript
import { replayEngine } from './mediaEventEngine';

// Get full timeline
const timeline = replayEngine.getTimeline('auction-123');

// Export for replay
const exportData = replayEngine.exportRecording('auction-123');
```

### Query Audit Logs

```javascript
import { auditLogger } from './mediaEventEngine';

// Get audit trail for auction
const audit = auditLogger.getAuctionAuditTrail('auction-123');

// Query by event type
const results = auditLogger.query({ eventType: 'bid.new_highest' });
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/media-event-engine/dashboard` | Full dashboard data |
| GET | `/api/media-event-engine/health` | System health status |
| GET | `/api/media-event-engine/metrics` | System metrics |
| GET | `/api/media-event-engine/channels` | Channel status |
| GET | `/api/media-event-engine/events` | Event timeline |
| GET | `/api/media-event-engine/replay` | Replay status |
| GET | `/api/media-event-engine/auction/:id/replay` | Auction replay |
| POST | `/api/media-event-engine/publish` | Publish event (admin) |
| POST | `/api/media-event-engine/commentary` | Send commentary |

## Monitoring Dashboard

The monitoring dashboard provides:

- **Overview**: Active auctions, events processed, delivery success rate
- **Channels**: Per-channel delivery metrics
- **Events**: Event timeline and counts
- **Replay**: Recording status
- **Commentary**: Commentary activity
- **Audit**: Audit log summary
- **Adapters**: Output adapter status
- **Failover**: Service health and circuit breaker status

Design colors use:
- Light Navy (`#1e3a5f`)
- Warm Beige (`#f5f0e8`)
- White (`#ffffff`)
- Emerald (`#10b981`)
- Muted Terracotta (`#c4a484`)
- Soft Blue (`#64748b`)

## Security

- Public users receive public events only
- Registered bidders receive bidder-specific updates
- Organizers receive operational events
- Sensitive information never leaks across channels

## Performance

- Low latency event processing
- High concurrency support
- Horizontal scalability
- Fault tolerance with circuit breakers
- Efficient event subscriptions
- Batch processing for queue optimization

## Future Readiness

Integration points prepared for:
- Live video streaming
- Multiple commentary languages
- AI-generated captions
- Speech-to-text
- Automatic highlight creation
- External broadcaster integrations
- Public developer APIs
- Cross-platform mobile applications

## Testing

```bash
# Run Media Event Engine tests
npm test -- --testPathPattern="mediaEventEngine"

# All tests
npm test
```

## File Structure

```
mediaEventEngine/
├── index.js                    # Main entry point
├── types/
│   ├── eventTypes.js           # Event type definitions
│   ├── eventSchema.js         # Event creation utilities
│   └── index.js
├── channels/
│   ├── channelDefinitions.js   # Channel types & mappings
│   ├── channelManager.js       # Event routing logic
│   └── index.js
├── services/
│   ├── mediaEventEngine.js     # Core event bus
│   ├── broadcastSync.js        # Broadcast synchronization
│   ├── commentaryService.js    # Commentary integration
│   ├── failoverService.js      # Failover & resilience
│   └── index.js
├── adapters/
│   └── outputAdapters.js       # Output adapter implementations
├── audit/
│   └── auditLogger.js          # Audit logging
├── replay/
│   └── replayEngine.js         # Replay recording
└── monitoring/
    ├── dashboard.js           # Dashboard data
    └── index.js
```

## License

Internal use - KAYAD Platform
