import React, { useState } from 'react';
import {
  Car, Users, MessageSquare, FileText, TrendingUp, Settings, Home, Package, UserCheck, Calendar, ClipboardList, DollarSign, Gavel,
  BarChart3, Megaphone, PieChart, FolderOpen, FileBarChart, Bell, CreditCard,
  Plus, Upload, Star, Eye, Phone, Mail, Clock, CheckCircle2, XCircle,
  AlertTriangle, ArrowUpRight, Search, Filter, MoreVertical,
  Building2, MapPin, Globe, Award, Shield, Instagram, Facebook, Twitter, Linkedin,
  Check, X, ChevronDown, Menu, LayoutDashboard, Trophy, Target
} from 'lucide-react';

// KAYAD Design System Colors
const colors = {
  navy: '#1E3063',
  navyDeep: '#121D33',
  cream: '#FCF9F4',
  sand: '#F5EFE6',
  teal: '#00C9CE',
  emerald: '#166534',
  crimson: '#991B1B',
  textMuted: '#6B7A99',
};

// Types (simplified inline for now)
interface DealerVehicle {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  status: string;
  stockStatus: string;
  images: string[];
  viewsCount: number;
  savesCount: number;
  inquiriesCount: number;
  ntsaTimsVerified: boolean;
}

interface DealerLead {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  source: string;
  status: string;
  assignedStaffName?: string;
  followUpDate?: string;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  permissions: Record<string, any>;
  isActive: boolean;
  lastActiveAt?: string;
}

interface TestDrive {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  staffId: string;
  staffName: string;
  status: string;
  feedback?: string;
  rating?: number;
}

interface DealerInspection {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  customerName: string;
  inspectorName?: string;
  requestedAt: string;
  scheduledTime?: string;
  status: string;
  overallScore?: number;
  reportSummary?: string;
}

interface DealerMessage {
  id: string;
  type: string;
  subject: string;
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  content: string;
  isRead: boolean;
  vehicleTitle?: string;
  createdAt: string;
}

interface DealerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface DealerProfile {
  name: string;
  email: string;
  phone: string;
  logo: string;
  coverImage: string;
  description: string;
  branches: { name: string; address: string; isMain: boolean }[];
  openingHours: { day: string; open: string; close: string; isClosed: boolean }[];
  socialLinks: { website?: string; facebook?: string; instagram?: string; twitter?: string };
  verifiedStatus: string;
  subscription: { plan: string; status: string; renewalDate: string; features: string[]; listingsUsed: number; listingsLimit: number };
}

interface Analytics {
  vehiclesSold: number;
  conversionRate: number;
  leadResponseTime: number;
  avgDaysInStock: number;
  mostViewedVehicles: { id: string; title: string; count: number; image: string }[];
  mostEnquiredVehicles: { id: string; title: string; count: number; image: string }[];
  financeConversion: number;
  inspectionConversion: number;
  auctionSuccess: number;
}

// Mock Data
const mockProfile: DealerProfile = {
  name: 'Prestige Motors Kenya',
  email: 'info@prestigemotors.co.ke',
  phone: '+254 712 345 678',
  logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=200&fit=crop',
  coverImage: 'https://images.unsplash.com/photo-1562141961-b5d1a8b8c3f7?w=1200&h=400&fit=crop',
  description: 'East Africa\'s premier luxury and premium vehicle dealership.',
  branches: [
    { name: 'Main Showroom', address: 'Westlands, Nairobi', isMain: true },
    { name: 'Kilimani Branch', address: 'Kilimani, Nairobi', isMain: false },
  ],
  openingHours: [
    { day: 'Monday', open: '08:00', close: '18:00', isClosed: false },
    { day: 'Tuesday', open: '08:00', close: '18:00', isClosed: false },
    { day: 'Wednesday', open: '08:00', close: '18:00', isClosed: false },
    { day: 'Thursday', open: '08:00', close: '18:00', isClosed: false },
    { day: 'Friday', open: '08:00', close: '18:00', isClosed: false },
    { day: 'Saturday', open: '09:00', close: '15:00', isClosed: false },
    { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true },
  ],
  socialLinks: { website: 'https://prestigemotors.co.ke', facebook: 'prestigemotorskenya', instagram: 'prestigemotorskenya' },
  verifiedStatus: 'verified',
  subscription: { plan: 'enterprise', status: 'active', renewalDate: '2025-08-15', features: ['Unlimited Listings', 'Auction Center', 'Analytics Pro'], listingsUsed: 47, listingsLimit: 100 },
};

const mockVehicles: DealerVehicle[] = [
  { id: 'V1', title: '2024 Toyota Land Cruiser Prado TX-L', make: 'Toyota', model: 'Prado', year: 2024, price: 12450000, mileage: 1500, status: 'Active', stockStatus: 'In Stock', images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600'], viewsCount: 1247, savesCount: 89, inquiriesCount: 34, ntsaTimsVerified: true },
  { id: 'V2', title: '2023 Mercedes-Benz GLE 450 4MATIC', make: 'Mercedes-Benz', model: 'GLE', year: 2023, price: 9850000, mileage: 12000, status: 'Active', stockStatus: 'In Stock', images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600'], viewsCount: 892, savesCount: 56, inquiriesCount: 23, ntsaTimsVerified: true },
  { id: 'V3', title: '2022 BMW X5 xDrive40i M Sport', make: 'BMW', model: 'X5', year: 2022, price: 8650000, mileage: 28000, status: 'Draft', stockStatus: 'In Stock', images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600'], viewsCount: 0, savesCount: 0, inquiriesCount: 0, ntsaTimsVerified: false },
  { id: 'V4', title: '2021 Range Rover Sport HSE Dynamic', make: 'Land Rover', model: 'Range Rover Sport', year: 2021, price: 11200000, mileage: 35000, status: 'Pending Review', stockStatus: 'Reserved', images: ['https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=600'], viewsCount: 1563, savesCount: 112, inquiriesCount: 45, ntsaTimsVerified: true },
  { id: 'V5', title: '2020 Porsche Cayenne E-Hybrid', make: 'Porsche', model: 'Cayenne', year: 2020, price: 9800000, mileage: 42000, status: 'Active', stockStatus: 'In Stock', images: ['https://images.unsplash.com/photo-1614162692292-7ac56d7f373e?w=600'], viewsCount: 723, savesCount: 41, inquiriesCount: 18, ntsaTimsVerified: true },
  { id: 'V6', title: '2019 Lexus LX 570 Luxury', make: 'Lexus', model: 'LX', year: 2019, price: 7650000, mileage: 58000, status: 'Sold', stockStatus: 'Sold', images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600'], viewsCount: 2341, savesCount: 178, inquiriesCount: 67, ntsaTimsVerified: true },
];

const mockLeads: DealerLead[] = [
  { id: 'L1', vehicleId: 'V1', vehicleTitle: '2024 Toyota Land Cruiser Prado TX-L', vehicleImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200', customerName: 'Dr. Michael Njoroge', customerPhone: '+254 722 123 456', customerEmail: 'michael.njoroge@email.com', source: 'Website', status: 'Hot', assignedStaffName: 'Sarah Ochieng', followUpDate: 'Today', createdAt: '2 hours ago' },
  { id: 'L2', vehicleId: 'V2', vehicleTitle: '2023 Mercedes-Benz GLE 450 4MATIC', vehicleImage: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200', customerName: 'Eng. Patricia Wanjiku', customerPhone: '+254 733 456 789', customerEmail: 'patricia.w@kenyaengineers.co.ke', source: 'WhatsApp', status: 'Negotiating', assignedStaffName: 'David Mutua', followUpDate: 'Tomorrow', createdAt: 'Yesterday' },
  { id: 'L3', vehicleId: 'V5', vehicleTitle: '2020 Porsche Cayenne E-Hybrid', vehicleImage: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f373e?w=200', customerName: 'Hon. James Otieno', customerPhone: '+254 711 987 654', customerEmail: 'james.otieno@parliament.go.ke', source: 'Phone Call', status: 'New', createdAt: '30 minutes ago' },
  { id: 'L4', vehicleId: 'V4', vehicleTitle: '2021 Range Rover Sport HSE Dynamic', vehicleImage: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=200', customerName: 'Aisha Mohammed', customerPhone: '+254 745 234 567', customerEmail: 'aisha.m@business.co.ke', source: 'Instagram', status: 'Viewed', assignedStaffName: 'Sarah Ochieng', followUpDate: 'Today', createdAt: '4 hours ago' },
  { id: 'L5', vehicleId: 'V1', vehicleTitle: '2024 Toyota Land Cruiser Prado TX-L', vehicleImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200', customerName: 'Robert Kimani', customerPhone: '+254 756 345 678', customerEmail: 'rkimani@email.com', source: 'Walk-in', status: 'Won', assignedStaffName: 'Grace Muthoni', createdAt: '3 days ago' },
  { id: 'L6', vehicleId: 'V3', vehicleTitle: '2022 BMW X5 xDrive40i M Sport', vehicleImage: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200', customerName: 'Linda Achieng', customerPhone: '+254 767 456 789', customerEmail: 'linda.a@email.com', source: 'Referral', status: 'Lost', assignedStaffName: 'David Mutua', createdAt: '1 week ago' },
];

const mockStaff: StaffMember[] = [
  { id: 'S1', name: 'Sarah Ochieng', email: 'sarah@prestigemotors.co.ke', role: 'Sales Manager', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', permissions: {}, isActive: true, lastActiveAt: '5 minutes ago' },
  { id: 'S2', name: 'David Mutua', email: 'david@prestigemotors.co.ke', role: 'Sales Executive', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', permissions: {}, isActive: true, lastActiveAt: '2 hours ago' },
  { id: 'S3', name: 'Grace Muthoni', email: 'grace@prestigemotors.co.ke', role: 'Finance Officer', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', permissions: {}, isActive: true, lastActiveAt: '30 minutes ago' },
  { id: 'S4', name: 'Kevin Odhiambo', email: 'kevin@prestigemotors.co.ke', role: 'Inventory Manager', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100', permissions: {}, isActive: true, lastActiveAt: '1 hour ago' },
];

const mockTestDrives: TestDrive[] = [
  { id: 'TD1', vehicleId: 'V1', vehicleTitle: '2024 Toyota Land Cruiser Prado TX-L', vehicleImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200', customerName: 'Dr. Michael Njoroge', customerPhone: '+254 722 123 456', customerEmail: 'michael.njoroge@email.com', scheduledDate: 'Today', scheduledTime: '10:00 AM', staffId: 'S1', staffName: 'Sarah Ochieng', status: 'Confirmed' },
  { id: 'TD2', vehicleId: 'V2', vehicleTitle: '2023 Mercedes-Benz GLE 450 4MATIC', vehicleImage: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200', customerName: 'Eng. Patricia Wanjiku', customerPhone: '+254 733 456 789', customerEmail: 'patricia.w@kenyaengineers.co.ke', scheduledDate: 'Today', scheduledTime: '2:00 PM', staffId: 'S2', staffName: 'David Mutua', status: 'Scheduled' },
  { id: 'TD3', vehicleId: 'V5', vehicleTitle: '2020 Porsche Cayenne E-Hybrid', vehicleImage: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f373e?w=200', customerName: 'Hon. James Otieno', customerPhone: '+254 711 987 654', customerEmail: 'james.otieno@parliament.go.ke', scheduledDate: 'Tomorrow', scheduledTime: '11:30 AM', staffId: 'S1', staffName: 'Sarah Ochieng', status: 'Scheduled' },
  { id: 'TD4', vehicleId: 'V4', vehicleTitle: '2021 Range Rover Sport HSE Dynamic', vehicleImage: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=200', customerName: 'Aisha Mohammed', customerPhone: '+254 745 234 567', customerEmail: 'aisha.m@business.co.ke', scheduledDate: 'Yesterday', scheduledTime: '9:00 AM', staffId: 'S1', staffName: 'Sarah Ochieng', status: 'Completed', feedback: 'Customer loved the vehicle.', rating: 5 },
];

const mockInspections: DealerInspection[] = [
  { id: 'INS1', vehicleId: 'V6', vehicleTitle: '2019 Lexus LX 570 Luxury', vehicleImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200', customerName: 'Robert Kimani', inspectorName: 'AutoCheck Kenya', requestedAt: '3 days ago', scheduledTime: 'Dec 20, 2024 - 9:00 AM', status: 'Booked' },
  { id: 'INS2', vehicleId: 'V4', vehicleTitle: '2021 Range Rover Sport HSE Dynamic', vehicleImage: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=200', customerName: 'Aisha Mohammed', inspectorName: 'VehicleInspect Pro', requestedAt: '5 days ago', status: 'Completed', overallScore: 87, reportSummary: 'Excellent condition.' },
  { id: 'INS3', vehicleId: 'V1', vehicleTitle: '2024 Toyota Land Cruiser Prado TX-L', vehicleImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200', customerName: 'Dr. Michael Njoroge', requestedAt: '2 hours ago', status: 'Requested' },
];

const mockMessages: DealerMessage[] = [
  { id: 'MSG1', type: 'Buyer Chat', subject: 'Interest in Prado TX-L', senderName: 'Dr. Michael Njoroge', senderPhone: '+254 722 123 456', senderEmail: 'michael.njoroge@email.com', content: 'Hi, I\'m very interested in the white Prado. Is it available for viewing this weekend?', isRead: false, vehicleTitle: '2024 Toyota Land Cruiser Prado TX-L', createdAt: '2 hours ago' },
  { id: 'MSG2', type: 'Auction Enquiry', subject: 'Registration for Premium Auto Auction', senderName: 'Joseph Kuria', senderPhone: '+254 720 234 567', senderEmail: 'jkuria@business.co.ke', content: 'Hello, I\'d like to register as a bidder for the upcoming auction.', isRead: true, createdAt: 'Yesterday' },
  { id: 'MSG3', type: 'Finance Question', subject: 'Financing options for Mercedes GLE', senderName: 'Eng. Patricia Wanjiku', senderPhone: '+254 733 456 789', senderEmail: 'patricia.w@kenyaengineers.co.ke', content: 'Does your financing partner offer balloon payment options?', isRead: false, vehicleTitle: '2023 Mercedes-Benz GLE 450 4MATIC', createdAt: '4 hours ago' },
  { id: 'MSG4', type: 'Inspection Request', subject: 'Request for 150-point inspection', senderName: 'Robert Kimani', senderPhone: '+254 756 345 678', senderEmail: 'rkimani@email.com', content: 'I\'d like to schedule a comprehensive inspection.', isRead: true, vehicleTitle: '2019 Lexus LX 570 Luxury', createdAt: '3 days ago' },
  { id: 'MSG5', type: 'Internal Note', subject: 'VIP client visiting tomorrow', senderName: 'Sarah Ochieng', senderPhone: '+254 733 456 789', content: 'Hon. James Otieno is visiting tomorrow at 11:30 AM for a test drive.', isRead: true, createdAt: 'Today' },
];

const mockNotifications: DealerNotification[] = [
  { id: 'N1', type: 'Enquiry', title: 'New Enquiry', message: 'Dr. Michael Njoroge enquired about Toyota Land Cruiser Prado TX-L', isRead: false, createdAt: '2 hours ago' },
  { id: 'N2', type: 'Sale', title: 'Vehicle Sold!', message: '2019 Lexus LX 570 Luxury has been sold for KES 7,200,000', isRead: false, createdAt: '3 hours ago' },
  { id: 'N3', type: 'Inspection', title: 'Inspection Complete', message: '150-point inspection report ready for Range Rover Sport', isRead: true, createdAt: '1 day ago' },
  { id: 'N4', type: 'Finance', title: 'Finance Application Update', message: 'NCBA has approved Patricia Wanjiku\'s loan application', isRead: false, createdAt: '5 hours ago' },
];

const mockAnalytics: Analytics = {
  vehiclesSold: 23,
  conversionRate: 34.5,
  leadResponseTime: 12,
  avgDaysInStock: 28,
  mostViewedVehicles: [
    { id: 'V4', title: '2021 Range Rover Sport', count: 1563, image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=200' },
    { id: 'V1', title: '2024 Toyota Land Cruiser', count: 1247, image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200' },
    { id: 'V6', title: '2019 Lexus LX 570', count: 2341, image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200' },
  ],
  mostEnquiredVehicles: [
    { id: 'V4', title: '2021 Range Rover Sport', count: 45, image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=200' },
    { id: 'V1', title: '2024 Toyota Land Cruiser', count: 34, image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200' },
    { id: 'V2', title: '2023 Mercedes-Benz GLE', count: 23, image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200' },
  ],
  financeConversion: 42,
  inspectionConversion: 78,
  auctionSuccess: 85,
};

type WorkspaceView = 'home' | 'inventory' | 'leads' | 'messages' | 'profile' | 'staff' | 'testdrives' | 'inspections' | 'performance' | 'notifications' | 'subscription' | 'finance' | 'auctions' | 'marketing' | 'analytics' | 'documents' | 'reports';

interface DealerBusinessCenterProps {
  onNavigate?: (nav: string) => void;
  onOpenAuthModal?: () => void;
}

export const DealerBusinessCenter: React.FC<DealerBusinessCenterProps> = ({ onNavigate, onOpenAuthModal }) => {
  const [activeView, setActiveView] = useState<WorkspaceView>('home');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  const unreadMessages = mockMessages.filter(m => !m.isRead).length;
  const unreadNotifications = mockNotifications.filter(n => !n.isRead).length;

  const navItems = [
    { id: 'home' as WorkspaceView, label: 'Home', icon: Home, badge: 0 },
    { id: 'inventory' as WorkspaceView, label: 'Inventory', icon: Package, badge: 0 },
    { id: 'leads' as WorkspaceView, label: 'Leads', icon: UserCheck, badge: mockLeads.filter(l => l.status === 'New' || l.status === 'Hot').length },
    { id: 'messages' as WorkspaceView, label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { id: 'testdrives' as WorkspaceView, label: 'Test Drives', icon: Calendar, badge: mockTestDrives.filter(t => t.status === 'Scheduled' || t.status === 'Confirmed').length },
    { id: 'inspections' as WorkspaceView, label: 'Inspections', icon: ClipboardList, badge: mockInspections.filter(i => i.status === 'Requested' || i.status === 'Booked').length },
    { id: 'performance' as WorkspaceView, label: 'Performance', icon: TrendingUp, badge: 0 },
    { id: 'notifications' as WorkspaceView, label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { id: 'profile' as WorkspaceView, label: 'Showroom', icon: Building2, badge: 0 },
    { id: 'staff' as WorkspaceView, label: 'Staff', icon: Users, badge: 0 },
    { id: 'subscription' as WorkspaceView, label: 'Subscription', icon: CreditCard, badge: 0 },
  ];

  const activeVehicles = mockVehicles.filter(v => v.status === 'Active').length;
  const draftVehicles = mockVehicles.filter(v => v.status === 'Draft').length;
  const pendingVehicles = mockVehicles.filter(v => v.status === 'Pending Review').length;
  const soldVehicles = mockVehicles.filter(v => v.status === 'Sold').length;
  const todayRevenue = 7200000;

  // Quick Actions
  const quickActions = [
    { id: 'QA1', label: 'Add Vehicle', icon: Car, color: 'bg-[#00C9CE]' },
    { id: 'QA2', label: 'Import', icon: Upload, color: 'bg-[#1E3063]' },
    { id: 'QA3', label: 'Create Auction', icon: Gavel, color: 'bg-[#166534]' },
    { id: 'QA4', label: 'Feature', icon: Star, color: 'bg-[#00C9CE]' },
    { id: 'QA5', label: 'Respond Lead', icon: MessageSquare, color: 'bg-[#1E3063]' },
    { id: 'QA6', label: 'Test Drive', icon: Calendar, color: 'bg-[#166534]' },
    { id: 'QA7', label: 'Approve', icon: CheckCircle2, color: 'bg-[#00C9CE]' },
    { id: 'QA8', label: 'Report', icon: FileBarChart, color: 'bg-[#1E3063]' },
  ];

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2D8C7] sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowMobileNav(!showMobileNav)} className="lg:hidden p-2 rounded-lg hover:bg-[#F5EFE6]">
                <Menu className="w-5 h-5 text-[#1E3063]" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3063] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#00C9CE]" />
                </div>
                <div className="hidden md:block">
                  <h1 className="font-bold text-[#1E3063]">Dealer Business Center</h1>
                  <p className="text-[10px] text-[#6B7A99]">{mockProfile.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveView('notifications')} className="relative p-2 rounded-lg hover:bg-[#F5EFE6]">
                <Bell className="w-5 h-5 text-[#1E3063]" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#991B1B] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveView('messages')} className="relative p-2 rounded-lg hover:bg-[#F5EFE6]">
                <MessageSquare className="w-5 h-5 text-[#1E3063]" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#00C9CE] text-[#1E3063] text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </button>
              <img src={mockProfile.logo} alt="Profile" className="w-8 h-8 rounded-lg object-cover" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-[1800px] mx-auto">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-[#E2D8C7] overflow-y-auto transition-transform lg:translate-x-0 ${showMobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="p-4 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); setShowMobileNav(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeView === item.id ? 'bg-[#1E3063] text-white' : 'text-[#6B7A99] hover:bg-[#F5EFE6] hover:text-[#1E3063]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </span>
                {item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeView === item.id ? 'bg-white/20 text-white' : 'bg-[#00C9CE] text-[#1E3063]'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {showMobileNav && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileNav(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] p-4 lg:p-6">
          {/* HOME WORKSPACE */}
          {activeView === 'home' && (
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="bg-gradient-to-r from-[#1E3063] to-[#121D33] rounded-2xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">Good Morning, {mockProfile.name}</h1>
                    <p className="text-white/70 text-sm">Here&apos;s what needs your attention today</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
                    <p className="text-xs text-white/60">Today&apos;s Revenue</p>
                    <p className="text-xl font-bold text-[#00C9CE]">{formatCurrency(todayRevenue)}</p>
                  </div>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-white rounded-xl border border-[#E2D8C7] p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1E3063] flex items-center justify-center mb-3">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-[#1E3063]">{activeVehicles}</p>
                  <p className="text-xs text-[#6B7A99]">Vehicles In Stock</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E2D8C7] p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#00C9CE] flex items-center justify-center mb-3">
                    <UserCheck className="w-5 h-5 text-[#1E3063]" />
                  </div>
                  <p className="text-2xl font-bold text-[#1E3063]">{mockLeads.filter(l => l.status === 'New').length}</p>
                  <p className="text-xs text-[#6B7A99]">New Leads</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E2D8C7] p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#166534] flex items-center justify-center mb-3">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-[#1E3063]">{unreadMessages}</p>
                  <p className="text-xs text-[#6B7A99]">Unread Messages</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E2D8C7] p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#00C9CE] flex items-center justify-center mb-3">
                    <Calendar className="w-5 h-5 text-[#1E3063]" />
                  </div>
                  <p className="text-2xl font-bold text-[#1E3063]">{mockTestDrives.filter(t => t.status === 'Scheduled' || t.status === 'Confirmed').length}</p>
                  <p className="text-xs text-[#6B7A99]">Test Drives Today</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E2D8C7] p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#991B1B] flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-[#1E3063]">{pendingVehicles + mockInspections.filter(i => i.status === 'Requested').length}</p>
                  <p className="text-xs text-[#6B7A99]">Pending Approvals</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E2D8C7] p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#166534] flex items-center justify-center mb-3">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-[#1E3063]">{soldVehicles}</p>
                  <p className="text-xs text-[#6B7A99]">Vehicles Sold</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                <h2 className="text-lg font-bold text-[#1E3063] mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  {quickActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => showToast(`${action.label} - Coming soon`)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#E2D8C7] hover:border-[#00C9CE] hover:bg-[#00C9CE]/5 transition-all"
                    >
                      <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center text-white`}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-[#1E3063] text-center">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hot Leads & Test Drives */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#1E3063]">Hot Leads</h2>
                    <button onClick={() => setActiveView('leads')} className="text-xs text-[#00C9CE] hover:underline">View All</button>
                  </div>
                  <div className="space-y-3">
                    {mockLeads.filter(l => l.status === 'Hot' || l.status === 'New').slice(0, 3).map(lead => (
                      <div key={lead.id} className="flex items-center gap-3 p-3 bg-[#F5EFE6]/50 rounded-xl">
                        <img src={lead.vehicleImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1E3063] truncate">{lead.customerName}</p>
                          <p className="text-xs text-[#6B7A99] truncate">{lead.vehicleTitle}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${lead.status === 'Hot' ? 'bg-[#991B1B]/10 text-[#991B1B]' : 'bg-[#00C9CE]/10 text-[#00C9CE]'}`}>
                            {lead.status}
                          </span>
                        </div>
                        <button onClick={() => showToast('Calling...')} className="p-2 rounded-lg bg-[#00C9CE]/10 text-[#00C9CE]">
                          <Phone className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#1E3063]">Upcoming Test Drives</h2>
                    <button onClick={() => setActiveView('testdrives')} className="text-xs text-[#00C9CE] hover:underline">View All</button>
                  </div>
                  <div className="space-y-3">
                    {mockTestDrives.filter(t => t.status === 'Scheduled' || t.status === 'Confirmed').slice(0, 3).map(td => (
                      <div key={td.id} className="flex items-center gap-3 p-3 bg-[#F5EFE6]/50 rounded-xl">
                        <div className="w-14 h-14 rounded-lg bg-[#1E3063] flex flex-col items-center justify-center text-white">
                          <span className="text-lg font-bold leading-none">{td.scheduledTime.split(' ')[0]}</span>
                          <span className="text-[10px]">{td.scheduledTime.split(' ')[1]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1E3063]">{td.customerName}</p>
                          <p className="text-xs text-[#6B7A99] truncate">{td.vehicleTitle}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${td.status === 'Confirmed' ? 'bg-[#166534]/10 text-[#166534]' : 'bg-[#1E3063]/10 text-[#1E3063]'}`}>
                            {td.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Featured Listings */}
              <div className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#1E3063]">Featured Listings</h2>
                  <button onClick={() => setActiveView('inventory')} className="text-xs text-[#00C9CE] hover:underline">Manage Inventory</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {mockVehicles.filter(v => v.status === 'Active').slice(0, 4).map(v => (
                    <div key={v.id} className="flex gap-3 p-3 bg-[#F5EFE6]/50 rounded-xl">
                      <img src={v.images[0]} alt={v.title} className="w-24 h-20 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1E3063] truncate">{v.title}</p>
                        <p className="text-sm font-bold text-[#00C9CE]">{formatCurrency(v.price)}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-[#6B7A99]">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.viewsCount}</span>
                          <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {v.savesCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscription Status */}
              <div className="bg-gradient-to-r from-[#1E3063] to-[#121D33] rounded-2xl p-5 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#00C9CE] flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-[#1E3063]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Enterprise Plan</p>
                      <p className="text-xs text-white/60">Renewal: {mockProfile.subscription.renewalDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00C9CE]">{mockProfile.subscription.listingsUsed}</p>
                      <p className="text-[10px] text-white/60">Listings Used</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{mockProfile.subscription.listingsLimit}</p>
                      <p className="text-[10px] text-white/60">Total Limit</p>
                    </div>
                    <button onClick={() => setActiveView('subscription')} className="px-4 py-2 bg-[#00C9CE] text-[#1E3063] rounded-lg font-semibold text-sm">
                      Manage Plan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY WORKSPACE */}
          {activeView === 'inventory' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#1E3063]">Inventory Management</h1>
                  <p className="text-sm text-[#6B7A99]">Manage your dealership vehicle inventory</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => showToast('Bulk import coming soon')} className="px-4 py-2 bg-white border border-[#E2D8C7] text-[#1E3063] rounded-xl font-semibold text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Import
                  </button>
                  <button onClick={() => showToast('Add vehicle wizard coming soon')} className="px-4 py-2 bg-[#00C9CE] text-[#1E3063] rounded-xl font-semibold text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Vehicle
                  </button>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="bg-white rounded-2xl border border-[#E2D8C7] p-1 flex flex-wrap gap-1">
                {['Active', 'Draft', 'Pending Review', 'Sold', 'Archived'].map((status, i) => (
                  <button key={status} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-[#1E3063] text-white">
                    {status}
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {[activeVehicles, draftVehicles, pendingVehicles, soldVehicles, 2][i]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Vehicle Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockVehicles.map(v => (
                  <div key={v.id} className="bg-white rounded-2xl border border-[#E2D8C7] overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img src={v.images[0]} alt={v.title} className="w-full h-48 object-cover" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${v.status === 'Active' ? 'bg-[#166534] text-white' : v.status === 'Draft' ? 'bg-[#6B7A99] text-white' : v.status === 'Pending Review' ? 'bg-[#991B1B] text-white' : 'bg-[#1E3063] text-white'}`}>
                          {v.status}
                        </span>
                        {v.ntsaTimsVerified && <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#00C9CE] text-[#1E3063] flex items-center gap-1"><Shield className="w-3 h-3" /> NTSA</span>}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-[#1E3063] truncate">{v.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-[#6B7A99]">
                        <span>{v.year}</span><span>•</span><span>{v.mileage.toLocaleString()} km</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-lg font-bold text-[#00C9CE]">{formatCurrency(v.price)}</p>
                        <div className="flex items-center gap-2 text-xs text-[#6B7A99]">
                          <span><Eye className="w-3 h-3 inline" /> {v.viewsCount}</span>
                          <span><Star className="w-3 h-3 inline" /> {v.savesCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LEADS WORKSPACE */}
          {activeView === 'leads' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1E3063]">Customer Leads</h1>
                <p className="text-sm text-[#6B7A99]">Manage and track all customer enquiries</p>
              </div>

              {/* Leads Table */}
              <div className="bg-white rounded-2xl border border-[#E2D8C7] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#F5EFE6]">
                    <tr className="text-left text-xs font-semibold text-[#6B7A99] uppercase">
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assigned To</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2D8C7]">
                    {mockLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-[#F5EFE6]/50 transition-colors">
                        <td className="px-4 py-4">
                          <div><p className="font-semibold text-sm text-[#1E3063]">{lead.customerName}</p><p className="text-xs text-[#6B7A99]">{lead.customerPhone}</p></div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2"><img src={lead.vehicleImage} alt="" className="w-10 h-10 rounded-lg object-cover" /><span className="text-sm text-[#1E3063] truncate max-w-[150px]">{lead.vehicleTitle}</span></div>
                        </td>
                        <td className="px-4 py-4"><span className="text-xs font-medium text-[#6B7A99]">{lead.source}</span></td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${lead.status === 'Hot' ? 'bg-[#991B1B] text-white' : lead.status === 'New' ? 'bg-[#00C9CE] text-[#1E3063]' : lead.status === 'Won' ? 'bg-[#166534] text-white' : lead.status === 'Lost' ? 'bg-[#6B7A99] text-white' : 'bg-[#1E3063]/10 text-[#1E3063]'}`}>{lead.status}</span>
                        </td>
                        <td className="px-4 py-4"><span className="text-sm text-[#1E3063]">{lead.assignedStaffName || 'Unassigned'}</span></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => showToast('Calling...')} className="p-2 rounded-lg bg-[#00C9CE]/10 text-[#00C9CE]"><Phone className="w-4 h-4" /></button>
                            <button onClick={() => showToast('Replying...')} className="p-2 rounded-lg bg-[#1E3063]/10 text-[#1E3063]"><Mail className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MESSAGES WORKSPACE */}
          {activeView === 'messages' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1E3063]">Messages</h1>
                <p className="text-sm text-[#6B7A99]">Unified communication center</p>
              </div>
              <div className="space-y-3">
                {mockMessages.map(msg => (
                  <div key={msg.id} className={`bg-white rounded-2xl border p-4 ${msg.isRead ? 'border-[#E2D8C7]' : 'border-l-4 border-l-[#00C9CE]'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${msg.type === 'Buyer Chat' ? 'bg-[#00C9CE]/10 text-[#00C9CE]' : msg.type === 'Internal Note' ? 'bg-[#991B1B]/10 text-[#991B1B]' : 'bg-[#1E3063]/10 text-[#1E3063]'}`}>
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-semibold text-sm ${msg.isRead ? 'text-[#6B7A99]' : 'text-[#1E3063]'}`}>{msg.senderName}</h3>
                          <span className="text-[10px] text-[#6B7A99]">{msg.createdAt}</span>
                        </div>
                        <p className="text-xs text-[#6B7A99]">{msg.type}</p>
                        <p className="font-medium text-sm text-[#1E3063] mt-1">{msg.subject}</p>
                        <p className="text-xs text-[#6B7A99] mt-1 line-clamp-2">{msg.content}</p>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => showToast('Reply feature coming')} className="px-3 py-1.5 bg-[#00C9CE] text-[#1E3063] rounded-lg text-xs font-semibold">Reply</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PERFORMANCE WORKSPACE */}
          {activeView === 'performance' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1E3063]">Sales Performance</h1>
                <p className="text-sm text-[#6B7A99]">Key performance indicators and metrics</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#1E3063] to-[#121D33] rounded-2xl p-5 text-white">
                  <TrendingUp className="w-6 h-6 mb-2" />
                  <p className="text-3xl font-bold">{mockAnalytics.vehiclesSold}</p>
                  <p className="text-xs text-white/60 mt-1">Vehicles Sold</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E2D8C7] p-5">
                  <Target className="w-6 h-6 text-[#00C9CE] mb-2" />
                  <p className="text-3xl font-bold text-[#1E3063]">{mockAnalytics.conversionRate}%</p>
                  <p className="text-xs text-[#6B7A99]">Conversion Rate</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E2D8C7] p-5">
                  <Clock className="w-6 h-6 text-[#166534] mb-2" />
                  <p className="text-3xl font-bold text-[#1E3063]">{mockAnalytics.leadResponseTime} min</p>
                  <p className="text-xs text-[#6B7A99]">Avg Response Time</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E2D8C7] p-5">
                  <Calendar className="w-6 h-6 text-[#991B1B] mb-2" />
                  <p className="text-3xl font-bold text-[#1E3063]">{mockAnalytics.avgDaysInStock}</p>
                  <p className="text-xs text-[#6B7A99]">Avg Days in Stock</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                  <h3 className="font-bold text-[#1E3063] mb-4">Most Viewed Vehicles</h3>
                  <div className="space-y-3">
                    {mockAnalytics.mostViewedVehicles.map((v, i) => (
                      <div key={v.id} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#1E3063] text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <img src={v.image} alt="" className="w-12 h-10 rounded-lg object-cover" />
                        <div className="flex-1"><p className="text-sm font-medium text-[#1E3063] truncate">{v.title}</p><p className="text-xs text-[#6B7A99]">{v.count.toLocaleString()} views</p></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                  <h3 className="font-bold text-[#1E3063] mb-4">Most Enquired Vehicles</h3>
                  <div className="space-y-3">
                    {mockAnalytics.mostEnquiredVehicles.map((v, i) => (
                      <div key={v.id} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#00C9CE] text-[#1E3063] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <img src={v.image} alt="" className="w-12 h-10 rounded-lg object-cover" />
                        <div className="flex-1"><p className="text-sm font-medium text-[#1E3063] truncate">{v.title}</p><p className="text-xs text-[#6B7A99]">{v.count} enquiries</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE WORKSPACE */}
          {activeView === 'profile' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#1E3063]">Showroom Profile</h1>
                  <p className="text-sm text-[#6B7A99]">Manage your dealership public profile</p>
                </div>
                <button onClick={() => showToast('Edit mode coming')} className="px-4 py-2 bg-[#1E3063] text-white rounded-xl font-semibold text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Edit Profile
                </button>
              </div>
              <div className="relative rounded-2xl overflow-hidden">
                <img src={mockProfile.coverImage} alt="Cover" className="w-full h-48 object-cover" />
                <div className="absolute bottom-4 left-4 flex items-end gap-4">
                  <img src={mockProfile.logo} alt="Logo" className="w-24 h-24 rounded-xl border-4 border-white shadow-lg" />
                  <div className="mb-2">
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">{mockProfile.name}</h2>
                    {mockProfile.verifiedStatus === 'verified' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#00C9CE] text-[#1E3063] rounded-lg text-xs font-semibold">
                        <Shield className="w-3 h-3" /> Verified Dealer
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                <h3 className="font-bold text-[#1E3063] mb-4">About Us</h3>
                <p className="text-sm text-[#6B7A99]">{mockProfile.description}</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                <h3 className="font-bold text-[#1E3063] mb-4">Branches</h3>
                <div className="space-y-3">
                  {mockProfile.branches.map(branch => (
                    <div key={branch.name} className="flex items-start gap-3 p-3 bg-[#F5EFE6]/50 rounded-xl">
                      <Building2 className="w-5 h-5 text-[#1E3063] mt-1" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-[#1E3063]">{branch.name}</p>
                          {branch.isMain && <span className="px-2 py-0.5 bg-[#00C9CE]/10 text-[#00C9CE] rounded text-[10px] font-semibold">Main</span>}
                        </div>
                        <p className="text-xs text-[#6B7A99] mt-1">{branch.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STAFF WORKSPACE */}
          {activeView === 'staff' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#1E3063]">Staff Management</h1>
                  <p className="text-sm text-[#6B7A99]">Manage your dealership team and permissions</p>
                </div>
                <button onClick={() => showToast('Staff invitation form coming')} className="px-4 py-2 bg-[#00C9CE] text-[#1E3063] rounded-xl font-semibold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" /> Invite Staff
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {mockStaff.map(staff => (
                  <div key={staff.id} className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                    <div className="flex items-start gap-4">
                      <img src={staff.avatar} alt={staff.name} className="w-16 h-16 rounded-xl object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[#1E3063]">{staff.name}</h3>
                          {staff.isActive && <span className="w-2 h-2 rounded-full bg-[#166534]" />}
                        </div>
                        <p className="text-xs text-[#00C9CE] font-medium">{staff.role}</p>
                        <p className="text-[10px] text-[#6B7A99] mt-1">Last active: {staff.lastActiveAt}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEST DRIVES WORKSPACE */}
          {activeView === 'testdrives' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#1E3063]">Test Drive Management</h1>
                  <p className="text-sm text-[#6B7A99]">Schedule and track vehicle test drives</p>
                </div>
                <button onClick={() => showToast('Test drive booking form coming')} className="px-4 py-2 bg-[#00C9CE] text-[#1E3063] rounded-xl font-semibold text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Schedule Test Drive
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-[#E2D8C7] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#F5EFE6]">
                    <tr className="text-left text-xs font-semibold text-[#6B7A99] uppercase">
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2D8C7]">
                    {mockTestDrives.map(td => (
                      <tr key={td.id} className="hover:bg-[#F5EFE6]/50 transition-colors">
                        <td className="px-4 py-4"><div><p className="font-semibold text-sm text-[#1E3063]">{td.scheduledDate}</p><p className="text-xs text-[#6B7A99]">{td.scheduledTime}</p></div></td>
                        <td className="px-4 py-4"><div><p className="font-semibold text-sm text-[#1E3063]">{td.customerName}</p><p className="text-xs text-[#6B7A99]">{td.customerPhone}</p></div></td>
                        <td className="px-4 py-4"><div className="flex items-center gap-2"><img src={td.vehicleImage} alt="" className="w-10 h-10 rounded-lg object-cover" /><span className="text-sm text-[#1E3063] truncate max-w-[150px]">{td.vehicleTitle}</span></div></td>
                        <td className="px-4 py-4"><span className="text-sm text-[#1E3063]">{td.staffName}</span></td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 rounded-lg text-xs font-semibold ${td.status === 'Confirmed' ? 'bg-[#166534] text-white' : td.status === 'Completed' ? 'bg-[#1E3063] text-white' : td.status === 'Cancelled' ? 'bg-[#991B1B] text-white' : 'bg-[#00C9CE] text-[#1E3063]'}`}>{td.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INSPECTIONS WORKSPACE */}
          {activeView === 'inspections' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1E3063]">Inspection Management</h1>
                <p className="text-sm text-[#6B7A99]">Manage vehicle inspection requests and reports</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockInspections.map(insp => (
                  <div key={insp.id} className="bg-white rounded-2xl border border-[#E2D8C7] p-5">
                    <div className="flex gap-4">
                      <img src={insp.vehicleImage} alt="" className="w-24 h-20 rounded-xl object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-[#1E3063]">{insp.vehicleTitle}</h3>
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${insp.status === 'Completed' ? 'bg-[#166534] text-white' : insp.status === 'Booked' ? 'bg-[#00C9CE] text-[#1E3063]' : 'bg-[#991B1B] text-white'}`}>{insp.status}</span>
                        </div>
                        <p className="text-sm text-[#6B7A99] mt-1">Customer: {insp.customerName}</p>
                        <p className="text-xs text-[#6B7A99]">Requested: {insp.requestedAt}</p>
                        {insp.overallScore && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-2 bg-[#E2D8C7] rounded-full overflow-hidden">
                              <div className={`h-full ${insp.overallScore >= 80 ? 'bg-[#166534]' : insp.overallScore >= 60 ? 'bg-[#00C9CE]' : 'bg-[#991B1B]'}`} style={{ width: `${insp.overallScore}%` }} />
                            </div>
                            <span className="text-xs font-bold text-[#1E3063]">{insp.overallScore}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS WORKSPACE */}
          {activeView === 'notifications' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#1E3063]">Notifications</h1>
                  <p className="text-sm text-[#6B7A99]">Stay updated with important alerts</p>
                </div>
                <button onClick={() => showToast('All marked as read')} className="text-sm text-[#00C9CE] hover:underline">Mark all as read</button>
              </div>
              <div className="space-y-3">
                {mockNotifications.map(n => (
                  <div key={n.id} className={`bg-white rounded-2xl border p-4 ${n.isRead ? 'border-[#E2D8C7]' : 'border-l-4 border-l-[#00C9CE]'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${n.type === 'Sale' ? 'bg-[#166534]/10 text-[#166534]' : n.type === 'Enquiry' ? 'bg-[#00C9CE]/10 text-[#00C9CE]' : 'bg-[#991B1B]/10 text-[#991B1B]'}`}>
                        {n.type === 'Sale' && <TrendingUp className="w-5 h-5" />}
                        {n.type === 'Enquiry' && <MessageSquare className="w-5 h-5" />}
                        {n.type === 'Inspection' && <ClipboardList className="w-5 h-5" />}
                        {n.type === 'Finance' && <DollarSign className="w-5 h-5" />}
                        {n.type === 'Alert' && <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm text-[#1E3063]">{n.title}</h3>
                          <span className="text-[10px] text-[#6B7A99]">{n.createdAt}</span>
                        </div>
                        <p className="text-sm text-[#6B7A99] mt-1">{n.message}</p>
                      </div>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#00C9CE]" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBSCRIPTION WORKSPACE */}
          {activeView === 'subscription' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1E3063]">Subscription</h1>
                <p className="text-sm text-[#6B7A99]">Manage your plan and billing</p>
              </div>
              <div className="bg-gradient-to-r from-[#1E3063] to-[#121D33] rounded-2xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <span className="px-3 py-1 bg-[#00C9CE] text-[#1E3063] rounded-lg text-xs font-bold uppercase">{mockProfile.subscription.plan} Plan</span>
                    <h2 className="text-2xl font-bold mt-3">Enterprise Features</h2>
                    <p className="text-white/60 text-sm mt-1">Full access to all dealer tools</p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-white/60 text-sm">Renewal Date</p>
                    <p className="text-xl font-bold">{mockProfile.subscription.renewalDate}</p>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#166534] text-white rounded-lg text-xs font-semibold mt-2">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E2D8C7] p-6">
                <h3 className="font-bold text-[#1E3063] mb-4">Plan Usage</h3>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[#6B7A99]">Vehicle Listings</span>
                    <span className="text-sm font-semibold text-[#1E3063]">{mockProfile.subscription.listingsUsed} / {mockProfile.subscription.listingsLimit}</span>
                  </div>
                  <div className="h-3 bg-[#F5EFE6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00C9CE] rounded-full" style={{ width: `${(mockProfile.subscription.listingsUsed / mockProfile.subscription.listingsLimit) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PLACEHOLDER VIEWS */}
          {['finance', 'auctions', 'marketing', 'analytics', 'documents', 'reports'].includes(activeView) && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#F5EFE6] flex items-center justify-center mb-4">
                <BarChart3 className="w-10 h-10 text-[#1E3063]" />
              </div>
              <h2 className="text-xl font-bold text-[#1E3063] capitalize">{activeView} Center</h2>
              <p className="text-sm text-[#6B7A99] mt-2 max-w-md">This module is coming soon. Full integration with existing KAYAD features.</p>
              <button onClick={() => showToast(`${activeView} coming soon`)} className="mt-4 px-4 py-2 bg-[#00C9CE] text-[#1E3063] rounded-xl font-semibold text-sm">
                Coming Soon
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 px-4 py-3 bg-[#1E3063] text-white rounded-xl shadow-lg z-50">
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}
    </div>
  );
};

export default DealerBusinessCenter;
