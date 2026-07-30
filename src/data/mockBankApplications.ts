import { BankFinancingApplication } from '../types';

export const MOCK_BANK_APPLICATIONS: BankFinancingApplication[] = [
  {
    id: 'APP-NCBA-2026-001',
    appRef: 'NCBA-AF-8812',
    bankId: 'ncba',
    bankName: 'NCBA Drive Asset Finance',
    applicantName: 'Dr. Samuel Omondi',
    applicantPhone: '+254 722 104 902',
    applicantEmail: 'samuel.omondi@knh.or.ke',
    applicantIdNumber: '28471903',
    employmentType: 'Salaried',
    monthlyIncome: 350000,
    employerName: 'Kenyatta National Hospital (Senior Consultant)',
    existingLoansMonthly: 45000,
    vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L',
    vehiclePrice: 6500000,
    vehicleVin: 'JTEBU5JR8K5098124',
    vehicleYear: 2021,
    vehicleMileage: 41200,
    vehicleConditionScore: 94,
    dealerName: 'Nairobi Luxury Motors Ltd',
    logbookVerified: true,
    depositAmount: 1300000, // 20%
    loanAmount: 5200000,   // 80%
    tenureMonths: 48,
    interestRate: 12.5,
    monthlyInstallment: 138120,
    ltvRatio: 80,
    dtiRatio: 39,
    status: 'Under Review',
    crbScore: 'Clean (Green Tier)',
    crbScoreNumber: 785,
    assignedOfficer: 'Grace Wambui (Senior Credit Analyst)',
    submissionDate: '2026-07-28 09:30 AM',
    lastUpdated: '2026-07-29 11:15 AM',
    stipulations: [
      'Certified 6-month bank statement from KCB Bank',
      'Original NTSA Joint Logbook Transfer Authorization',
      'Comprehensive Auto Insurance Policy under NCBA Interest'
    ],
    documents: [
      { id: 'DOC-01', name: 'National ID Card (Front & Back).pdf', type: 'National ID', status: 'Verified', uploadedAt: '2026-07-28' },
      { id: 'DOC-02', name: '6-Month Bank Statement (Equity).pdf', type: 'Bank Statement', status: 'Verified', uploadedAt: '2026-07-28' },
      { id: 'DOC-03', name: 'KRA PIN Certificate.pdf', type: 'KRA PIN', status: 'Verified', uploadedAt: '2026-07-28' },
      { id: 'DOC-04', name: 'KNH Certified Payslip June 2026.pdf', type: 'Payslip', status: 'Verified', uploadedAt: '2026-07-28' },
      { id: 'DOC-05', name: 'KAYAD 150-Point Audit Certificate.pdf', type: '150-Point Inspection', status: 'Verified', uploadedAt: '2026-07-28' }
    ],
    messages: [
      {
        id: 'MSG-01',
        sender: 'KAYAD System',
        senderName: 'System',
        message: 'Financing application submitted directly to NCBA Bank via KAYAD Instant Express Portal.',
        timestamp: '2026-07-28 09:30 AM',
        type: 'Status Update'
      },
      {
        id: 'MSG-02',
        sender: 'Bank Loan Officer',
        senderName: 'Grace Wambui',
        message: 'Application received and passed initial credit scoring. Underwriting team review in progress.',
        timestamp: '2026-07-28 02:15 PM',
        type: 'Status Update'
      }
    ]
  },
  {
    id: 'APP-EQT-2026-002',
    appRef: 'EQT-AL-9043',
    bankId: 'equity',
    bankName: 'Equity Bank Vehicle Financing',
    applicantName: 'Sarah Mwangi',
    applicantPhone: '+254 718 493 201',
    applicantEmail: 'sarah.mwangi@techfirm.co.ke',
    applicantIdNumber: '31094821',
    employmentType: 'Salaried',
    monthlyIncome: 220000,
    employerName: 'Safaricom PLC (Lead DevOps)',
    existingLoansMonthly: 20000,
    vehicleTitle: '2019 Subaru Outback 2.5i Limited',
    vehiclePrice: 3200000,
    vehicleVin: '4S4BSBNC8K3210492',
    vehicleYear: 2019,
    vehicleMileage: 68000,
    vehicleConditionScore: 90,
    dealerName: 'Rift Valley Motors Naivasha',
    logbookVerified: true,
    depositAmount: 640000, // 20%
    loanAmount: 2560000,
    tenureMonths: 36,
    interestRate: 12.8,
    monthlyInstallment: 85940,
    ltvRatio: 80,
    dtiRatio: 39,
    status: 'Approved',
    crbScore: 'Clean (Green Tier)',
    crbScoreNumber: 810,
    assignedOfficer: 'David Kamau (Credit Manager)',
    submissionDate: '2026-07-25 10:00 AM',
    lastUpdated: '2026-07-27 04:30 PM',
    stipulations: [
      'Direct Payroll Standing Order setup with Equity Bank',
      'Vehicle GPS Tracker Installation Confirmation'
    ],
    documents: [
      { id: 'DOC-11', name: 'National ID.pdf', type: 'National ID', status: 'Verified', uploadedAt: '2026-07-25' },
      { id: 'DOC-12', name: 'Safaricom 3-Month Payslips.pdf', type: 'Payslip', status: 'Verified', uploadedAt: '2026-07-25' },
      { id: 'DOC-13', name: 'Valuation & 150-Point Audit.pdf', type: 'Vehicle Valuation', status: 'Verified', uploadedAt: '2026-07-25' }
    ],
    messages: [
      {
        id: 'MSG-11',
        sender: 'Bank Loan Officer',
        senderName: 'David Kamau',
        message: 'Congratulations Sarah! Your Ksh 2,560,000 auto loan application has been APPROVED at 12.8% p.a.',
        timestamp: '2026-07-27 04:30 PM',
        type: 'Approval Notice'
      }
    ]
  },
  {
    id: 'APP-KCB-2026-003',
    appRef: 'KCB-AUT-1029',
    bankId: 'kcb',
    bankName: 'KCB Auto Loan Express',
    applicantName: 'James Kariuki',
    applicantPhone: '+254 733 890 112',
    applicantEmail: 'jkariuki@transport-sme.co.ke',
    applicantIdNumber: '25102948',
    employmentType: 'SME Corporate',
    monthlyIncome: 480000,
    employerName: 'Kariuki Logistics & Supply Chain Ltd',
    existingLoansMonthly: 180000,
    vehicleTitle: '2020 Isuzu FRR Commercial Tipper',
    vehiclePrice: 5800000,
    vehicleVin: 'JALFRR90K7019283',
    vehicleYear: 2020,
    vehicleMileage: 110000,
    vehicleConditionScore: 86,
    dealerName: 'Mombasa Commercial Trucks Ltd',
    logbookVerified: true,
    depositAmount: 1160000,
    loanAmount: 4640000,
    tenureMonths: 36,
    interestRate: 13.0,
    monthlyInstallment: 156400,
    ltvRatio: 80,
    dtiRatio: 47,
    status: 'Pending',
    crbScore: 'Minor History (Amber Tier)',
    crbScoreNumber: 670,
    assignedOfficer: 'Peter Kiprop (Commercial Risk Analyst)',
    submissionDate: '2026-07-29 08:15 AM',
    lastUpdated: '2026-07-29 08:15 AM',
    documents: [
      { id: 'DOC-21', name: 'Kariuki Logistics Audited Financials 2025.pdf', type: 'Bank Statement', status: 'Pending Review', uploadedAt: '2026-07-29' },
      { id: 'DOC-22', name: 'KRA Corporate PIN & Tax Compliance.pdf', type: 'KRA PIN', status: 'Verified', uploadedAt: '2026-07-29' }
    ],
    messages: [
      {
        id: 'MSG-21',
        sender: 'KAYAD System',
        senderName: 'System',
        message: 'New application submitted to KCB Auto Loan Express. Awaiting initial officer assignment.',
        timestamp: '2026-07-29 08:15 AM',
        type: 'Status Update'
      }
    ]
  },
  {
    id: 'APP-STB-2026-004',
    appRef: 'STB-VF-7710',
    bankId: 'stanbic',
    bankName: 'Stanbic Vehicle & Asset Solutions',
    applicantName: 'Fatuma Hassan',
    applicantPhone: '+254 701 554 992',
    applicantEmail: 'fatuma.h@coastalimports.com',
    applicantIdNumber: '29881029',
    employmentType: 'Self-Employed',
    monthlyIncome: 150000,
    employerName: 'Coastal Traders Boutique',
    existingLoansMonthly: 95000,
    vehicleTitle: '2018 Mercedes-Benz C200 AMG Line',
    vehiclePrice: 4200000,
    vehicleVin: 'WDD2050421R901823',
    vehicleYear: 2018,
    vehicleMileage: 54000,
    vehicleConditionScore: 88,
    dealerName: 'Mombasa Euro Motors',
    logbookVerified: false,
    depositAmount: 840000,
    loanAmount: 3360000,
    tenureMonths: 48,
    interestRate: 13.5,
    monthlyInstallment: 91200,
    ltvRatio: 80,
    dtiRatio: 63, // High DTI
    status: 'Rejected',
    crbScore: 'High Risk (Red Tier)',
    crbScoreNumber: 540,
    assignedOfficer: 'Kevin Njoroge (Risk Director)',
    submissionDate: '2026-07-20 11:30 AM',
    lastUpdated: '2026-07-22 03:00 PM',
    rejectionReason: 'Debt-to-Income (DTI) ratio of 63% exceeds Stanbic policy limit of 45%. Adverse CRB default listings recorded.',
    documents: [
      { id: 'DOC-31', name: 'National ID.pdf', type: 'National ID', status: 'Verified', uploadedAt: '2026-07-20' },
      { id: 'DOC-32', name: 'Bank Statement.pdf', type: 'Bank Statement', status: 'Re-upload Required', uploadedAt: '2026-07-20' }
    ],
    messages: [
      {
        id: 'MSG-31',
        sender: 'Bank Loan Officer',
        senderName: 'Kevin Njoroge',
        message: 'Application declined due to high debt-to-income commitment and unresolved CRB listings.',
        timestamp: '2026-07-22 03:00 PM',
        type: 'Status Update'
      }
    ]
  },
  {
    id: 'APP-NCBA-2026-005',
    appRef: 'NCBA-AF-8109',
    bankId: 'ncba',
    bankName: 'NCBA Drive Asset Finance',
    applicantName: 'Eng. Brian Rotich',
    applicantPhone: '+254 720 112 334',
    applicantEmail: 'brian.rotich@kenha.go.ke',
    applicantIdNumber: '27019283',
    employmentType: 'Salaried',
    monthlyIncome: 310000,
    employerName: 'KeNHA (Senior Civil Engineer)',
    existingLoansMonthly: 30000,
    vehicleTitle: '2022 Toyota Rav4 Hybrid AWD',
    vehiclePrice: 4800000,
    vehicleVin: 'JT3REV4H9M0192831',
    vehicleYear: 2022,
    vehicleMileage: 28000,
    vehicleConditionScore: 96,
    dealerName: 'Nairobi Luxury Motors Ltd',
    logbookVerified: true,
    depositAmount: 960000,
    loanAmount: 3840000,
    tenureMonths: 60,
    interestRate: 12.5,
    monthlyInstallment: 86400,
    ltvRatio: 80,
    dtiRatio: 28,
    status: 'Completed',
    crbScore: 'Clean (Green Tier)',
    crbScoreNumber: 835,
    assignedOfficer: 'Grace Wambui (Senior Credit Analyst)',
    submissionDate: '2026-07-10 09:00 AM',
    lastUpdated: '2026-07-16 02:00 PM',
    documents: [
      { id: 'DOC-41', name: 'National ID.pdf', type: 'National ID', status: 'Verified', uploadedAt: '2026-07-10' },
      { id: 'DOC-42', name: 'KeNHA Certified Payslips.pdf', type: 'Payslip', status: 'Verified', uploadedAt: '2026-07-10' },
      { id: 'DOC-43', name: 'NTSA Joint Logbook Transfer Stamp.pdf', type: 'Vehicle Valuation', status: 'Verified', uploadedAt: '2026-07-15' }
    ],
    messages: [
      {
        id: 'MSG-41',
        sender: 'KAYAD System',
        senderName: 'System',
        message: 'Funds disbursed directly to dealership account. Vehicle logbook joint registration complete. Application status marked as COMPLETED.',
        timestamp: '2026-07-16 02:00 PM',
        type: 'Approval Notice'
      }
    ]
  }
];
