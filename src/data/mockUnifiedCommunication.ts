import { UnifiedChatThread } from '../types';

export const MOCK_UNIFIED_THREADS: UnifiedChatThread[] = [
  // 1. ESCROW VAULT CONVERSATION (STAGE 3 OF 6)
  {
    id: 'thread-escrow-01',
    category: 'escrow',
    referenceNumber: 'ESC-2026-88201',
    transactionType: 'CBK Trustee Escrow Vault',
    currentStatus: 'Stage 3 of 6: Inspection Approved',
    currentStage: 'Step 3 of 6 • Vault Lock Confirmed',
    participantName: 'NCBA Trustee Bank Custodian',
    participantRole: 'KAYAD Escrow Custodian (Nairobi HQ)',
    participantAvatar: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    participantStatus: 'online',
    isTyping: false,
    unreadCount: 1,
    lastMessage: 'Vault Hold Active: Ksh 6,850,000 locked into Trustee Account #NCBA-ESC-88201. 150-Point Inspection cleared (96/100).',
    lastTimestamp: '11:20 AM',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 6850000,
    vehicleVin: 'JTEBU09J30K091842',
    vehicleLocation: 'Westlands, Nairobi',
    vehicleMileage: '42,000 km',
    escrowId: 'ESC-2026-88201',
    counterpartyInfo: {
      name: 'NCBA Bank Kenya Custody Desk',
      role: 'CBK Licensed Trustee Bank',
      maskedPhone: '+254 711 *** *88',
      unmaskedPhone: '+254 711 038 888',
      rating: 4.9,
      trustScore: 99,
      verifiedSince: '2023',
      location: 'NCBA Centre, Mara Road',
      county: 'Nairobi'
    },
    escrowSummary: {
      vaultId: 'NCBA-ESC-88201',
      amountLocked: 6850000,
      bankVault: 'NCBA Bank Kenya Custody',
      step: 3,
      totalSteps: 6,
      status: 'Deposit Locked & Verified'
    },
    inspectionSummary: {
      reportId: 'AUD-8910-KE',
      score: 96,
      inspectorName: 'Eng. Peter Omondi',
      station: 'AutoCheck Industrial Area Yard',
      chassisStatus: 'Passed (Zero Deformation)',
      obdStatus: 'Cleared (No Fault Codes)',
      status: 'Passed'
    },
    participants: [
      { id: 'p1', name: 'James Mwangi', role: 'Buyer (You)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' },
      { id: 'p2', name: 'Crown Motors Kenya', role: 'Verified Dealer', avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' },
      { id: 'p3', name: 'NCBA Custodian', role: 'Escrow Vault Custodian', avatar: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' }
    ],
    timeline: [
      { id: 'tl1', title: 'Vehicle Inquiry Sent', description: 'Buyer requested availability & logbook copy', timestamp: 'Yesterday, 09:30 AM', status: 'completed', actor: 'Buyer' },
      { id: 'tl2', title: 'Inspection Booked', description: '150-Point Technical Inspection scheduled at AutoCheck', timestamp: 'Yesterday, 11:15 AM', status: 'completed', actor: 'Dealer' },
      { id: 'tl3', title: 'Inspection Passed (96/100)', description: 'Engine, chassis, and OBD diagnostics verified 100% clean', timestamp: 'Today, 08:45 AM', status: 'completed', actor: 'Field Engineer' },
      { id: 'tl4', title: 'Escrow Vault Deposit Locked', description: 'Ksh 6,850,000 deposited into NCBA Bank Trustee Account', timestamp: 'Today, 11:20 AM', status: 'current', actor: 'NCBA Bank' },
      { id: 'tl5', title: 'NTSA TIMS Title Transfer', description: 'Logbook transfer initiation pending buyer final test drive', timestamp: 'Upcoming', status: 'upcoming', actor: 'NTSA TIMS' },
      { id: 'tl6', title: 'Vault Payout Released', description: 'Funds released to seller upon physical vehicle handover', timestamp: 'Upcoming', status: 'upcoming', actor: 'Escrow Custodian' }
    ],
    smartActions: [
      { id: 'sa1', label: 'View 150-Pt Report', actionKey: 'view_report', variant: 'primary', iconName: 'ClipboardCheck' },
      { id: 'sa2', label: 'Approve Title Transfer', actionKey: 'approve_transfer', variant: 'accent', iconName: 'CheckCircle2' },
      { id: 'sa3', label: 'Book Handover Meeting', actionKey: 'book_meeting', variant: 'outline', iconName: 'Calendar' }
    ],
    sharedFiles: [
      { id: 'sf1', fileName: 'KAYAD_150Pt_Inspection_Prado_KDF892X.pdf', fileType: 'pdf', fileSize: '3.4 MB', uploadedAt: 'Today, 08:50 AM', uploadedBy: 'AutoCheck Lead' },
      { id: 'sf2', fileName: 'NTSA_TIMS_Verified_Logbook_Copy.pdf', fileType: 'logbook', fileSize: '1.8 MB', uploadedAt: 'Yesterday, 10:00 AM', uploadedBy: 'Crown Motors' },
      { id: 'sf3', fileName: 'NCBA_Escrow_Trustee_Deposit_Receipt.pdf', fileType: 'receipt', fileSize: '1.1 MB', uploadedAt: 'Today, 11:22 AM', uploadedBy: 'NCBA Bank' }
    ],
    messages: [
      {
        id: 'em1',
        threadId: 'thread-escrow-01',
        category: 'escrow',
        sender: 'dealer',
        senderName: 'Crown Motors Kenya',
        senderAvatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200',
        text: 'Jambo! The 2021 Toyota Land Cruiser Prado TX-L has passed the 150-point technical audit with a 96/100 score. All documentation is ready.',
        timestamp: '09:30 AM',
        readStatus: 'read'
      },
      {
        id: 'em2',
        threadId: 'thread-escrow-01',
        category: 'escrow',
        sender: 'inspector',
        senderName: 'Eng. Peter Omondi (AutoCheck)',
        text: 'INSPECTION COMPLETE: Chassis zero-defect certified. No diagnostic trouble codes found. Report attached below.',
        timestamp: '09:45 AM',
        readStatus: 'read',
        attachments: [
          {
            type: 'inspection_pdf',
            fileName: 'KAYAD_150Pt_Inspection_Prado_KDF892X.pdf',
            fileSize: '3.4 MB',
            inspectionScore: 96,
            url: '#'
          }
        ]
      },
      {
        id: 'em3',
        threadId: 'thread-escrow-01',
        category: 'escrow',
        sender: 'escrow_custodian',
        senderName: 'NCBA Trustee Bank Custodian',
        senderAvatar: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=200',
        text: 'TRUSTEE VAULT LOCK CONFIRMED: Ksh 6,850,000 has been securely locked into NCBA Bank Trustee Vault #NCBA-ESC-88201. Funds will not be disbursed until buyer signs final release.',
        timestamp: '11:20 AM',
        readStatus: 'delivered',
        attachments: [
          {
            type: 'payment_receipt',
            fileName: 'NCBA_Escrow_Trustee_Deposit_Receipt.pdf',
            paymentAmount: 6850000,
            paymentMethod: 'NCBA Real-Time Settlement',
            paymentReference: 'NCBA-ESC-88201'
          }
        ]
      }
    ]
  },

  // 2. DEALER CONVERSATION & TEST DRIVE
  {
    id: 'thread-dealer-02',
    category: 'dealer',
    referenceNumber: 'DLR-2026-44102',
    transactionType: 'Verified Motor Dealer Inquiry',
    currentStatus: 'Test Drive Scheduled',
    currentStage: 'VIP Showroom Appointment Confirmed',
    participantName: 'Crown Motors Kenya',
    participantRole: 'Enterprise Dealer (Waiyaki Way, Nairobi)',
    participantAvatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    participantStatus: 'online',
    isTyping: true,
    unreadCount: 0,
    lastMessage: 'Your VIP test drive for tomorrow at 10:00 AM at Westlands flagship yard is locked in. Coffee is on us!',
    lastTimestamp: '10:45 AM',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 6850000,
    vehicleVin: 'JTEBU09J30K091842',
    vehicleLocation: 'Waiyaki Way, Westlands',
    vehicleMileage: '42,000 km',
    counterpartyInfo: {
      name: 'Crown Motors Kenya Yard',
      role: 'Enterprise Platinum Dealer',
      maskedPhone: '+254 722 *** *19',
      unmaskedPhone: '+254 722 901 819',
      rating: 4.95,
      trustScore: 98,
      verifiedSince: '2021',
      location: 'Plot 42, Waiyaki Way, Westlands',
      county: 'Nairobi'
    },
    participants: [
      { id: 'p1', name: 'James Mwangi', role: 'Buyer (You)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' },
      { id: 'p2', name: 'Sales Manager - Crown Motors', role: 'Verified Representative', avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online', isTyping: true }
    ],
    timeline: [
      { id: 'tl1', title: 'Marketplace Inquiry Submitted', description: 'Buyer requested showroom location & spec sheet', timestamp: 'Yesterday, 09:30 AM', status: 'completed', actor: 'Buyer' },
      { id: 'tl2', title: 'Location & Logbook Provided', description: 'Dealer shared GPS showroom pin & TIMS verification', timestamp: 'Yesterday, 09:40 AM', status: 'completed', actor: 'Dealer' },
      { id: 'tl3', title: 'Test Drive Scheduled', description: 'Appointment confirmed for tomorrow at 10:00 AM', timestamp: 'Today, 10:45 AM', status: 'current', actor: 'Dealer' },
      { id: 'tl4', title: 'Showroom Visit & Drive', description: 'Physical test drive & chassis check at Westlands yard', timestamp: 'Tomorrow, 10:00 AM', status: 'upcoming', actor: 'Buyer' }
    ],
    smartActions: [
      { id: 'sa1', label: 'Book Test Drive', actionKey: 'book_test_drive', variant: 'primary', iconName: 'Calendar' },
      { id: 'sa2', label: 'Reserve Vehicle', actionKey: 'reserve_vehicle', variant: 'accent', iconName: 'Lock' },
      { id: 'sa3', label: 'Apply Finance', actionKey: 'apply_finance', variant: 'outline', iconName: 'Landmark' }
    ],
    sharedFiles: [
      { id: 'sf1', fileName: 'CrownMotors_Prado_FeatureSpecSheet.pdf', fileType: 'pdf', fileSize: '2.2 MB', uploadedAt: 'Yesterday, 09:35 AM', uploadedBy: 'Crown Motors' }
    ],
    messages: [
      {
        id: 'dm1',
        threadId: 'thread-dealer-02',
        category: 'dealer',
        sender: 'dealer',
        senderName: 'Crown Motors Kenya',
        senderAvatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200',
        text: 'Karibu! The 2021 Prado TX-L is in high demand. We have parked it in our main VIP bay for your inspection.',
        timestamp: '09:30 AM',
        readStatus: 'read',
        attachments: [
          {
            type: 'location',
            locationName: 'Crown Motors Flagship Yard Westlands',
            locationAddress: 'Plot 42, Waiyaki Way, Westlands, Nairobi',
            lat: -1.2676,
            lng: 36.8052
          }
        ]
      },
      {
        id: 'dm2',
        threadId: 'thread-dealer-02',
        category: 'dealer',
        sender: 'user',
        senderName: 'James Mwangi',
        text: 'Awesome, please confirm if 10:00 AM tomorrow works for a test drive and inspection scan.',
        timestamp: '09:35 AM',
        readStatus: 'read'
      },
      {
        id: 'dm3',
        threadId: 'thread-dealer-02',
        category: 'dealer',
        sender: 'dealer',
        senderName: 'Crown Motors Kenya',
        text: 'Confirmed! We have booked your VIP slot.',
        timestamp: '10:45 AM',
        readStatus: 'read',
        attachments: [
          {
            type: 'appointment',
            appointmentTitle: 'VIP Test Drive & Inspection Visit',
            appointmentDate: '2026-07-31',
            appointmentTime: '10:00 AM',
            appointmentLocation: 'Waiyaki Way Showroom, Nairobi',
            appointmentStatus: 'Confirmed'
          }
        ]
      }
    ]
  },

  // 3. PRIVATE SELLER NEGOTIATION
  {
    id: 'thread-seller-03',
    category: 'seller',
    referenceNumber: 'SEL-2026-77341',
    transactionType: 'Verified Private Seller Negotiation',
    currentStatus: 'Offer Under Review',
    currentStage: 'Price Agreement • Ksh 3.4M Offered',
    participantName: 'David Kariuki (Private Owner)',
    participantRole: 'Individual Owner (Karen, Nairobi)',
    participantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    participantStatus: 'offline',
    isTyping: false,
    unreadCount: 0,
    lastMessage: 'I accept your offer of Ksh 3,450,000 provided we initiate KAYAD CBK Escrow immediately for safety.',
    lastTimestamp: 'Yesterday',
    vehicleId: 'v2',
    vehicleTitle: '2019 Subaru Outback 2.5i Limited',
    vehicleImage: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 3500000,
    vehicleVin: 'JF2BSAC69KG291044',
    vehicleLocation: 'Karen, Nairobi',
    vehicleMileage: '61,000 km',
    counterpartyInfo: {
      name: 'David Kariuki',
      role: 'Private Owner (NTSA Verified)',
      maskedPhone: '+254 733 *** *09',
      unmaskedPhone: '+254 733 491 009',
      rating: 4.8,
      trustScore: 94,
      verifiedSince: '2024',
      location: 'Karen Estate',
      county: 'Nairobi'
    },
    participants: [
      { id: 'p1', name: 'James Mwangi', role: 'Buyer (You)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' },
      { id: 'p2', name: 'David Kariuki', role: 'Private Seller', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', onlineStatus: 'offline', lastSeen: '45m ago' }
    ],
    timeline: [
      { id: 'tl1', title: 'Inquiry & Video Tour Sent', description: 'Seller sent HD video of engine bay and interior', timestamp: '2 days ago', status: 'completed', actor: 'Seller' },
      { id: 'tl2', title: 'Price Counter-Offer Submitted', description: 'Buyer offered Ksh 3,450,000 via direct chat', timestamp: 'Yesterday', status: 'completed', actor: 'Buyer' },
      { id: 'tl3', title: 'Offer Accepted by Seller', description: 'Seller agreed to terms subject to CBK Escrow', timestamp: 'Yesterday', status: 'current', actor: 'Seller' },
      { id: 'tl4', title: 'Book 150-Point Audit', description: 'Pre-purchase inspection at buyer’s preferred station', timestamp: 'Upcoming', status: 'upcoming', actor: 'Buyer' },
      { id: 'tl5', title: 'Start CBK Trustee Escrow', description: 'Lock deposit safely before title transfer', timestamp: 'Upcoming', status: 'upcoming', actor: 'Escrow System' }
    ],
    smartActions: [
      { id: 'sa1', label: 'Book Inspection', actionKey: 'book_inspection', variant: 'primary', iconName: 'ClipboardCheck' },
      { id: 'sa2', label: 'Start Escrow', actionKey: 'start_escrow', variant: 'accent', iconName: 'ShieldCheck' },
      { id: 'sa3', label: 'Request Logbook', actionKey: 'request_logbook', variant: 'outline', iconName: 'FileText' }
    ],
    sharedFiles: [
      { id: 'sf1', fileName: 'Subaru_Outback_Original_Service_Records.pdf', fileType: 'pdf', fileSize: '4.1 MB', uploadedAt: '2 days ago', uploadedBy: 'David Kariuki' }
    ],
    messages: [
      {
        id: 'sm1',
        threadId: 'thread-seller-03',
        category: 'seller',
        sender: 'seller',
        senderName: 'David Kariuki',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        text: 'Hi James! The Subaru Outback is well maintained with full Subaru Kenya agent service history. Here is a short walkaround video clip.',
        timestamp: 'Yesterday',
        readStatus: 'read',
        attachments: [
          {
            type: 'video',
            fileName: 'Outback_ColdStart_Engine.mp4',
            fileSize: '14.2 MB',
            videoDuration: '0:45',
            url: '#'
          }
        ]
      },
      {
        id: 'sm2',
        threadId: 'thread-seller-03',
        category: 'seller',
        sender: 'user',
        senderName: 'James Mwangi',
        text: 'Looks great! Would you take Ksh 3,450,000 if we lock it in KAYAD Escrow today?',
        timestamp: 'Yesterday',
        readStatus: 'read'
      },
      {
        id: 'sm3',
        threadId: 'thread-seller-03',
        category: 'seller',
        sender: 'seller',
        senderName: 'David Kariuki',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        text: 'I accept your offer of Ksh 3,450,000 provided we initiate KAYAD CBK Escrow immediately for safety.',
        timestamp: 'Yesterday',
        readStatus: 'read'
      }
    ]
  },

  // 4. AUCTION HOUSE BIDDING
  {
    id: 'thread-auction-04',
    category: 'auction',
    referenceNumber: 'AUC-2026-99204',
    transactionType: 'KAYAD Live Auction Floor',
    currentStatus: 'Live Bidding Active',
    currentStage: 'Highest Bidder • Ksh 4.15M (Reserve Met)',
    participantName: 'KAYAD Live Auction Desk',
    participantRole: 'Automated Bidding Engine & Floor Manager',
    participantAvatar: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    participantStatus: 'online',
    isTyping: false,
    unreadCount: 2,
    lastMessage: 'OUTBID ALERT: Another verified bidder placed Ksh 4,150,000. 28 minutes remaining in live auction.',
    lastTimestamp: '12:05 PM',
    auctionId: 'v8',
    vehicleId: 'v8',
    vehicleTitle: '2018 Mercedes-Benz C200 AMG Line',
    vehicleImage: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 4150000,
    vehicleVin: 'WDD2050422R98104',
    vehicleLocation: 'Kilimani, Nairobi',
    vehicleMileage: '38,500 km',
    counterpartyInfo: {
      name: 'KAYAD Certified Auction House',
      role: 'Automated Real-Time Auction Engine',
      maskedPhone: '+254 700 *** *00',
      unmaskedPhone: '+254 700 000 000',
      rating: 5.0,
      trustScore: 100,
      verifiedSince: '2022',
      location: 'KAYAD Platform Systems',
      county: 'Nairobi'
    },
    auctionSummary: {
      auctionCode: 'AUC-C200-881',
      currentBid: 4150000,
      reservePrice: 3900000,
      bidsCount: 14,
      timeLeft: '28m 14s',
      status: 'Live Bidding - Reserve Met'
    },
    participants: [
      { id: 'p1', name: 'James Mwangi', role: 'Bidder #41 (You)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' },
      { id: 'p2', name: 'Auction Monitor', role: 'KAYAD Automated Engine', avatar: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' }
    ],
    timeline: [
      { id: 'tl1', title: 'Auction Lot Opened', description: 'Starting bid set at Ksh 3,200,000 with Ksh 3.9M Reserve', timestamp: 'Today, 09:00 AM', status: 'completed', actor: 'Auction House' },
      { id: 'tl2', title: 'Reserve Price Met', description: 'Bid reached Ksh 3,950,000 at 11:10 AM', timestamp: 'Today, 11:10 AM', status: 'completed', actor: 'Bidder #19' },
      { id: 'tl3', title: 'High Bid Placed: Ksh 4,150,000', description: 'Bidder #71 placed higher bid', timestamp: 'Today, 12:05 PM', status: 'current', actor: 'Bidder #71' },
      { id: 'tl4', title: 'Hammer Falls & Escrow Trigger', description: 'Winning bidder automatically proceeds to CBK Escrow', timestamp: '28 minutes left', status: 'upcoming', actor: 'Auction Desk' }
    ],
    smartActions: [
      { id: 'sa1', label: 'Place Bid (+Ksh 50k)', actionKey: 'place_bid', variant: 'primary', iconName: 'Gavel' },
      { id: 'sa2', label: 'Watch Auction', actionKey: 'watch_auction', variant: 'outline', iconName: 'Eye' }
    ],
    sharedFiles: [
      { id: 'sf1', fileName: 'Auction_Lot_Condition_Report_C200.pdf', fileType: 'pdf', fileSize: '2.9 MB', uploadedAt: 'Today, 08:30 AM', uploadedBy: 'Auction House' }
    ],
    messages: [
      {
        id: 'am1',
        threadId: 'thread-auction-04',
        category: 'auction',
        sender: 'system',
        senderName: 'KAYAD Live Bidding',
        text: 'BID CONFIRMED: Your bid of Ksh 4,000,000 was placed successfully. You were the high bidder.',
        timestamp: '11:45 AM',
        readStatus: 'read'
      },
      {
        id: 'am2',
        threadId: 'thread-auction-04',
        category: 'auction',
        sender: 'system',
        senderName: 'KAYAD Live Bidding',
        text: 'OUTBID ALERT: Bidder #71 placed Ksh 4,150,000 for 2018 Mercedes-Benz C200 AMG Line. Click below to place a counter-bid before time expires.',
        timestamp: '12:05 PM',
        readStatus: 'delivered'
      }
    ]
  },

  // 5. 150-POINT MECHANIC INSPECTION
  {
    id: 'thread-inspection-05',
    category: 'inspection',
    referenceNumber: 'INS-2026-66305',
    transactionType: 'AutoCheck 150-Point Technical Audit',
    currentStatus: 'Report Ready (94/100)',
    currentStage: 'Comprehensive Diagnostics & Chassis Verified',
    participantName: 'Eng. Francis Kimani',
    participantRole: 'Senior AutoCheck Field Engineer (Nairobi)',
    participantAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    participantStatus: 'online',
    isTyping: false,
    unreadCount: 0,
    lastMessage: 'The 150-point inspection report for the 2020 Land Rover Defender 110 is finalized. Overall score: 94/100.',
    lastTimestamp: 'Yesterday',
    inspectionId: 'INS-2026-66305',
    vehicleId: 'v4',
    vehicleTitle: '2020 Land Rover Defender 110 P400 SE',
    vehicleImage: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 11500000,
    vehicleVin: 'SALWR2SU8LC091442',
    vehicleLocation: 'Industrial Area, Nairobi',
    vehicleMileage: '29,000 km',
    counterpartyInfo: {
      name: 'Eng. Francis Kimani',
      role: 'Master Automotive Inspector',
      maskedPhone: '+254 721 *** *54',
      unmaskedPhone: '+254 721 884 954',
      rating: 4.98,
      trustScore: 99,
      verifiedSince: '2020',
      location: 'AutoCheck Center, Commercial St',
      county: 'Nairobi'
    },
    inspectionSummary: {
      reportId: 'AUD-DEF-110',
      score: 94,
      inspectorName: 'Eng. Francis Kimani',
      station: 'AutoCheck Commercial Street Station',
      chassisStatus: 'Factory Alignment (Zero Twist)',
      obdStatus: 'All ECU Modules Passed',
      status: 'Passed Gold Tier'
    },
    participants: [
      { id: 'p1', name: 'James Mwangi', role: 'Vehicle Buyer', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' },
      { id: 'p2', name: 'Eng. Francis Kimani', role: 'AutoCheck Engineer', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' }
    ],
    timeline: [
      { id: 'tl1', title: 'Inspection Requested', description: 'Buyer requested 150-point technical audit', timestamp: '2 days ago', status: 'completed', actor: 'Buyer' },
      { id: 'tl2', title: 'Vehicle Arrived at Station', description: 'Vehicle checked in at Commercial Street station', timestamp: 'Yesterday, 09:00 AM', status: 'completed', actor: 'AutoCheck' },
      { id: 'tl3', title: 'Chassis & Engine Diagnostics', description: 'OBD scanner & hydraulic lift chassis inspection', timestamp: 'Yesterday, 11:30 AM', status: 'completed', actor: 'Field Engineer' },
      { id: 'tl4', title: 'Certified PDF Certificate Issued', description: '94/100 Score report published to buyer vault', timestamp: 'Yesterday, 04:00 PM', status: 'current', actor: 'Lead Engineer' }
    ],
    smartActions: [
      { id: 'sa1', label: 'View 150-Pt Report', actionKey: 'view_report', variant: 'primary', iconName: 'ClipboardCheck' },
      { id: 'sa2', label: 'Reschedule Audit', actionKey: 'reschedule_audit', variant: 'outline', iconName: 'Calendar' }
    ],
    sharedFiles: [
      { id: 'sf1', fileName: 'AutoCheck_Defender110_150Pt_Report.pdf', fileType: 'pdf', fileSize: '4.8 MB', uploadedAt: 'Yesterday, 04:05 PM', uploadedBy: 'Eng. Francis' }
    ],
    messages: [
      {
        id: 'im1',
        threadId: 'thread-inspection-05',
        category: 'inspection',
        sender: 'inspector',
        senderName: 'Eng. Francis Kimani',
        senderAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
        text: 'Hello James. I have completed the 150-point inspection for the Defender 110. The air suspension, twin-turbo engine, and chassis alignment are flawless. Minor brake pad wear noted (70% life remaining). Report attached.',
        timestamp: 'Yesterday',
        readStatus: 'read',
        attachments: [
          {
            type: 'inspection_pdf',
            fileName: 'AutoCheck_Defender110_150Pt_Report.pdf',
            fileSize: '4.8 MB',
            inspectionScore: 94,
            url: '#'
          }
        ]
      }
    ]
  },

  // 6. BANK ASSET FINANCING
  {
    id: 'thread-finance-06',
    category: 'finance',
    referenceNumber: 'FIN-2026-33906',
    transactionType: 'NCBA Asset Finance Underwriting',
    currentStatus: 'Pre-Approval Granted (70% LTV)',
    currentStage: 'Underwriting Approved • Ksh 4,795,000 Facility',
    participantName: 'NCBA Asset Finance Officer',
    participantRole: 'Senior Loan Underwriter (Upper Hill, Nairobi)',
    participantAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    participantStatus: 'online',
    isTyping: false,
    unreadCount: 0,
    lastMessage: 'PRE-APPROVAL GRANTED: NCBA Bank has pre-approved your asset finance application for Ksh 4,795,000 at 13.5% p.a. over 48 months.',
    lastTimestamp: '08:30 AM',
    loanAppRef: 'FIN-2026-33906',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 6850000,
    vehicleVin: 'JTEBU09J30K091842',
    vehicleLocation: 'Upper Hill, Nairobi',
    vehicleMileage: '42,000 km',
    counterpartyInfo: {
      name: 'NCBA Bank Kenya Asset Finance',
      role: 'Tier 1 Kenyan Commercial Bank',
      maskedPhone: '+254 711 *** *00',
      unmaskedPhone: '+254 711 012 000',
      rating: 4.9,
      trustScore: 99,
      verifiedSince: '2022',
      location: 'NCBA Tower, Upper Hill',
      county: 'Nairobi'
    },
    financeSummary: {
      partnerBank: 'NCBA Bank Kenya',
      loanCode: 'NCBA-AF-2026-91',
      approvedLimit: 4795000,
      interestRate: '13.5% p.a.',
      monthlyInstallment: 129400,
      status: 'Pre-Approved'
    },
    participants: [
      { id: 'p1', name: 'James Mwangi', role: 'Applicant (You)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' },
      { id: 'p2', name: 'NCBA Loan Officer', role: 'Underwriter', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' }
    ],
    timeline: [
      { id: 'tl1', title: 'Finance Application Submitted', description: 'Income statements & KRA PIN submitted', timestamp: '2 days ago', status: 'completed', actor: 'Applicant' },
      { id: 'tl2', title: 'CRB Credit Check Passed', description: 'Clean credit rating verified via Metropol', timestamp: 'Yesterday', status: 'completed', actor: 'NCBA Underwriting' },
      { id: 'tl3', title: 'Pre-Approval Certificate Issued', description: 'Ksh 4.795M facility approved at 13.5% interest', timestamp: 'Today, 08:30 AM', status: 'current', actor: 'NCBA Bank' },
      { id: 'tl4', title: 'Disbursement to KAYAD Escrow', description: 'Bank transfers loan proceeds directly to NCBA Escrow', timestamp: 'Upcoming', status: 'upcoming', actor: 'Bank Operations' }
    ],
    smartActions: [
      { id: 'sa1', label: 'Upload Documents', actionKey: 'upload_docs', variant: 'primary', iconName: 'Paperclip' },
      { id: 'sa2', label: 'Check Status', actionKey: 'check_status', variant: 'outline', iconName: 'Landmark' }
    ],
    sharedFiles: [
      { id: 'sf1', fileName: 'NCBA_PreApproval_Facility_Letter.pdf', fileType: 'pdf', fileSize: '1.9 MB', uploadedAt: 'Today, 08:35 AM', uploadedBy: 'NCBA Bank' }
    ],
    messages: [
      {
        id: 'fm1',
        threadId: 'thread-finance-06',
        category: 'finance',
        sender: 'bank_officer',
        senderName: 'NCBA Loan Underwriter',
        senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
        text: 'CONGRATULATIONS: Your pre-approval for Toyota Land Cruiser Prado TX-L is complete. Loan amount: Ksh 4,795,000 (70% LTV). Monthly repayment: Ksh 129,400 over 48 months.',
        timestamp: '08:30 AM',
        readStatus: 'read',
        attachments: [
          {
            type: 'document',
            fileName: 'NCBA_PreApproval_Facility_Letter.pdf',
            fileSize: '1.9 MB',
            url: '#'
          }
        ]
      }
    ]
  },

  // 7. SUPPORT TICKET / ARBITRATION
  {
    id: 'thread-support-07',
    category: 'support',
    referenceNumber: 'SUP-2026-11407',
    transactionType: 'KAYAD Resolution Center Ticket',
    currentStatus: 'SLA In Progress (15-Min Lead)',
    currentStage: 'Escrow Fee Verification Inquiry',
    participantName: 'KAYAD Support Concierge',
    participantRole: 'Senior Operations Lead (Nairobi HQ)',
    participantAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    participantStatus: 'online',
    isTyping: false,
    unreadCount: 0,
    lastMessage: 'Jambo James! Our support team has reviewed your escrow fee inquiry. The 1.5% commission includes NTSA logbook transfer processing.',
    lastTimestamp: '10:10 AM',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 6850000,
    counterpartyInfo: {
      name: 'KAYAD Resolution Desk',
      role: 'Platform Operations Support',
      maskedPhone: '+254 700 *** *11',
      unmaskedPhone: '+254 700 111 222',
      rating: 5.0,
      trustScore: 100,
      verifiedSince: '2023',
      location: 'KAYAD HQ, Westlands',
      county: 'Nairobi'
    },
    participants: [
      { id: 'p1', name: 'James Mwangi', role: 'User (You)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' },
      { id: 'p2', name: 'Support Lead', role: 'KAYAD Operations', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' }
    ],
    timeline: [
      { id: 'tl1', title: 'Ticket Created', description: 'User asked about escrow fee structure & TIMS charges', timestamp: 'Today, 09:55 AM', status: 'completed', actor: 'User' },
      { id: 'tl2', title: 'Assigned to Senior SLA Agent', description: 'Assigned to Customer Operations Lead', timestamp: 'Today, 10:00 AM', status: 'completed', actor: 'System' },
      { id: 'tl3', title: 'Response Delivered', description: 'Clarification provided on 1.5% fee breakdown', timestamp: 'Today, 10:10 AM', status: 'current', actor: 'Support Agent' }
    ],
    smartActions: [
      { id: 'sa1', label: 'Open Ticket', actionKey: 'open_ticket', variant: 'primary', iconName: 'Ticket' },
      { id: 'sa2', label: 'Escalate Case', actionKey: 'escalate_case', variant: 'coral', iconName: 'AlertOctagon' }
    ],
    sharedFiles: [],
    messages: [
      {
        id: 'sup1',
        threadId: 'thread-support-07',
        category: 'support',
        sender: 'system',
        senderName: 'KAYAD Resolution Desk',
        text: 'Jambo James! Our support team has reviewed your escrow fee inquiry. The 1.5% commission covers full CBK Trustee vault management and NTSA TIMS ownership transfer filing.',
        timestamp: '10:10 AM',
        readStatus: 'read'
      }
    ]
  },

  // 8. SYSTEM ACTIONABLE NOTIFICATION
  {
    id: 'thread-notif-08',
    category: 'notification',
    referenceNumber: 'SYS-2026-00808',
    transactionType: 'System Actionable Notification',
    currentStatus: 'Action Required',
    currentStage: 'Escrow Awaiting Confirmation',
    participantName: 'KAYAD System Engine',
    participantRole: 'Automated Platform Alert System',
    participantAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    participantStatus: 'online',
    isTyping: false,
    unreadCount: 1,
    lastMessage: 'ACTION REQUIRED: NCBA Escrow Vault #NCBA-ESC-88201 is awaiting your digital signature to proceed with TIMS transfer.',
    lastTimestamp: '11:25 AM',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 6850000,
    counterpartyInfo: {
      name: 'KAYAD System Engine',
      role: 'Automated Notification Daemon',
      maskedPhone: 'N/A',
      rating: 5.0,
      trustScore: 100,
      verifiedSince: '2023',
      location: 'System Core',
      county: 'Nairobi'
    },
    participants: [
      { id: 'p1', name: 'System Daemon', role: 'Platform Automated Alerts', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200', onlineStatus: 'online' }
    ],
    timeline: [
      { id: 'tl1', title: 'Notification Issued', description: 'Actionable escrow confirmation prompt sent', timestamp: 'Today, 11:25 AM', status: 'current', actor: 'System' }
    ],
    smartActions: [
      { id: 'sa1', label: 'Confirm Escrow', actionKey: 'confirm_escrow', variant: 'accent', iconName: 'ShieldCheck' }
    ],
    sharedFiles: [],
    messages: [
      {
        id: 'nm1',
        threadId: 'thread-notif-08',
        category: 'notification',
        sender: 'system',
        senderName: 'KAYAD Alerts',
        text: 'ACTION REQUIRED: NCBA Escrow Vault #NCBA-ESC-88201 is awaiting your digital signature to proceed with TIMS transfer.',
        timestamp: '11:25 AM',
        readStatus: 'delivered'
      }
    ]
  }
];
