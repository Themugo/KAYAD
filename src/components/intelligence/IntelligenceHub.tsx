import React, { useState, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Shield,
  ShieldCheck,
  BarChart3,
  Bell,
  Settings,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Zap,
  ShoppingCart,
  Building,
  User,
  Gavel,
  ClipboardCheck,
  Banknote,
  Headphones,
  Server,
  LayoutDashboard
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  HubUserRole,
  Alert,
  AlertSeverity,
  AlertCategory,
  ExecutiveKPI,
  CrossModuleInsight,
  ModuleDataSummary
} from '../../utils/intelligenceHub';
import {
  generateExecutiveKPIs,
  generateAlerts,
  generateCrossModuleInsights,
  generateModuleSummaries,
  getAlertSeverityColor,
  getModuleColor,
  canAccessModule,
  ROLE_ACCESS_CONFIG
} from '../../utils/intelligenceHub';

export interface IntelligenceHubProps {
  userRole?: HubUserRole;
  userId?: string;
  onNavigate?: (section: string) => void;
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void;
  onRefresh?: () => void;
}

// Module icons mapping
const MODULE_ICONS: Record<string, React.ReactNode> = {
  marketplace: <ShoppingCart className="w-4 h-4" />,
  dealer_network: <Building className="w-4 h-4" />,
  private_sellers: <User className="w-4 h-4" />,
  auctions: <Gavel className="w-4 h-4" />,
  inspection_marketplace: <ClipboardCheck className="w-4 h-4" />,
  escrow: <Shield className="w-4 h-4" />,
  financing: <Banknote className="w-4 h-4" />,
  support: <Headphones className="w-4 h-4" />,
  compliance_center: <ShieldCheck className="w-4 h-4" />,
  risk_monitoring: <AlertTriangle className="w-4 h-4" />,
  analytics: <BarChart3 className="w-4 h-4" />,
  notifications: <Bell className="w-4 h-4" />,
  administration: <Settings className="w-4 h-4" />,
};

// KPI Card Component
const KPICard: React.FC<{ kpi: ExecutiveKPI; compact?: boolean }> = ({ kpi, compact }) => (
  <Card className={`p-4 hover:shadow-md transition-shadow ${compact ? 'p-3' : ''}`}>
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs text-slate-500 font-medium">{kpi.label}</span>
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: getModuleColor(kpi.source) + '15', color: getModuleColor(kpi.source) }}
      >
        {MODULE_ICONS[kpi.source] || <Activity className="w-4 h-4" />}
      </div>
    </div>
    <div className="text-2xl font-black text-[#1E3063] mb-1">{kpi.formattedValue}</div>
    {kpi.change && (
      <div className={`flex items-center gap-1 text-xs font-bold ${
        kpi.trend === 'up' ? 'text-emerald-600' : 
        kpi.trend === 'down' ? 'text-red-600' : 
        'text-slate-500'
      }`}>
        {kpi.trend === 'up' && <TrendingUp className="w-3 h-3" />}
        {kpi.trend === 'down' && <TrendingDown className="w-3 h-3" />}
        {kpi.trend === 'stable' && <Minus className="w-3 h-3" />}
        {kpi.change}
      </div>
    )}
  </Card>
);

// Alert Card Component
const AlertCard: React.FC<{
  alert: Alert;
  onMarkRead?: (id: string) => void;
  onAction?: (alert: Alert) => void;
}> = ({ alert, onMarkRead, onAction }) => {
  const severityColor = getAlertSeverityColor(alert.severity);

  return (
    <div className={`p-4 rounded-xl border ${
      alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
      alert.severity === 'high' ? 'bg-orange-50 border-orange-200' :
      alert.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
      'bg-slate-50 border-slate-200'
    } ${!alert.isRead ? 'ring-2 ring-offset-1' : ''}`}
    style={!alert.isRead ? { ringColor: severityColor + '40' } : undefined}>
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: severityColor + '20', color: severityColor }}
        >
          {alert.severity === 'critical' || alert.severity === 'high' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-sm text-slate-900 truncate">{alert.title}</h4>
            {!alert.isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-600 mb-2">{alert.description}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge 
              size="sm"
              className="text-[10px]"
              style={{ backgroundColor: severityColor + '20', color: severityColor }}
            >
              {alert.severity}
            </Badge>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(alert.createdAt).toLocaleTimeString()}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              {MODULE_ICONS[alert.source]}
              {alert.source.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {alert.isActionable && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction?.(alert)}
              className="text-xs"
            >
              {alert.actionLabel || 'Action'}
            </Button>
          )}
          {!alert.isRead && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onMarkRead?.(alert.id)}
              className="text-xs"
            >
              Mark Read
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Cross-Module Insight Card
const InsightCard: React.FC<{ insight: CrossModuleInsight }> = ({ insight }) => (
  <Card className="p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-3 mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        insight.potentialImpact === 'high' ? 'bg-emerald-100 text-emerald-600' :
        insight.potentialImpact === 'medium' ? 'bg-amber-100 text-amber-600' :
        'bg-slate-100 text-slate-600'
      }`}>
        <Zap className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-sm text-[#1E3063] mb-1">{insight.title}</h4>
        <p className="text-xs text-slate-600">{insight.description}</p>
      </div>
    </div>
    <div className="p-3 bg-slate-50 rounded-lg mb-3">
      <p className="text-sm text-slate-700 font-medium">{insight.data}</p>
    </div>
    <div className="flex items-center gap-2 mb-3">
      {insight.modules.map((mod) => (
        <Badge 
          key={mod}
          size="sm"
          className="text-[10px]"
          style={{ backgroundColor: getModuleColor(mod) + '15', color: getModuleColor(mod) }}
        >
          {MODULE_ICONS[mod]}
          {mod.replace('_', ' ')}
        </Badge>
      ))}
    </div>
    <div className="border-t border-slate-100 pt-3">
      <p className="text-xs text-slate-500 mb-2">Recommendation:</p>
      <p className="text-sm text-slate-800 font-medium">{insight.recommendation}</p>
    </div>
  </Card>
);

// Module Status Card
const ModuleStatusCard: React.FC<{ module: ModuleDataSummary }> = ({ module }) => (
  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
    <div 
      className="w-10 h-10 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: getModuleColor(module.module) + '15', color: getModuleColor(module.module) }}
    >
      {MODULE_ICONS[module.module]}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-sm text-[#1E3063]">{module.displayName}</h4>
      <p className="text-xs text-slate-500">
        {module.recordCount.toLocaleString()} records • {new Date(module.lastSync).toLocaleTimeString()}
      </p>
    </div>
    <div className={`w-3 h-3 rounded-full ${
      module.status === 'connected' ? 'bg-emerald-500' :
      module.status === 'syncing' ? 'bg-amber-500 animate-pulse' :
      'bg-red-500'
    }`} />
  </div>
);

// Main Intelligence Hub Component
export const IntelligenceHub: React.FC<IntelligenceHubProps> = ({
  userRole = 'admin',
  userId,
  onNavigate,
  onExport,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [showInsights, setShowInsights] = useState(true);

  // Generate mock data
  const kpiPanel = useMemo(() => generateExecutiveKPIs(), []);
  const alerts = useMemo(() => generateAlerts(), []);
  const insights = useMemo(() => generateCrossModuleInsights(), []);
  const moduleSummaries = useMemo(() => generateModuleSummaries(), []);

  // Get role access config
  const roleConfig = ROLE_ACCESS_CONFIG[userRole];
  const isExecutive = roleConfig?.isExecutive || false;

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    
    if (severityFilter !== 'all') {
      filtered = filtered.filter(a => a.severity === severityFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a => 
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [alerts, severityFilter, searchQuery]);

  // Filter accessible modules
  const accessibleModules = useMemo(() => {
    return moduleSummaries.filter(m => canAccessModule(userRole, m.module));
  }, [userRole, moduleSummaries]);

  // Unread alerts count
  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
    onRefresh?.();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E3063] to-[#2a4080] flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1E3063]">Intelligence Hub</h2>
            <p className="text-sm text-slate-500">
              {isExecutive ? 'Executive Command Center' : 'Operational Dashboard'} • {roleConfig?.role.replace('_', ' ')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20 w-64"
            />
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {onExport && (
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Platform Status Banner */}
      <Card className={`p-4 border-2 ${
        kpiPanel.complianceStatus === 'green' ? 'bg-emerald-50 border-emerald-200' :
        kpiPanel.complianceStatus === 'yellow' ? 'bg-amber-50 border-amber-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-slate-800">
                Platform Health: <span className="text-emerald-600">{kpiPanel.platformHealth}%</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-slate-800">
                Compliance: <span className="text-emerald-600">{kpiPanel.complianceStatus.toUpperCase()}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${
                kpiPanel.riskLevel === 'low' ? 'text-emerald-600' :
                kpiPanel.riskLevel === 'medium' ? 'text-amber-600' :
                'text-red-600'
              }`} />
              <span className="text-sm font-bold text-slate-800">
                Risk Level: <span className={`${
                  kpiPanel.riskLevel === 'low' ? 'text-emerald-600' :
                  kpiPanel.riskLevel === 'medium' ? 'text-amber-600' :
                  'text-red-600'
                }`}>{kpiPanel.riskLevel.toUpperCase()}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="error" className="bg-red-100 text-red-700 border-red-200">
              {kpiPanel.criticalAlerts} Critical Alerts
            </Badge>
            <span className="text-xs text-slate-500">
              Updated: {new Date(kpiPanel.generatedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Executive KPIs Grid */}
      <div>
        <h3 className="text-lg font-bold text-[#1E3063] mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Executive KPIs
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {kpiPanel.kpis.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#1E3063] flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alert Center
              {unreadAlerts > 0 && (
                <Badge variant="error" size="sm" className="bg-red-100 text-red-700">
                  {unreadAlerts} new
                </Badge>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h4 className="font-bold text-slate-800">No Alerts</h4>
                <p className="text-sm text-slate-500">All clear! No alerts match your filters.</p>
              </Card>
            ) : (
              filteredAlerts.map(alert => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert}
                  onMarkRead={(id) => console.log('Mark read:', id)}
                  onAction={(a) => console.log('Action:', a)}
                />
              ))
            )}
          </div>
        </div>

        {/* Insights & Modules Column */}
        <div className="space-y-6">
          {/* Cross-Module Insights */}
          {showInsights && (
            <div>
              <button 
                onClick={() => setShowInsights(!showInsights)}
                className="flex items-center gap-2 mb-3 text-left w-full"
              >
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-[#1E3063] flex-1">Cross-Module Insights</h3>
                {showInsights ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {showInsights && (
                <div className="space-y-3">
                  {insights.map(insight => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Module Status */}
          <div>
            <h3 className="text-lg font-bold text-[#1E3063] mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" />
              Module Status
            </h3>
            <div className="space-y-2">
              {accessibleModules.map(module => (
                <ModuleStatusCard key={module.module} module={module} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Module Quick Access */}
      <Card className="p-5">
        <h3 className="text-lg font-bold text-[#1E3063] mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {accessibleModules.map(module => (
            <button
              key={module.module}
              onClick={() => onNavigate?.(module.module)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-[#1E3063]/30 hover:bg-slate-50 transition-all"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: getModuleColor(module.module) + '15', color: getModuleColor(module.module) }}
              >
                {MODULE_ICONS[module.module]}
              </div>
              <span className="text-xs font-medium text-slate-700 text-center">
                {module.displayName}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default IntelligenceHub;
