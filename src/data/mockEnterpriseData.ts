export interface DealerRecord {
  id: string;
  name: string;
  county: string;
  location: string;
  inventoryCount: number;
  totalSalesVolume: number;
  trustScore: number;
  kycStatus: 'Verified' | 'Pending Audit' | 'Under Review' | 'Suspended';
  licenseNo: string;
  primaryContact: string;
  maskedPhone: string;
  unmaskedPhone: string;
}

export interface PrivateSellerRecord {
  id: string;
  name: string;
  nationalIdMasked: string;
  nationalIdUnmasked: string;
  county: string;
  activeListings: number;
  soldCount: number;
  escrowRating: number;
  timsStatus: 'TIMS Verified' | 'Logbook Pending' | 'Flagged';
  joinedDate: string;
}

export interface MechanicRecord {
  id: string;
  name: string;
  station: string;
  county: string;
  certifiedJobs: number;
  passRatio: number;
  rating: number;
  certificationLevel: 'Senior Master Engineer' | 'Certified Technician' | 'Junior Auditor';
  status: 'Active' | 'On Duty' | 'Offline';
}

export interface BankPartnerRecord {
  id: string;
  name: string;
  code: string;
  activePortfolio: number;
  underwritingSlaHours: number;
  approvalRate: number;
  totalDisbursed: number;
  apiStatus: 'Operational' | 'Degraded' | 'Offline';
}

export interface EscrowTxnRecord {
  id: string;
  vaultId: string;
  vehicleTitle: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  status: 'Funded in Vault' | 'Inspection Release Pending' | 'Completed' | 'Disputed' | 'Refunded';
  bankVault: 'NCBA Trustee Bank' | 'Standard Chartered Escrow';
  lockedTimestamp: string;
  inspectionPassed: boolean;
}

export interface AuctionRecord {
  id: string;
  title: string;
  sellerName: string;
  currentBid: number;
  reservePrice: number;
  bidsCount: number;
  timeLeft: string;
  status: 'Live Active' | 'Reserve Met' | 'Closed Sold' | 'Cancelled';
  highBidder: string;
}

export interface InspectionRecord {
  id: string;
  vehicleTitle: string;
  inspectorName: string;
  station: string;
  score: number;
  chassisStatus: 'Pass' | 'Minor Issue' | 'Failed structural';
  obdStatus: 'Clear' | 'DTC Codes Found';
  date: string;
  status: 'Passed & Certified' | 'Failed Re-audit' | 'Pending Upload';
}

export interface DisputeRecord {
  id: string;
  caseRef: string;
  vehicleTitle: string;
  complainant: string;
  respondent: string;
  claimAmount: number;
  reason: 'Undisclosed Panel Damage' | 'Odometer Discrepancy' | 'Logbook Transfer Delay' | 'Mechanical Engine Fault';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Under Investigation' | 'Arbitration Pending' | 'Resolved Escrow Released' | 'Resolved Escrow Refunded';
}

export interface FraudFlagRecord {
  id: string;
  riskScore: number;
  entityName: string;
  entityType: 'Listing' | 'Seller Account' | 'Bid Pattern' | 'Logbook File';
  triggerReason: 'Duplicate Chassis VIN in Database' | 'NTSA TIMS Name Mismatch' | 'Suspicious Rapid Bidding IP' | 'Cloned Document Upload';
  timestamp: string;
  status: 'Quarantined' | 'Investigating' | 'Cleared False Positive';
}

export interface SupportTicketRecord {
  id: string;
  ticketNo: string;
  userEmail: string;
  subject: string;
  category: 'Escrow Payment' | 'Inspection Dispute' | 'Dealer Onboarding' | 'NTSA Logbook Transfer';
  priority: 'Urgent' | 'High' | 'Normal';
  status: 'Open' | 'In Progress' | 'Escalated' | 'Resolved';
  assignedAgent: string;
}

export interface AuditLogRecord {
  id: string;
  adminUser: string;
  role: string;
  action: string;
  module: string;
  targetId: string;
  ipAddress: string;
  timestamp: string;
  integrityHash: string;
}

export interface ApiEndpointRecord {
  id: string;
  service: string;
  endpoint: string;
  latencyMs: number;
  uptime90d: number;
  status: 'Operational' | 'Warning' | 'Down';
  errorRate: number;
}

// Mock initial data sets
export classNameMockEnterpriseData {
  static dealers: DealerRecord[] = [
    {
      id: 'D-01',
      name: 'Crown Motors Kenya',
      county: 'Nairobi',
      location: 'Waiyaki Way, Westlands',
      inventoryCount: 42,
      totalSalesVolume: 285000000,
      trustScore: 99.4,
      kycStatus: 'Verified',
      licenseNo: 'KAYAD-DLR-2024-001',
      primaryContact: 'David Karanja',
      maskedPhone: '+254 712 *** 890',
      unmaskedPhone: '+254 712 345 890'
    },
    {
      id: 'D-02',
      name: 'Simons Auto Selection',
      county: 'Mombasa',
      location: 'Nyali Link Road',
      inventoryCount: 28,
      totalSalesVolume: 164000000,
      trustScore: 97.2,
      kycStatus: 'Verified',
      licenseNo: 'KAYAD-DLR-2024-042',
      primaryContact: 'Simon Mwendwa',
      maskedPhone: '+254 733 *** 112',
      unmaskedPhone: '+254 733 890 112'
    },
    {
      id: 'D-03',
      name: 'Rift Valley Motor Hub',
      county: 'Nakuru',
      location: 'Kenyatta Avenue',
      inventoryCount: 19,
      totalSalesVolume: 92000000,
      trustScore: 94.8,
      kycStatus: 'Pending Audit',
      licenseNo: 'KAYAD-DLR-2025-089',
      primaryContact: 'Grace Chebet',
      maskedPhone: '+254 722 *** 554',
      unmaskedPhone: '+254 722 678 554'
    },
    {
      id: 'D-04',
      name: 'Mt. Kenya Motors Exporters',
      county: 'Nyeri',
      location: 'Kimathi Way',
      inventoryCount: 12,
      totalSalesVolume: 54000000,
      trustScore: 89.1,
      kycStatus: 'Under Review',
      licenseNo: 'KAYAD-DLR-2025-112',
      primaryContact: 'Peter Nderitu',
      maskedPhone: '+254 701 *** 993',
      unmaskedPhone: '+254 701 443 993'
    }
  ];

  static privateSellers: PrivateSellerRecord[] = [
    {
      id: 'PS-881',
      name: 'James Mwangi',
      nationalIdMasked: '29******41',
      nationalIdUnmasked: '294829141',
      county: 'Nairobi',
      activeListings: 2,
      soldCount: 4,
      escrowRating: 5.0,
      timsStatus: 'TIMS Verified',
      joinedDate: '2024-03-15'
    },
    {
      id: 'PS-904',
      name: 'Amina Otieno',
      nationalIdMasked: '31******88',
      nationalIdUnmasked: '319048388',
      county: 'Kisumu',
      activeListings: 1,
      soldCount: 1,
      escrowRating: 4.8,
      timsStatus: 'TIMS Verified',
      joinedDate: '2025-01-10'
    },
    {
      id: 'PS-992',
      name: 'Brian Kiptoo',
      nationalIdMasked: '33******02',
      nationalIdUnmasked: '334910302',
      county: 'Uasin Gishu',
      activeListings: 1,
      soldCount: 0,
      escrowRating: 4.2,
      timsStatus: 'Logbook Pending',
      joinedDate: '2026-05-20'
    }
  ];

  static mechanics: MechanicRecord[] = [
    {
      id: 'MCH-01',
      name: 'Eng. Joseph Mutua',
      station: 'AutoCheck Westlands Flagship',
      county: 'Nairobi',
      certifiedJobs: 342,
      passRatio: 92.4,
      rating: 4.9,
      certificationLevel: 'Senior Master Engineer',
      status: 'On Duty'
    },
    {
      id: 'MCH-02',
      name: 'Eng. Sarah Hassan',
      station: 'MaxDrive Coast Hub',
      county: 'Mombasa',
      certifiedJobs: 218,
      passRatio: 89.5,
      rating: 4.8,
      certificationLevel: 'Senior Master Engineer',
      status: 'Active'
    },
    {
      id: 'MCH-03',
      name: 'Tech John Kamau',
      station: 'Rift Automotive Diagnostics',
      county: 'Nakuru',
      certifiedJobs: 145,
      passRatio: 94.0,
      rating: 4.7,
      certificationLevel: 'Certified Technician',
      status: 'Active'
    }
  ];

  static bankPartners: BankPartnerRecord[] = [
    {
      id: 'BNK-01',
      name: 'NCBA Bank Kenya',
      code: 'NCBA-KE',
      activePortfolio: 1420000000,
      underwritingSlaHours: 4,
      approvalRate: 78.5,
      totalDisbursed: 3200000000,
      apiStatus: 'Operational'
    },
    {
      id: 'BNK-02',
      name: 'Stanbic Bank',
      code: 'STANBIC-KE',
      activePortfolio: 890000000,
      underwritingSlaHours: 6,
      approvalRate: 74.2,
      totalDisbursed: 1850000000,
      apiStatus: 'Operational'
    },
    {
      id: 'BNK-03',
      name: 'Equity Bank Asset Finance',
      code: 'EQUITY-AF',
      activePortfolio: 650000000,
      underwritingSlaHours: 12,
      approvalRate: 82.0,
      totalDisbursed: 1200000000,
      apiStatus: 'Operational'
    }
  ];

  static escrowTxns: EscrowTxnRecord[] = [
    {
      id: 'ESC-901-KE',
      vaultId: 'NCBA-ESC-88201',
      vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
      buyerName: 'James Mwangi',
      sellerName: 'Crown Motors Kenya',
      amount: 6850000,
      status: 'Funded in Vault',
      bankVault: 'NCBA Trustee Bank',
      lockedTimestamp: '2026-07-29 11:20 AM',
      inspectionPassed: true
    },
    {
      id: 'ESC-894-KE',
      vaultId: 'SC-ESC-44109',
      vehicleTitle: '2020 Subaru Forester 2.0i-L EyeSight',
      buyerName: 'Dr. Kevin Ochieng',
      sellerName: 'Simons Auto Selection',
      amount: 3200000,
      status: 'Inspection Release Pending',
      bankVault: 'Standard Chartered Escrow',
      lockedTimestamp: '2026-07-28 04:15 PM',
      inspectionPassed: true
    },
    {
      id: 'ESC-870-KE',
      vaultId: 'NCBA-ESC-11902',
      vehicleTitle: '2019 Isuzu D-Max Double Cab 4x4',
      buyerName: 'Samuel Wanjiku',
      sellerName: 'Rift Valley Motor Hub',
      amount: 4100000,
      status: 'Completed',
      bankVault: 'NCBA Trustee Bank',
      lockedTimestamp: '2026-07-25 09:30 AM',
      inspectionPassed: true
    }
  ];

  static auctions: AuctionRecord[] = [
    {
      id: 'AUC-101',
      title: '2018 Mercedes-Benz C200 AMG Line',
      sellerName: 'Crown Motors Kenya',
      currentBid: 4150000,
      reservePrice: 4000000,
      bidsCount: 14,
      timeLeft: '01h 45m',
      status: 'Reserve Met',
      highBidder: 'Bidder #KE-8819'
    },
    {
      id: 'AUC-102',
      title: '2021 BMW X5 xDrive30d M-Sport',
      sellerName: 'Simons Auto Selection',
      currentBid: 9800000,
      reservePrice: 10500000,
      bidsCount: 22,
      timeLeft: '04h 12m',
      status: 'Live Active',
      highBidder: 'Bidder #KE-4102'
    }
  ];

  static inspections: InspectionRecord[] = [
    {
      id: 'INS-2026-8801',
      vehicleTitle: 'Toyota Land Cruiser Prado TX-L 2.8L',
      inspectorName: 'Eng. Joseph Mutua',
      station: 'AutoCheck Westlands',
      score: 94,
      chassisStatus: 'Pass',
      obdStatus: 'Clear',
      date: '2026-07-28',
      status: 'Passed & Certified'
    },
    {
      id: 'INS-2026-8802',
      vehicleTitle: '2019 Isuzu D-Max Double Cab 4x4',
      inspectorName: 'Eng. Sarah Hassan',
      station: 'MaxDrive Coast',
      score: 88,
      chassisStatus: 'Pass',
      obdStatus: 'DTC Codes Found',
      date: '2026-07-27',
      status: 'Passed & Certified'
    }
  ];

  static disputes: DisputeRecord[] = [
    {
      id: 'DSP-004',
      caseRef: 'KAYAD-DSP-2026-04',
      vehicleTitle: '2018 Nissan X-Trail 2.0L 4WD',
      complainant: 'Mark Cheruiyot (Buyer)',
      respondent: 'Nairobi Prime Motors (Dealer)',
      claimAmount: 250000,
      reason: 'Undisclosed Panel Damage',
      severity: 'Medium',
      status: 'Arbitration Pending'
    },
    {
      id: 'DSP-001',
      caseRef: 'KAYAD-DSP-2026-01',
      vehicleTitle: '2017 Land Rover Discovery Sport',
      complainant: 'Dr. Faith Njeri (Buyer)',
      respondent: 'Acuity Autos (Private Seller)',
      claimAmount: 480000,
      reason: 'Odometer Discrepancy',
      severity: 'High',
      status: 'Under Investigation'
    }
  ];

  static fraudFlags: FraudFlagRecord[] = [
    {
      id: 'FRD-991',
      riskScore: 96,
      entityName: 'NTSA TIMS Logbook Scan (KDA 481P)',
      entityType: 'Logbook File',
      triggerReason: 'Cloned Document Upload',
      timestamp: 'Today 10:14 AM',
      status: 'Quarantined'
    },
    {
      id: 'FRD-984',
      riskScore: 89,
      entityName: 'Seller Account #PS-992 (Brian Kiptoo)',
      entityType: 'Seller Account',
      triggerReason: 'NTSA TIMS Name Mismatch',
      timestamp: 'Yesterday 06:40 PM',
      status: 'Investigating'
    }
  ];

  static supportTickets: SupportTicketRecord[] = [
    {
      id: 'TCK-551',
      ticketNo: 'TICK-8801',
      userEmail: 'jimmymugo00@gmail.com',
      subject: 'Inquiry regarding NCBA Escrow release authorization code',
      category: 'Escrow Payment',
      priority: 'Urgent',
      status: 'In Progress',
      assignedAgent: 'Escrow Ops Lead (Clara)'
    },
    {
      id: 'TCK-549',
      ticketNo: 'TICK-8798',
      userEmail: 'karanja@crownmotors.co.ke',
      subject: 'Bulk API integration setup for Waiyaki Way inventory feed',
      category: 'Dealer Onboarding',
      priority: 'Normal',
      status: 'Open',
      assignedAgent: 'Tech Partner Support'
    }
  ];

  static auditLogs: AuditLogRecord[] = [
    {
      id: 'AUD-9001',
      adminUser: 'Chief Product Officer (You)',
      role: 'Super Admin',
      action: 'OVERRIDE_CERTIFICATION',
      module: 'Inspection Oversight',
      targetId: 'v1 (Toyota Prado)',
      ipAddress: '197.237.114.42',
      timestamp: '2026-07-29 13:42:01',
      integrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    {
      id: 'AUD-9000',
      adminUser: 'Compliance Officer (Sarah)',
      role: 'Compliance Auditor',
      action: 'QUARANTINE_SELLER',
      module: 'Fraud Detection',
      targetId: 'FRD-991',
      ipAddress: '197.237.100.18',
      timestamp: '2026-07-29 12:15:44',
      integrityHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4'
    },
    {
      id: 'AUD-8999',
      adminUser: 'Escrow Custodian (Daniel)',
      role: 'Escrow Custodian',
      action: 'LOCK_VAULT_FUNDS',
      module: 'Escrow Monitoring',
      targetId: 'ESC-901-KE',
      ipAddress: '10.244.12.89',
      timestamp: '2026-07-29 11:20:00',
      integrityHash: '7d793037a0760186574b0282f2f435e768c6a0ff46249e0004ff2b97950c0584'
    }
  ];

  static apiEndpoints: ApiEndpointRecord[] = [
    {
      id: 'API-01',
      service: 'NTSA TIMS Registry Gateway',
      endpoint: 'https://api.tims.ntsa.go.ke/v2/logbook/verify',
      latencyMs: 142,
      uptime90d: 99.95,
      status: 'Operational',
      errorRate: 0.02
    },
    {
      id: 'API-02',
      service: 'CBK Escrow Vault Webhook',
      endpoint: 'https://escrow-vault.ncbagroup.com/api/v1/notify',
      latencyMs: 88,
      uptime90d: 99.99,
      status: 'Operational',
      errorRate: 0.00
    },
    {
      id: 'API-03',
      service: 'Gemini 2.5 Technical Inspection AI',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash',
      latencyMs: 310,
      uptime90d: 99.92,
      status: 'Operational',
      errorRate: 0.05
    },
    {
      id: 'API-04',
      service: 'M-Pesa Express B2C Settlement',
      endpoint: 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
      latencyMs: 540,
      uptime90d: 99.85,
      status: 'Operational',
      errorRate: 0.12
    }
  ];
}
