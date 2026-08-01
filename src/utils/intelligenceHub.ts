/**
 * Enterprise Marketplace Intelligence Hub
 * Central command center aggregating insights from all KAYAD modules
 */

import type { AuctionSession } from '../types';
import { 
  DashboardMetrics,
  generateDashboardMetrics,
  generateTimeSeriesData,
  TimeSeriesData,
  formatCurrency,
  formatNumber,
  formatPercent
} from './auctionAnalytics';
import type { 
  RiskItem 
} from './auctionRisk';
import type {
  ComplianceItem,
  ComplianceMetrics
} from './auctionCompliance';
import type {
  AuctionReadinessData
} from './auctionReadiness';

// ============================================================
// Module Source Definitions
// ============================================================

export type ModuleSource = 
  | 'marketplace'
  | 'dealer_network'
  | 'private_sellers'
  | 'auctions'
  | 'inspection_marketplace'
  | 'escrow'
  | 'financing'
  | 'support'
  | 'compliance_center'
  | 'risk_monitoring'
  | 'analytics'
  | 'notifications'
  | 'administration';

export interface ModuleContribution {
  module: ModuleSource;
  dataTypes: string[];
  lastUpdated: string;
  status: 'active' | 'inactive' | 'error';
}

// ============================================================
// Role Definitions
// ============================================================

export type HubUserRole = 
  | 'admin'
  | 'dealer'
  | 'private_seller'
  | 'auction_organizer'
  | 'mechanic'
  | 'financing_partner'
  | 'support_team'
  | 'compliance_officer'
  | 'executive';

export interface RoleAccess {
  role: HubUserRole;
  canView: ModuleSource[];
  canExport: boolean;
  canAlerts: boolean;
  isExecutive: boolean;
}

export const ROLE_ACCESS_CONFIG: Record<HubUserRole, RoleAccess> = {
  admin: {
    role: 'admin',
    canView: ['marketplace', 'dealer_network', 'private_sellers', 'auctions', 'inspection_marketplace', 'escrow', 'financing', 'support', 'compliance_center', 'risk_monitoring', 'analytics', 'notifications', 'administration'],
    canExport: true,
    canAlerts: true,
    isExecutive: false,
  },
  dealer: {
    role: 'dealer',
    canView: ['marketplace', 'auctions', 'inspection_marketplace', 'financing'],
    canExport: true,
    canAlerts: true,
    isExecutive: false,
  },
  private_seller: {
    role: 'private_seller',
    canView: ['marketplace', 'escrow'],
    canExport: false,
    canAlerts: true,
    isExecutive: false,
  },
  auction_organizer: {
    role: 'auction_organizer',
    canView: ['auctions', 'inspection_marketplace', 'compliance_center', 'risk_monitoring'],
    canExport: true,
    canAlerts: true,
    isExecutive: false,
  },
  mechanic: {
    role: 'mechanic',
    canView: ['inspection_marketplace'],
    canExport: true,
    canAlerts: true,
    isExecutive: false,
  },
  financing_partner: {
    role: 'financing_partner',
    canView: ['financing', 'marketplace'],
    canExport: true,
    canAlerts: true,
    isExecutive: false,
  },
  support_team: {
    role: 'support_team',
    canView: ['support', 'escrow', 'marketplace'],
    canExport: true,
    canAlerts: true,
    isExecutive: false,
  },
  compliance_officer: {
    role: 'compliance_officer',
    canView: ['compliance_center', 'risk_monitoring', 'support'],
    canExport: true,
    canAlerts: true,
    isExecutive: false,
  },
  executive: {
    role: 'executive',
    canView: ['marketplace', 'dealer_network', 'private_sellers', 'auctions', 'inspection_marketplace', 'escrow', 'financing', 'support', 'compliance_center', 'risk_monitoring', 'analytics', 'administration'],
    canExport: true,
    canAlerts: true,
    isExecutive: true,
  },
};

// ============================================================
// Executive KPIs
// ============================================================

export interface ExecutiveKPI {
  id: string;
  label: string;
  value: string | number;
  formattedValue: string;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  source: ModuleSource;
  category: 'activity' | 'revenue' | 'growth' | 'satisfaction' | 'compliance' | 'risk';
  lastUpdated: string;
}

export interface ExecutiveKPIPanel {
  kpis: ExecutiveKPI[];
  platformHealth: number;
  complianceStatus: 'green' | 'yellow' | 'red';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  criticalAlerts: number;
  generatedAt: string;
}

// ============================================================
// Alert Definitions
// ============================================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertCategory = 
  | 'risk'
  | 'compliance'
  | 'support'
  | 'escrow'
  | 'fraud'
  | 'system'
  | 'revenue'
  | 'operational';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: AlertCategory;
  source: ModuleSource;
  sourceId?: string;
  createdAt: string;
  isRead: boolean;
  isActionable: boolean;
  actionLabel?: string;
  actionUrl?: string;
  assignee?: string;
  dueDate?: string;
}

export interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unacknowledged: number;
}

// ============================================================
// Cross-Module Insights
// ============================================================

export interface CrossModuleInsight {
  id: string;
  title: string;
  description: string;
  data: string;
  modules: ModuleSource[];
  confidence: 'high' | 'medium' | 'low';
  potentialImpact: 'high' | 'medium' | 'low';
  recommendation: string;
  actionLabel?: string;
  createdAt: string;
}

// ============================================================
// Module Integration Data
// ============================================================

export interface ModuleDataSummary {
  module: ModuleSource;
  displayName: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'syncing';
  lastSync: string;
  recordCount: number;
  health: 'healthy' | 'warning' | 'error';
}

export interface ModuleMetrics {
  activeVehicles: number;
  vehiclesSold: number;
  liveAuctions: number;
  escrowTransactions: number;
  inspectionRequests: number;
  financeApplications: number;
  supportCases: number;
  complianceItems: number;
  riskAlerts: number;
}

// ============================================================
// Dealer KPIs
// ============================================================

export interface DealerKPI {
  inventoryCount: number;
  totalViews: number;
  watchlistAdds: number;
  financingRequests: number;
  inspectionRequests: number;
  vehiclesSold: number;
  revenue: number;
  rating: number;
  responseRate: number;
  avgResponseTime: string;
}

// ============================================================
// Auction Organizer KPIs
// ============================================================

export interface AuctionOrganizerKPI {
  upcomingAuctions: number;
  activeBids: number;
  completedAuctions: number;
  vehiclesSold: number;
  sellThroughRate: number;
  avgBiddersPerAuction: number;
  pendingPayments: number;
  settledAmount: number;
  buyerSatisfaction: number;
  activeViewings: number;
}

// ============================================================
// Mechanic KPIs
// ============================================================

export interface MechanicKPI {
  pendingInspections: number;
  completedInspections: number;
  scheduledAppointments: number;
  revenue: number;
  rating: number;
  avgCompletionTime: string;
  coverageAreas: number;
  reportsGenerated: number;
}

// ============================================================
// Support KPIs
// ============================================================

export interface SupportKPI {
  openCases: number;
  escalations: number;
  disputes: number;
  resolvedToday: number;
  avgResolutionTime: string;
  customerSatisfaction: number;
  pendingResponses: number;
  firstResponseTime: string;
}

// ============================================================
// Helper Functions
// ============================================================

export function generateExecutiveKPIs(): ExecutiveKPIPanel {
  const kpis: ExecutiveKPI[] = [
    {
      id: 'active-vehicles',
      label: 'Active Vehicles',
      value: 2347,
      formattedValue: formatNumber(2347),
      change: '+12%',
      trend: 'up',
      source: 'marketplace',
      category: 'activity',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'vehicles-sold',
      label: 'Vehicles Sold',
      value: 1234,
      formattedValue: formatNumber(1234),
      change: '+8.3%',
      trend: 'up',
      source: 'marketplace',
      category: 'activity',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'live-auctions',
      label: 'Live Auctions',
      value: 156,
      formattedValue: formatNumber(156),
      change: '+5.2%',
      trend: 'up',
      source: 'auctions',
      category: 'activity',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'escrow-transactions',
      label: 'Escrow Transactions',
      value: 892,
      formattedValue: formatNumber(892),
      change: '+15.4%',
      trend: 'up',
      source: 'escrow',
      category: 'activity',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'inspection-requests',
      label: 'Inspection Requests',
      value: 456,
      formattedValue: formatNumber(456),
      change: '+22.1%',
      trend: 'up',
      source: 'inspection_marketplace',
      category: 'activity',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'finance-applications',
      label: 'Finance Applications',
      value: 234,
      formattedValue: formatNumber(234),
      change: '+18.7%',
      trend: 'up',
      source: 'financing',
      category: 'activity',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'platform-revenue',
      label: 'Total Revenue',
      value: 456789000,
      formattedValue: formatCurrency(456789000),
      change: '+12.5%',
      trend: 'up',
      source: 'analytics',
      category: 'revenue',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'marketplace-growth',
      label: 'Marketplace Growth',
      value: 28.5,
      formattedValue: '+28.5%',
      change: '+5.2%',
      trend: 'up',
      source: 'analytics',
      category: 'growth',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'customer-satisfaction',
      label: 'Customer Satisfaction',
      value: 94.2,
      formattedValue: '94.2%',
      change: '+2.1%',
      trend: 'up',
      source: 'support',
      category: 'satisfaction',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'compliance-rate',
      label: 'Compliance Rate',
      value: 98.7,
      formattedValue: '98.7%',
      change: '+0.5%',
      trend: 'up',
      source: 'compliance_center',
      category: 'compliance',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'critical-alerts',
      label: 'Critical Alerts',
      value: 3,
      formattedValue: '3',
      change: '-2',
      trend: 'down',
      source: 'risk_monitoring',
      category: 'risk',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'platform-availability',
      label: 'Platform Availability',
      value: 99.98,
      formattedValue: '99.98%',
      change: '+0.01%',
      trend: 'stable',
      source: 'administration',
      category: 'activity',
      lastUpdated: new Date().toISOString(),
    },
  ];

  return {
    kpis,
    platformHealth: 98.5,
    complianceStatus: 'green',
    riskLevel: 'low',
    criticalAlerts: 3,
    generatedAt: new Date().toISOString(),
  };
}

export function generateAlerts(): Alert[] {
  return [
    {
      id: 'alert-001',
      title: 'High-Risk Auction Configuration',
      description: 'Auction AUC-2026-8801 has missing payment details',
      severity: 'high',
      category: 'risk',
      source: 'risk_monitoring',
      sourceId: 'AUC-2026-8801',
      createdAt: new Date().toISOString(),
      isRead: false,
      isActionable: true,
      actionLabel: 'Review Auction',
      actionUrl: '/auction/AUC-2026-8801',
      assignee: 'Compliance Team',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-002',
      title: 'License Expiring Soon',
      description: 'Crown Motors dealer license expires in 14 days',
      severity: 'medium',
      category: 'compliance',
      source: 'compliance_center',
      sourceId: 'org-crown',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isActionable: true,
      actionLabel: 'Contact Dealer',
    },
    {
      id: 'alert-003',
      title: 'Escrow Dispute Opened',
      description: 'Dispute opened for transaction TXN-2026-4521',
      severity: 'high',
      category: 'escrow',
      source: 'escrow',
      sourceId: 'TXN-2026-4521',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isActionable: true,
      actionLabel: 'View Dispute',
    },
    {
      id: 'alert-004',
      title: 'Support Response SLA Breach',
      description: 'Ticket #4521 overdue by 2 hours',
      severity: 'medium',
      category: 'support',
      source: 'support',
      sourceId: 'TKT-4521',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      isActionable: true,
      actionLabel: 'Respond Now',
    },
    {
      id: 'alert-005',
      title: 'Inspection Report Delayed',
      description: 'Report for booking #2345 is 24 hours overdue',
      severity: 'low',
      category: 'operational',
      source: 'inspection_marketplace',
      sourceId: 'BOOK-2345',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isActionable: true,
      actionLabel: 'Check Status',
    },
  ];
}

export function generateCrossModuleInsights(): CrossModuleInsight[] {
  return [
    {
      id: 'insight-001',
      title: 'Inspection Impact on Enquiries',
      description: 'Vehicles with inspections receive significantly more enquiries',
      data: 'Vehicles with inspection reports receive 45% more enquiries than those without',
      modules: ['marketplace', 'inspection_marketplace'],
      confidence: 'high',
      potentialImpact: 'high',
      recommendation: 'Encourage all sellers to add inspection reports to their listings',
      actionLabel: 'View Details',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'insight-002',
      title: 'Verified Dealer Conversion',
      description: 'Verified dealers achieve higher buyer conversion rates',
      data: 'Verified dealers convert at 23% higher rate than unverified sellers',
      modules: ['dealer_network', 'marketplace'],
      confidence: 'high',
      potentialImpact: 'medium',
      recommendation: 'Promote dealer verification program',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'insight-003',
      title: 'Escrow Reduces Disputes',
      description: 'Transactions using escrow have 67% fewer disputes',
      data: 'Escrow transactions: 1.2% dispute rate vs 3.6% for direct payments',
      modules: ['escrow', 'support'],
      confidence: 'high',
      potentialImpact: 'high',
      recommendation: 'Promote escrow usage for high-value transactions',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'insight-004',
      title: 'Viewing Day Impact',
      description: 'Auctions with scheduled viewing days attract more bidders',
      data: 'Auctions with viewing days: 12.3 avg bidders vs 7.8 for those without',
      modules: ['auctions', 'analytics'],
      confidence: 'high',
      potentialImpact: 'medium',
      recommendation: 'Require viewing schedule for auctions above Ksh 1M',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'insight-005',
      title: 'Finance-Enabled Listings',
      description: 'Listings with financing options sell 34% faster',
      data: 'Average days to sale: 4.2 with finance vs 6.4 without',
      modules: ['financing', 'marketplace'],
      confidence: 'medium',
      potentialImpact: 'medium',
      recommendation: 'Partner with more financing providers',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function generateModuleSummaries(): ModuleDataSummary[] {
  return [
    { module: 'marketplace', displayName: 'Marketplace', icon: 'shopping-cart', status: 'connected', lastSync: new Date().toISOString(), recordCount: 45678, health: 'healthy' },
    { module: 'dealer_network', displayName: 'Dealer Network', icon: 'building', status: 'connected', lastSync: new Date().toISOString(), recordCount: 1234, health: 'healthy' },
    { module: 'private_sellers', displayName: 'Private Sellers', icon: 'user', status: 'connected', lastSync: new Date().toISOString(), recordCount: 5678, health: 'healthy' },
    { module: 'auctions', displayName: 'Auctions', icon: 'gavel', status: 'connected', lastSync: new Date().toISOString(), recordCount: 2345, health: 'healthy' },
    { module: 'inspection_marketplace', displayName: 'Inspection Marketplace', icon: 'clipboard-check', status: 'connected', lastSync: new Date().toISOString(), recordCount: 3456, health: 'healthy' },
    { module: 'escrow', displayName: 'Escrow', icon: 'shield', status: 'connected', lastSync: new Date().toISOString(), recordCount: 1234, health: 'healthy' },
    { module: 'financing', displayName: 'Financing', icon: 'banknote', status: 'connected', lastSync: new Date().toISOString(), recordCount: 567, health: 'healthy' },
    { module: 'support', displayName: 'Support', icon: 'headphones', status: 'connected', lastSync: new Date().toISOString(), recordCount: 8901, health: 'healthy' },
    { module: 'compliance_center', displayName: 'Compliance Center', icon: 'shield-check', status: 'connected', lastSync: new Date().toISOString(), recordCount: 456, health: 'healthy' },
    { module: 'risk_monitoring', displayName: 'Risk Monitoring', icon: 'alert-triangle', status: 'connected', lastSync: new Date().toISOString(), recordCount: 234, health: 'healthy' },
    { module: 'analytics', displayName: 'Analytics', icon: 'bar-chart', status: 'connected', lastSync: new Date().toISOString(), recordCount: 67890, health: 'healthy' },
    { module: 'notifications', displayName: 'Notifications', icon: 'bell', status: 'connected', lastSync: new Date().toISOString(), recordCount: 123456, health: 'healthy' },
    { module: 'administration', displayName: 'Administration', icon: 'settings', status: 'connected', lastSync: new Date().toISOString(), recordCount: 1234, health: 'healthy' },
  ];
}

export function getAlertSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical': return '#DC2626';
    case 'high': return '#EA580C';
    case 'medium': return '#D97706';
    case 'low': return '#0891B2';
    case 'info': return '#6B7280';
  }
}

export function getAlertCategoryIcon(category: AlertCategory): string {
  switch (category) {
    case 'risk': return 'alert-triangle';
    case 'compliance': return 'shield';
    case 'support': return 'headphones';
    case 'escrow': return 'shield-check';
    case 'fraud': return 'alert-octagon';
    case 'system': return 'server';
    case 'revenue': return 'banknote';
    case 'operational': return 'activity';
  }
}

export function canAccessModule(role: HubUserRole, module: ModuleSource): boolean {
  return ROLE_ACCESS_CONFIG[role]?.canView.includes(module) || false;
}

export function getModuleColor(module: ModuleSource): string {
  const colors: Record<ModuleSource, string> = {
    marketplace: '#6366F1',
    dealer_network: '#8B5CF6',
    private_sellers: '#EC4899',
    auctions: '#F59E0B',
    inspection_marketplace: '#14B8A6',
    escrow: '#10B981',
    financing: '#3B82F6',
    support: '#EF4444',
    compliance_center: '#84CC16',
    risk_monitoring: '#F97316',
    analytics: '#06B6D4',
    notifications: '#A855F7',
    administration: '#6B7280',
  };
  return colors[module] || '#6B7280';
}

export default {
  ROLE_ACCESS_CONFIG,
  generateExecutiveKPIs,
  generateAlerts,
  generateCrossModuleInsights,
  generateModuleSummaries,
  getAlertSeverityColor,
  getAlertCategoryIcon,
  canAccessModule,
  getModuleColor,
};
