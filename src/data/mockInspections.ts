import { Mechanic, InspectionReport, InspectionBooking, InspectionPayment, InspectionRating } from '../types';

export const INITIAL_MECHANICS: Mechanic[] = [
  {
    id: 'mech-1',
    name: 'Eng. David Kamau',
    companyName: 'Kamau Diagnostic & Automotive Lab',
    title: 'Master SAE & NTSA Certified Technical Inspector',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300',
    counties: ['Nairobi', 'Kiambu', 'Kajiado', 'Machakos'],
    rating: 4.95,
    reviewsCount: 184,
    inspectionsCompleted: 412,
    baseFee: 12000,
    specializations: ['Toyota 4x4 / Prado / LC', 'Subaru AWD', 'Diesel Turbo Systems', 'Hybrid Diagnostics'],
    certifications: ['NTSA Master Inspector Class A', 'ASE Certified Master Auto Technician', 'Bosch Automotive Diagnostics Specialist'],
    yearsExperience: 16,
    bio: 'Over 16 years of hands-on automotive engineering experience in East Africa. Specialized in 150-point pre-purchase technical audits, OBD-II ECU telemetry, and logbook VIN chassis validation.',
    phone: '+254 712 345 678',
    email: 'd.kamau@kamautestlab.co.ke',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    verified: true
  },
  {
    id: 'mech-2',
    name: 'Sarah Ochieng',
    companyName: 'Coastal Precision Auto Diagnostics',
    title: 'Senior Marine & Automotive Quality Auditor',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    counties: ['Mombasa', 'Kilifi', 'Kwale'],
    rating: 4.90,
    reviewsCount: 126,
    inspectionsCompleted: 298,
    baseFee: 10000,
    specializations: ['Direct Foreign Import Audit', 'Saltwater Corrosion Analysis', 'German Luxury (Merc / BMW / Audi)'],
    certifications: ['Mombasa Port Technical Clearance Cert', 'KRA Duty & VIN Verifier', 'ISO 9001 Quality Auditor'],
    yearsExperience: 12,
    bio: 'Stationed at Mombasa Port Yard and Nyali inspection hub. Expert in verifying imported vehicle auction sheets, body frame alignment, and salt-air rust prevention status.',
    phone: '+254 722 889 011',
    email: 'sochieng@coastalauto.co.ke',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    verified: true
  },
  {
    id: 'mech-3',
    name: 'Eng. Patrick Kipchumba',
    companyName: 'Rift Valley Heavy Duty & Fleet Testing',
    title: 'Fleet & Agricultural Vehicle Diagnostics Engineer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    counties: ['Nakuru', 'Eldoret', 'Uasin Gishu', 'Kericho'],
    rating: 4.88,
    reviewsCount: 94,
    inspectionsCompleted: 215,
    baseFee: 11000,
    specializations: ['Commercial Pickups & Vans', 'Rough-Road Suspension', 'Transmission Dyno Testing'],
    certifications: ['Rift Motor Engineers Guild President', 'NTSA Commercial Vehicle Inspector'],
    yearsExperience: 14,
    bio: 'Serving Nakuru, Eldoret, and western region vehicle buyers. Focused on suspension stress tests, gear wear, engine compression, and off-road chassis endurance.',
    phone: '+254 733 445 566',
    email: 'p.kipchumba@riftfleet.co.ke',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    verified: true
  },
  {
    id: 'mech-4',
    name: 'Alex Mutua',
    companyName: 'Metro High-Tech ECU Diagnostics',
    title: 'Electrical & Powertrain Systems Specialist',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    counties: ['Nairobi', 'Kiambu', 'Kisumu'],
    rating: 4.92,
    reviewsCount: 110,
    inspectionsCompleted: 260,
    baseFee: 11500,
    specializations: ['EV & Hybrid High-Voltage Battery Testing', 'German Electronics', 'ECU Flash & Remap Checks'],
    certifications: ['EV Master Battery Technician', 'Bosch Electronic Systems Specialist'],
    yearsExperience: 10,
    bio: 'Specialist in modern ECU diagnostics, sensor recalibration, hybrid battery health checks (SOH analysis), and high-end luxury vehicle electronics.',
    phone: '+254 701 998 877',
    email: 'amutua@metroecu.co.ke',
    availableDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    verified: true
  }
];

export const INITIAL_INSPECTION_REPORTS: InspectionReport[] = [
  {
    id: 'REP-2026-701',
    bookingId: 'INSP-2026-9001',
    vehicleId: 'v1',
    vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleLocation: 'Westlands, Nairobi',
    mechanicId: 'mech-1',
    mechanicName: 'Eng. David Kamau',
    mechanicCompany: 'Kamau Diagnostic & Automotive Lab',
    overallScore: 96,
    verdict: 'Passed (Clean Certification)',
    vinVerified: true,
    chassisVerified: true,
    logbookOwnerMatch: true,
    inspectionDate: '2026-07-28',
    categoryScores: {
      engineAndDrivetrain: { score: 98, status: 'Pass', notes: 'Compression uniform across all 4 cylinders. Zero oil blow-by or turbo play.' },
      transmissionAndClutch: { score: 96, status: 'Pass', notes: '6-speed automatic shifts smoothly under load. Fluid clean and free of metal shavings.' },
      suspensionAndSteering: { score: 94, status: 'Pass', notes: 'KDSS hydraulic suspension pressure optimal. Bushings in excellent condition.' },
      brakesAndTires: { score: 95, status: 'Pass', notes: 'Brake pads at 82% life. Yokohama Geolandar tires have 6.8mm tread remaining.' },
      electricalAndDiagnostics: { score: 98, status: 'Pass', notes: 'Zero diagnostic trouble codes in ECU. Battery state of health at 94%.' },
      bodyworkAndChassisFrame: { score: 95, status: 'Pass', notes: 'Paint thickness uniform (110-120 microns). No structural frame repairs detected.' },
      interiorAndHVAC: { score: 96, status: 'Pass', notes: 'Leather in pristine condition. Dual-zone climate control cools to 4.2°C.' }
    },
    obdDiagnosticCodes: ['No DTCs Found', 'ECU Telemetry Verified OK', 'Airbag Control Module Clean'],
    inspectorSummary: 'Exceptional foreign-used Toyota Prado in original factory specification. Complete maintenance history verified. Vehicle is 100% roadworthy and certified for immediate ownership transfer.',
    reportPdfUrl: 'https://kayad.co.ke/reports/REP-2026-701.pdf',
    photos: [
      'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'
    ]
  },
  {
    id: 'REP-2026-702',
    bookingId: 'INSP-2026-9002',
    vehicleId: 'v3',
    vehicleTitle: '2020 Mazda CX-5 2.2d L Package AWD',
    vehicleLocation: 'Thika Road, Kiambu',
    mechanicId: 'mech-4',
    mechanicName: 'Alex Mutua',
    mechanicCompany: 'Metro High-Tech ECU Diagnostics',
    overallScore: 88,
    verdict: 'Minor Issues Noted',
    vinVerified: true,
    chassisVerified: true,
    logbookOwnerMatch: true,
    inspectionDate: '2026-07-26',
    categoryScores: {
      engineAndDrivetrain: { score: 90, status: 'Pass', notes: 'SkyActiv-D 2.2L diesel runs quiet. Injectors balanced within +-0.4ms.' },
      transmissionAndClutch: { score: 92, status: 'Pass', notes: 'AWD transfer case fluid clean. Gear engagement smooth.' },
      suspensionAndSteering: { score: 82, status: 'Attention', notes: 'Front left stabilizer link bushing shows mild wear. Replacement recommended in 5,000km.' },
      brakesAndTires: { score: 85, status: 'Attention', notes: 'Rear brake pads at 35% remaining. Front pads clean.' },
      electricalAndDiagnostics: { score: 94, status: 'Pass', notes: 'Smart City Brake Support sensors tested and functional.' },
      bodyworkAndChassisFrame: { score: 90, status: 'Pass', notes: 'Minor bumper scuff touched up. Chassis rails untouched.' },
      interiorAndHVAC: { score: 91, status: 'Pass', notes: 'Bose 10-speaker sound system and heads-up display fully operational.' }
    },
    obdDiagnosticCodes: ['P0420 (Historical - Cleared)', 'DPF Regeneration Cycle OK'],
    inspectorSummary: 'Overall solid Mazda CX-5. Engine and AWD drivetrain in great condition. Minor wear on front stabilizer link and rear brake pads noted in estimate.',
    reportPdfUrl: 'https://kayad.co.ke/reports/REP-2026-702.pdf',
    photos: [
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800'
    ]
  },
  {
    id: 'REP-2026-703',
    bookingId: 'INSP-2026-9003',
    vehicleId: 'v6',
    vehicleTitle: '2018 Mercedes-Benz E250 AMG Line 2.0L',
    vehicleLocation: 'Nyali, Mombasa',
    mechanicId: 'mech-2',
    mechanicName: 'Sarah Ochieng',
    mechanicCompany: 'Coastal Precision Auto Diagnostics',
    overallScore: 94,
    verdict: 'Passed (Clean Certification)',
    vinVerified: true,
    chassisVerified: true,
    logbookOwnerMatch: true,
    inspectionDate: '2026-07-27',
    categoryScores: {
      engineAndDrivetrain: { score: 95, status: 'Pass', notes: 'M274 2.0L Turbo engine clean. Chain tensioner and cam phasers verified.' },
      transmissionAndClutch: { score: 96, status: 'Pass', notes: '9G-Tronic transmission shifts flawlessly.' },
      suspensionAndSteering: { score: 92, status: 'Pass', notes: 'Agility Control suspension tight. Salt air protection undercoating verified.' },
      brakesAndTires: { score: 94, status: 'Pass', notes: 'Perforated AMG front discs at 85% thickness.' },
      electricalAndDiagnostics: { score: 96, status: 'Pass', notes: 'Widescreen cockpit display, ambient lighting, and DISTRONIC Plus functional.' },
      bodyworkAndChassisFrame: { score: 93, status: 'Pass', notes: 'Factory AMG bodykit intact. Paint micron thickness standard.' },
      interiorAndHVAC: { score: 95, status: 'Pass', notes: 'Nappa leather trim clean. Air balance fragrance system active.' }
    },
    obdDiagnosticCodes: ['No DTCs Found', 'SAM Module Passed'],
    inspectorSummary: 'High-grade AMG Line E250 sedan in Mombasa. Rust-free chassis with underbody sealant. Excellent luxury purchase.',
    reportPdfUrl: 'https://kayad.co.ke/reports/REP-2026-703.pdf',
    photos: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800'
    ]
  }
];

export const INITIAL_INSPECTION_BOOKINGS: InspectionBooking[] = [
  {
    id: 'INSP-2026-9001',
    vehicleId: 'v1',
    vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L 2.8L',
    vehicleLocation: 'Westlands, Nairobi',
    buyerName: 'James Mwangi',
    buyerPhone: '+254 722 100 200',
    buyerEmail: 'j.mwangi@gmail.com',
    mechanicId: 'mech-1',
    mechanicName: 'Eng. David Kamau',
    scheduledDate: '2026-07-28',
    scheduledTime: '10:00 AM',
    packageType: '150-Point Comprehensive',
    totalFee: 12000,
    platformCommission: 1800, // 15%
    netMechanicFee: 10200,   // 85%
    status: 'Completed',
    paymentStatus: 'Released to Mechanic',
    reportId: 'REP-2026-701',
    createdAt: '2026-07-27'
  },
  {
    id: 'INSP-2026-9002',
    vehicleId: 'v3',
    vehicleTitle: '2020 Mazda CX-5 2.2d L Package AWD',
    vehicleLocation: 'Thika Road, Kiambu',
    buyerName: 'Mercy Njeri',
    buyerPhone: '+254 733 998 112',
    buyerEmail: 'mercy.njeri@outlook.com',
    mechanicId: 'mech-4',
    mechanicName: 'Alex Mutua',
    scheduledDate: '2026-07-26',
    scheduledTime: '02:30 PM',
    packageType: '150-Point Comprehensive',
    totalFee: 11500,
    platformCommission: 1725,
    netMechanicFee: 9775,
    status: 'Completed',
    paymentStatus: 'Released to Mechanic',
    reportId: 'REP-2026-702',
    createdAt: '2026-07-25'
  },
  {
    id: 'INSP-2026-9004',
    vehicleId: 'v2',
    vehicleTitle: '2019 Subaru Outback 2.5i EyeSight Limited',
    vehicleLocation: 'Nyali, Mombasa',
    buyerName: 'Dr. Amina S.',
    buyerPhone: '+254 711 554 332',
    buyerEmail: 'dramina@healthnet.or.ke',
    mechanicId: 'mech-2',
    mechanicName: 'Sarah Ochieng',
    scheduledDate: '2026-07-30',
    scheduledTime: '11:00 AM',
    packageType: 'VIP Import Audit',
    totalFee: 15000,
    platformCommission: 2250,
    netMechanicFee: 12750,
    status: 'Scheduled',
    paymentStatus: 'Escrow Held',
    createdAt: '2026-07-28'
  }
];

export const INITIAL_INSPECTION_PAYMENTS: InspectionPayment[] = [
  {
    id: 'PAY-2026-8001',
    bookingId: 'INSP-2026-9001',
    mechanicId: 'mech-1',
    mechanicName: 'Eng. David Kamau',
    buyerName: 'James Mwangi',
    vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L 2.8L',
    grossAmount: 12000,
    kayadCommission: 1800,
    mechanicPayout: 10200,
    status: 'Released',
    payoutRef: 'MPESA-Q7812901-RELEASED',
    timestamp: '2026-07-28 14:15'
  },
  {
    id: 'PAY-2026-8002',
    bookingId: 'INSP-2026-9002',
    mechanicId: 'mech-4',
    mechanicName: 'Alex Mutua',
    buyerName: 'Mercy Njeri',
    vehicleTitle: '2020 Mazda CX-5 2.2d L Package AWD',
    grossAmount: 11500,
    kayadCommission: 1725,
    mechanicPayout: 9775,
    status: 'Released',
    payoutRef: 'MPESA-Q7811099-RELEASED',
    timestamp: '2026-07-26 16:40'
  },
  {
    id: 'PAY-2026-8004',
    bookingId: 'INSP-2026-9004',
    mechanicId: 'mech-2',
    mechanicName: 'Sarah Ochieng',
    buyerName: 'Dr. Amina S.',
    vehicleTitle: '2019 Subaru Outback 2.5i EyeSight Limited',
    grossAmount: 15000,
    kayadCommission: 2250,
    mechanicPayout: 12750,
    status: 'Held in Escrow',
    payoutRef: 'ESCROW-LOCK-2026-8004',
    timestamp: '2026-07-28 09:10'
  }
];

export const INITIAL_INSPECTION_RATINGS: InspectionRating[] = [
  {
    id: 'rate-1',
    mechanicId: 'mech-1',
    bookingId: 'INSP-2026-9001',
    buyerName: 'James Mwangi',
    rating: 5,
    comment: 'Eng. Kamau arrived on time at the seller yard in Westlands. He checked every single item from the OBD scanner to compression test. Saved me from buying a masked defect vehicle before!',
    date: '2026-07-28'
  },
  {
    id: 'rate-2',
    mechanicId: 'mech-2',
    bookingId: 'INSP-2026-9003',
    buyerName: 'Dr. Amina S.',
    rating: 5,
    comment: 'Sarah checked the Mercedes at Mombasa Port. Highly professional and verified the KRA clearance paper as well. Worth every shilling!',
    date: '2026-07-27'
  },
  {
    id: 'rate-3',
    mechanicId: 'mech-4',
    bookingId: 'INSP-2026-9002',
    buyerName: 'Mercy Njeri',
    rating: 5,
    comment: 'Alex did a thorough OBD scan on my CX-5. Pointed out rear brake pads and front stabilizer link. Very clear report and fast delivery.',
    date: '2026-07-26'
  }
];
