import { UnifiedChatThread } from '../types';

export const MOCK_UNIFIED_THREADS: UnifiedChatThread[] = [
  {
    id: 'thread-msg-01',
    category: 'messages',
    participantName: 'Crown Motors Kenya',
    participantRole: 'Verified Dealer (Waiyaki Way, Nairobi)',
    participantAvatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    unreadCount: 0,
    lastMessage: 'Appointment confirmed for test drive tomorrow at 10:00 AM at Westlands Showroom.',
    lastTimestamp: '10:45 AM',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 6850000,
    messages: [
      {
        id: 'm1',
        threadId: 'thread-msg-01',
        category: 'messages',
        sender: 'seller',
        senderName: 'Crown Motors Kenya',
        senderAvatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200',
        text: 'Jambo! The 2021 Toyota Land Cruiser Prado TX-L is available for physical inspection at our Westlands showroom. Would you like us to share our GPS location or schedule a test drive?',
        timestamp: '09:30 AM',
        readStatus: 'read',
        vehicleId: 'v1',
        vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
        vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
        vehiclePrice: 6850000,
        attachments: [
          {
            type: 'location',
            locationName: 'Crown Motors Westlands Flagship Yard',
            locationAddress: 'Plot 42, Waiyaki Way, Westlands, Nairobi',
            lat: -1.2676,
            lng: 36.8052
          }
        ]
      },
      {
        id: 'm2',
        threadId: 'thread-msg-01',
        category: 'messages',
        sender: 'user',
        senderName: 'James Mwangi',
        text: 'Yes please! Can I also see the 150-Point KAYAD Inspection report and original NTSA TIMS logbook copy before coming?',
        timestamp: '09:35 AM',
        readStatus: 'read'
      },
      {
        id: 'm3',
        threadId: 'thread-msg-01',
        category: 'messages',
        sender: 'seller',
        senderName: 'Crown Motors Kenya',
        senderAvatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200',
        text: 'Here is the official 150-Point Audit PDF and NTSA TIMS logbook verification certificate attached below. Everything is 100% clean and escrow ready.',
        timestamp: '09:40 AM',
        readStatus: 'read',
        attachments: [
          {
            type: 'document',
            fileName: 'KAYAD_150Pt_Audit_Prado_KDF892X.pdf',
            fileSize: '3.4 MB',
            url: '#'
          },
          {
            type: 'image',
            url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
            fileName: 'Prado_Engine_Bay_CloseUp.jpg'
          }
        ]
      },
      {
        id: 'm4',
        threadId: 'thread-msg-01',
        category: 'messages',
        sender: 'seller',
        senderName: 'Crown Motors Kenya',
        text: 'I have scheduled your test drive appointment for tomorrow. Please confirm if 10:00 AM works for you.',
        timestamp: '10:45 AM',
        readStatus: 'read',
        attachments: [
          {
            type: 'appointment',
            appointmentTitle: 'VIP Test Drive & Logbook Verification',
            appointmentDate: '2026-07-30',
            appointmentTime: '10:00 AM',
            appointmentLocation: 'Waiyaki Way Showroom, Nairobi',
            appointmentStatus: 'Confirmed'
          }
        ]
      }
    ]
  },

  {
    id: 'thread-escrow-02',
    category: 'escrow',
    participantName: 'NCBA Trustee Bank Custodian',
    participantRole: 'KAYAD Licensed Escrow Vault Manager',
    participantAvatar: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    unreadCount: 1,
    lastMessage: 'Escrow Vault Status: Ksh 6,850,000 received in Vault #NCBA-ESC-88201. Awaiting buyer final delivery approval.',
    lastTimestamp: '11:20 AM',
    escrowId: 'ESC-901-KE',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 6850000,
    messages: [
      {
        id: 'esc-m1',
        threadId: 'thread-escrow-02',
        category: 'escrow',
        sender: 'escrow_custodian',
        senderName: 'NCBA Escrow Custodian',
        text: 'DEPOSIT CONFIRMED: Ksh 6,850,000 has been locked safely into NCBA Bank Trustee Account #NCBA-ESC-88201 under neutral escrow hold. Funds cannot be released without buyer digital approval.',
        timestamp: '11:20 AM',
        readStatus: 'delivered',
        escrowId: 'ESC-901-KE',
        vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
        attachments: [
          {
            type: 'document',
            fileName: 'NCBA_Vault_Deposit_Receipt_ESC88201.pdf',
            fileSize: '1.2 MB',
            url: '#'
          }
        ]
      }
    ]
  },

  {
    id: 'thread-auction-03',
    category: 'auctions',
    participantName: 'KAYAD Live Auction Bot',
    participantRole: 'Real-Time Bidding System',
    participantAvatar: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    unreadCount: 2,
    lastMessage: 'OUTBID ALERT: Another buyer placed a bid of Ksh 4,150,000 on 2018 Mercedes-Benz C200 AMG Line.',
    lastTimestamp: '12:05 PM',
    auctionId: 'v8',
    vehicleId: 'v8',
    vehicleTitle: '2018 Mercedes-Benz C200 AMG Line',
    vehicleImage: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 4150000,
    messages: [
      {
        id: 'auc-m1',
        threadId: 'thread-auction-03',
        category: 'auctions',
        sender: 'system',
        senderName: 'KAYAD Live Bidding',
        text: 'BID CONFIRMED: Your bid of Ksh 4,100,000 for 2018 Mercedes-Benz C200 AMG Line was placed successfully. Timer: 2 Hours Remaining.',
        timestamp: '11:00 AM',
        readStatus: 'read'
      },
      {
        id: 'auc-m2',
        threadId: 'thread-auction-03',
        category: 'auctions',
        sender: 'system',
        senderName: 'KAYAD Live Bidding',
        text: '⚠️ OUTBID WARNING: Bidder #KE-8819 just placed a higher bid of Ksh 4,150,000. Increase bid to Ksh 4,200,000 to reclaim top spot before auction closes!',
        timestamp: '12:05 PM',
        readStatus: 'delivered',
        auctionId: 'v8',
        vehicleTitle: '2018 Mercedes-Benz C200 AMG Line'
      }
    ]
  },

  {
    id: 'thread-inspection-04',
    category: 'inspections',
    participantName: 'Eng. Joseph Mutua',
    participantRole: 'Senior Automotive Inspector (AutoCheck Kenya)',
    participantAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    unreadCount: 0,
    lastMessage: 'INSPECTION REPORT READY: Overall Score 94/100 (Pass). PDF Certificate attached.',
    lastTimestamp: 'Yesterday 04:30 PM',
    inspectionId: 'INS-2026-8801',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    messages: [
      {
        id: 'ins-m1',
        threadId: 'thread-inspection-04',
        category: 'inspections',
        sender: 'inspector',
        senderName: 'Eng. Joseph Mutua',
        text: 'INSPECTION COMPLETED: Completed 150-point physical, mechanical, transmission, and diagnostic audit on Toyota Prado KDF 892X. Overall Condition Rating: 94% EXCELLENT.',
        timestamp: 'Yesterday 04:30 PM',
        readStatus: 'read',
        attachments: [
          {
            type: 'document',
            fileName: 'AutoCheck_150Point_Report_Prado_KDF892X.pdf',
            fileSize: '4.8 MB'
          },
          {
            type: 'appointment',
            appointmentTitle: 'Physical Inspection Bay Sign-Off',
            appointmentDate: '2026-07-28',
            appointmentTime: '02:00 PM',
            appointmentLocation: 'AutoCheck Bay 4, Industrial Area Nairobi',
            appointmentStatus: 'Confirmed'
          }
        ]
      }
    ]
  },

  {
    id: 'thread-finance-05',
    category: 'finance',
    participantName: 'NCBA Asset Finance Underwriter',
    participantRole: 'Senior Credit Risk Analyst',
    participantAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    unreadCount: 1,
    lastMessage: 'AUTO LOAN PRE-APPROVED: Ksh 5,200,000 sanctioned at 12.5% p.a. Download formal Letter of Commitment.',
    lastTimestamp: 'Yesterday 02:15 PM',
    loanAppRef: 'NCBA-AF-8812',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    messages: [
      {
        id: 'fin-m1',
        threadId: 'thread-finance-05',
        category: 'finance',
        sender: 'bank_officer',
        senderName: 'NCBA Underwriting Office',
        text: 'APPROVAL NOTICE: Congratulations! Your Ksh 5,200,000 financing application (Ref: NCBA-AF-8812) has been pre-approved at 12.5% p.a. for 48 months. Please upload your certified 6-month bank statement to issue formal sanction letter.',
        timestamp: 'Yesterday 02:15 PM',
        readStatus: 'delivered',
        loanAppRef: 'NCBA-AF-8812',
        attachments: [
          {
            type: 'document',
            fileName: 'NCBA_PreApproval_Sanction_Letter.pdf',
            fileSize: '890 KB'
          }
        ]
      }
    ]
  },

  {
    id: 'thread-announcement-06',
    category: 'announcements',
    participantName: 'KAYAD Legal & Trust Desk',
    participantRole: 'Official System Broadcast',
    participantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    unreadCount: 0,
    lastMessage: 'PLATFORM ADVISORY: Updated CBK Bank Escrow Protection Regulations & NTSA TIMS Joint Ownership Rules.',
    lastTimestamp: '2 Days Ago',
    messages: [
      {
        id: 'ann-m1',
        threadId: 'thread-announcement-06',
        category: 'announcements',
        sender: 'system',
        senderName: 'KAYAD Trust & Legal Desk',
        text: 'NOTICE: In accordance with Central Bank of Kenya (CBK) Trust Escrow guidelines, all buyer deposits above Ksh 1,000,000 are held in Tier-1 neutral bank custodian accounts (NCBA & Standard Chartered). Funds are only released when buyer confirms physical receipt.',
        timestamp: '2 Days Ago',
        readStatus: 'read'
      }
    ]
  },

  {
    id: 'thread-search-07',
    category: 'saved_searches',
    participantName: 'KAYAD Inventory Watcher',
    participantRole: 'Automated Saved Search Engine',
    participantAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
    participantVerified: true,
    unreadCount: 0,
    lastMessage: 'PRICE DROP ALERT: 2021 Toyota Prado TX-L dropped Ksh 200,000 to Ksh 6,850,000!',
    lastTimestamp: '3 Days Ago',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    vehiclePrice: 6850000,
    messages: [
      {
        id: 'sea-m1',
        threadId: 'thread-search-07',
        category: 'saved_searches',
        sender: 'system',
        senderName: 'Saved Search Engine',
        text: '🔥 PRICE DROP: Toyota Land Cruiser Prado TX-L 2.8L matching your saved search ("Toyota Prado 2020+ under 7M Nairobi") dropped price from Ksh 7,050,000 to Ksh 6,850,000!',
        timestamp: '3 Days Ago',
        readStatus: 'read',
        vehicleId: 'v1',
        vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
        vehicleImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
        vehiclePrice: 6850000
      }
    ]
  }
];
