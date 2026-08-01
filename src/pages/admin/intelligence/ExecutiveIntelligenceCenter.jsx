import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Car, Gavel, DollarSign,
  ClipboardCheck, Megaphone, Heart, Globe, Target, Brain, FileText,
  Download, RefreshCw, Search, ChevronRight, ArrowUp, ArrowDown,
  AlertTriangle, Lightbulb, Calendar, Filter, Eye, PieChart,
  ArrowRight, CheckCircle
} from 'lucide-react';
import * as intelApi from '../../../services/intelligenceApi';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
  mutedOrange: '#FB923C',
  mutedCrimson: '#EF4444',
  purple: '#8B5CF6',
};

const modules = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3, color: colors.navy },
  { id: 'marketplace', label: 'Marketplace', icon: Car, color: colors.emerald },
  { id: 'dealers', label: 'Dealers', icon: Users, color: colors.terracotta },
  { id: 'auctions', label: 'Auctions', icon: Gavel, color: colors.purple },
  { id: 'finance', label: 'Finance', icon: DollarSign, color: colors.softBlue },
  { id: 'inspections', label: 'Inspections', icon: ClipboardCheck, color: colors.mutedOrange },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, color: colors.navy },
  { id: 'customers', label: 'Customers', icon: Heart, color: colors.emerald },
  { id: 'countries', label: 'Countries', icon: Globe, color: colors.terracotta },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp, color: colors.purple },
  { id: 'forecasting', label: 'Forecasting', icon: Target, color: colors.softBlue },
  { id: 'insights', label: 'AI Insights', icon: Brain, color: '#FBBF24' },
  { id: 'reports', label: 'Reports', icon: FileText, color: colors.navy },
  { id: 'query', label: 'Self-Service', icon: Search, color: colors.emerald },
];

function formatCurrency(value) {
  if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value?.toLocaleString() || '0';
}

function formatNumber(value) {
  return value?.toLocaleString() || '0';
}

export default function ExecutiveIntelligenceCenter() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [marketplace, setMarketplace] = useState(null);
  const [dealers, setDealers] = useState(null);
  const [auctions, setAuctions] = useState(null);
  const [finance, setFinance] = useState(null);
  const [inspections, setInspections] = useState(null);
  const [marketing, setMarketing] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [countries, setCountries] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [forecasts, setForecasts] = useState(null);
  const [insights, setInsights] = useState([]);
  const [benchmarks, setBenchmarks] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const { data: dashData } = await intelApi.getExecutiveDashboard();
      setDashboard(dashData.data);
      
      const { data: mktData } = await intelApi.getMarketplaceIntelligence();
      setMarketplace(mktData.data);
      
      const { data: dealData } = await intelApi.getDealerIntelligence();
      setDealers(dealData.data);
      
      const { data: aucData } = await intelApi.getAuctionIntelligence();
      setAuctions(aucData.data);
      
      const { data: finData } = await intelApi.getFinanceIntelligence();
      setFinance(finData.data);
      
      const { data: insData } = await intelApi.getInspectionIntelligence();
      setInspections(insData.data);
      
      const { data: mktIntelData } = await intelApi.getMarketingIntelligence();
      setMarketing(mktIntelData.data);
      
      const { data: custData } = await intelApi.getCustomerIntelligence();
      setCustomers(custData.data);
      
      const { data: countryData } = await intelApi.getCountryIntelligence();
      setCountries(countryData.data);
      
      const { data: revData } = await intelApi.getRevenueIntelligence();
      setRevenue(revData.data);
      
      const { data: foreData } = await intelApi.getForecasts();
      setForecasts(foreData.data);
      
      const { data: insightData } = await intelApi.getAIInsights();
      setInsights(insightData.data);
      
      const { data: benchData } = await intelApi.getBenchmarks();
      setBenchmarks(benchData.data);
      
      const { data: reportData } = await intelApi.getReports();
      setReports(reportData.data);
    } catch (error) {
      console.error('Failed to load intelligence data:', error);
      // Use mock data
      setDashboard({
        kpis: {
          revenueToday: { value: 45890000, change: 12.5, trend: 'up' },
          revenueMonth: { value: 892450000, change: 8.3, trend: 'up' },
          vehiclesListed: { value: 1245, change: 15.2, trend: 'up' },
          vehiclesSold: { value: 89, change: 5.8, trend: 'up' },
          activeDealers: { value: 456, change: 7.1, trend: 'up' },
          customerSatisfaction: { value: 94.2, change: 1.5, trend: 'up' },
        },
      });
      setInsights([
        { type: 'opportunity', title: 'SUV Market Growing', description: 'SUV searches up 45% MoM', impact: 'high' },
        { type: 'risk', title: 'Inspection Gap', description: 'Mombasa needs more inspectors', impact: 'high' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    try {
      const { data } = await intelApi.queryIntelligence(query);
      setQueryResult(data.data);
    } catch (error) {
      console.error('Query failed:', error);
    }
  };

  // ============================================
  // EXECUTIVE DASHBOARD
  // ============================================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Executive Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Last updated: Just now</span>
          <button onClick={loadAllData} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Revenue Today', kpi: dashboard?.kpis?.revenueToday, format: 'currency' },
          { label: 'Revenue Month', kpi: dashboard?.kpis?.revenueMonth, format: 'currency' },
          { label: 'Vehicles Listed', kpi: dashboard?.kpis?.vehiclesListed, format: 'number' },
          { label: 'Vehicles Sold', kpi: dashboard?.kpis?.vehiclesSold, format: 'number' },
          { label: 'Active Dealers', kpi: dashboard?.kpis?.activeDealers, format: 'number' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-2">{item.label}</p>
            <p className="text-2xl font-bold text-slate-800">
              {item.format === 'currency' ? formatCurrency(item.kpi?.value) : formatNumber(item.kpi?.value)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {item.kpi?.trend === 'up' ? (
                <ArrowUp size={14} className="text-emerald-500" />
              ) : (
                <ArrowDown size={14} className="text-red-500" />
              )}
              <span className={`text-sm ${item.kpi?.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {item.kpi?.change}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Quick Insights</h3>
          <div className="space-y-3">
            {dashboard?.quickInsights?.map((insight, i) => (
              <div key={i} className={`p-4 rounded-lg flex items-start gap-3 ${
                insight.type === 'opportunity' ? 'bg-emerald-50' :
                insight.type === 'alert' ? 'bg-amber-50' : 'bg-blue-50'
              }`}>
                {insight.type === 'opportunity' && <Lightbulb size={20} className="text-emerald-600" />}
                {insight.type === 'alert' && <AlertTriangle size={20} className="text-amber-600" />}
                {insight.type === 'trend' && <TrendingUp size={20} className="text-blue-600" />}
                <p className="text-sm text-slate-700">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">AI Insights</h3>
          <div className="space-y-3">
            {insights.slice(0, 3).map((insight, i) => (
              <div key={i} className={`p-3 rounded-lg ${
                insight.impact === 'high' ? 'bg-red-50' : 'bg-slate-50'
              }`}>
                <p className="text-sm font-medium text-slate-800">{insight.title}</p>
                <p className="text-xs text-slate-500 mt-1">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Revenue Trend</h3>
        <div className="flex items-end gap-2 h-40">
          {[234, 267, 256, 312, 298].map((value, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-[#17244B] rounded-t"
                style={{ height: `${(value / 320) * 100}%` }}
              />
              <p className="text-xs text-slate-500 mt-2">{
                ['Sep', 'Oct', 'Nov', 'Dec', 'Jan'][i]
              }</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // MARKETPLACE INTELLIGENCE
  // ============================================

  const renderMarketplace = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Marketplace Intelligence</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Total Listings</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(marketplace?.overview?.totalListings)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Active Listings</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(marketplace?.overview?.activeListings)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Avg Days to Sell</p>
          <p className="text-2xl font-bold text-slate-800">{marketplace?.overview?.avgDaysToSell}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Conversion Rate</p>
          <p className="text-2xl font-bold text-slate-800">{marketplace?.overview?.conversionRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Searches */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Top Searches</h3>
          <div className="space-y-2">
            {marketplace?.topSearches?.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm text-slate-700">{item.term}</span>
                <span className="text-sm text-slate-500">{formatNumber(item.count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Brands */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Top Brands</h3>
          <div className="space-y-3">
            {marketplace?.topBrands?.slice(0, 5).map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700">{item.brand}</span>
                  <span className="text-sm text-slate-500">{item.share}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-[#17244B] h-2 rounded-full" style={{ width: `${item.share * 3}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Most Viewed */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Most Viewed Vehicles</h3>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Vehicle</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Views</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Leads</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {marketplace?.mostViewed?.map((item, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-sm text-slate-700">{item.vehicle}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(item.views)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{item.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // DEALER INTELLIGENCE
  // ============================================

  const renderDealers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dealer Intelligence</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Total Dealers</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(dealers?.overview?.totalDealers)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Verified</p>
          <p className="text-2xl font-bold text-emerald-600">{formatNumber(dealers?.overview?.verifiedDealers)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Avg Rating</p>
          <p className="text-2xl font-bold text-slate-800">{dealers?.overview?.avgRating}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Avg Response Time</p>
          <p className="text-2xl font-bold text-slate-800">{dealers?.overview?.avgResponseTime}</p>
        </div>
      </div>

      {/* Top Dealers */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Top Performing Dealers</h3>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Dealer</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Sales</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Revenue</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Rating</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dealers?.topDealers?.map((dealer, i) => (
              <tr key={i}>
                <td className="px-4 py-3 font-medium text-slate-700">{dealer.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{dealer.sales}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatCurrency(dealer.revenue)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-amber-500">★</span> {dealer.rating}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    dealer.status === 'excellent' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {dealer.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dealer Health */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Dealer Health Distribution</h3>
        <div className="flex gap-4">
          {dealers?.dealerHealthScores?.map((score, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${score.color}20` }}>
                <span className="text-xl font-bold" style={{ color: score.color }}>{score.count}</span>
              </div>
              <p className="text-sm text-slate-600">{score.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // AUCTION INTELLIGENCE
  // ============================================

  const renderAuctions = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Auction Intelligence</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Active Auctions</p>
          <p className="text-2xl font-bold text-slate-800">{auctions?.overview?.activeAuctions}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Total Bidders</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(auctions?.overview?.totalBidders)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Avg Bid Count</p>
          <p className="text-2xl font-bold text-slate-800">{auctions?.overview?.avgBidCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Success Rate</p>
          <p className="text-2xl font-bold text-emerald-600">{auctions?.overview?.successRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Auction Trends</h3>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Month</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Auctions</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auctions?.auctionTrends?.map((row, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-sm text-slate-700">{row.month}</td>
                  <td className="px-4 py-2 text-sm text-slate-600 text-right">{row.auctions}</td>
                  <td className="px-4 py-2 text-sm text-slate-600 text-right">{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Regional Performance</h3>
          <div className="space-y-3">
            {auctions?.regionalPerformance?.map((region, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-slate-700">{region.region}</span>
                  <span className="text-sm text-slate-500">{formatCurrency(region.revenue)}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-[#17244B] h-2 rounded-full" style={{ width: `${(region.revenue / 60000000) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // FINANCE INTELLIGENCE
  // ============================================

  const renderFinance = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Finance Intelligence</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Applications</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(finance?.overview?.applications)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="text-2xl font-bold text-emerald-600">{formatNumber(finance?.overview?.approved)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Approval Rate</p>
          <p className="text-2xl font-bold text-slate-800">{finance?.overview?.approvalRate}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Avg Loan Amount</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(finance?.overview?.avgLoanAmount)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Top Banks</h3>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Bank</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Applications</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Approved</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {finance?.topBanks?.map((bank, i) => (
              <tr key={i}>
                <td className="px-4 py-3 font-medium text-slate-700">{bank.bank}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{bank.applications}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{bank.approved}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    bank.approvalRate >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {bank.approvalRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // INSPECTION INTELLIGENCE
  // ============================================

  const renderInspections = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Inspection Intelligence</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Requests</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(inspections?.overview?.requests)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{formatNumber(inspections?.overview?.completed)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Pass Rate</p>
          <p className="text-2xl font-bold text-slate-800">{inspections?.overview?.passRate}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Avg Time</p>
          <p className="text-2xl font-bold text-slate-800">{inspections?.overview?.avgCompletionTime}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Failure Categories</h3>
          <div className="space-y-2">
            {inspections?.failureCategories?.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm text-slate-700">{cat.category}</span>
                <span className="text-sm text-slate-500">{cat.count} ({cat.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Regional Coverage</h3>
          <div className="space-y-3">
            {inspections?.regionalCoverage?.map((region, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-slate-700">{region.region}</span>
                  <span className="text-sm text-slate-500">{region.coverage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ 
                    width: `${region.coverage}%`,
                    backgroundColor: region.coverage >= 80 ? colors.emerald : region.coverage >= 60 ? colors.softBlue : colors.mutedOrange
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // REVENUE INTELLIGENCE
  // ============================================

  const renderRevenue = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Revenue Intelligence</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(revenue?.summary?.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">This Month</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(revenue?.summary?.thisMonth)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Today</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(revenue?.summary?.today)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">This Year</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(revenue?.summary?.thisYear)}</p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Revenue Breakdown</h3>
        <div className="space-y-3">
          {revenue?.revenueBreakdown?.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-700">{item.category}</span>
                <span className="text-sm text-slate-500">{formatCurrency(item.amount)} ({item.percentage}%)</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-[#17244B] h-2 rounded-full" style={{ width: `${item.percentage * 3}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // FORECASTING
  // ============================================

  const renderForecasting = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Forecasting</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#17244B] to-[#2a3a6e] rounded-xl p-5 text-white">
          <p className="text-sm opacity-80 mb-2">Revenue Forecast</p>
          <p className="text-2xl font-bold">{formatCurrency(forecasts?.revenue?.prediction)}</p>
          <p className="text-sm opacity-70 mt-2">Confidence: {(forecasts?.revenue?.confidence * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Dealer Growth</p>
          <p className="text-2xl font-bold text-slate-800">{forecasts?.dealerGrowth?.prediction}</p>
          <p className="text-sm text-emerald-600">+{forecasts?.dealerGrowth?.growth}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Vehicle Volume</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(forecasts?.vehicleVolume?.prediction)}</p>
          <p className="text-sm text-emerald-600">+{forecasts?.vehicleVolume?.growth}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Finance Demand</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(forecasts?.financeDemand?.prediction)}</p>
          <p className="text-sm text-emerald-600">+{forecasts?.financeDemand?.growth}%</p>
        </div>
      </div>

      {/* Scenarios */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Revenue Scenarios</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-600 mb-2">Optimistic</p>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(forecasts?.scenarios?.optimistic?.revenue)}</p>
            <p className="text-xs text-emerald-600 mt-1">25% probability</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-sm text-blue-600 mb-2">Baseline</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(forecasts?.scenarios?.baseline?.revenue)}</p>
            <p className="text-xs text-blue-600 mt-1">55% probability</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Conservative</p>
            <p className="text-xl font-bold text-slate-700">{formatCurrency(forecasts?.scenarios?.conservative?.revenue)}</p>
            <p className="text-xs text-slate-600 mt-1">20% probability</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // AI INSIGHTS
  // ============================================

  const renderInsights = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">AI Insights</h2>

      <div className="grid grid-cols-2 gap-4">
        {insights.map((insight, i) => (
          <div key={i} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${
            insight.type === 'opportunity' ? 'border-emerald-500' :
            insight.type === 'risk' ? 'border-red-500' :
            insight.type === 'trend' ? 'border-blue-500' :
            'border-amber-500'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {insight.type === 'opportunity' && <Lightbulb size={20} className="text-emerald-600" />}
                {insight.type === 'risk' && <AlertTriangle size={20} className="text-red-600" />}
                {insight.type === 'trend' && <TrendingUp size={20} className="text-blue-600" />}
                <span className="font-semibold text-slate-800">{insight.title}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                insight.impact === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {insight.impact} impact
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-3">{insight.description}</p>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded">
              <CheckCircle size={16} className="text-emerald-600" />
              <span className="text-sm text-slate-700">{insight.recommendation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // REPORTS
  // ============================================

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Executive Reports</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Download size={18} />
          Generate Report
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Report</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Generated</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{report.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600 capitalize">{report.type}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{new Date(report.lastGenerated).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button className="flex items-center gap-1 text-sm text-[#17244B] font-medium hover:underline ml-auto">
                    <Download size={16} /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Export Options</h3>
        <div className="flex gap-3">
          {['PDF', 'Excel', 'CSV', 'PowerPoint'].map((format) => (
            <button key={format} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              {format}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // SELF-SERVICE QUERY
  // ============================================

  const renderQuery = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Self-Service Analytics</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Ask a Question</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
            placeholder="e.g., Show dealer growth in Nairobi, Compare Toyota vs Subaru sales"
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
          />
          <button
            onClick={handleQuery}
            className="px-6 py-3 bg-[#17244B] text-white rounded-xl hover:bg-[#1e3054]"
          >
            <Search size={20} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            'Show dealer growth in Nairobi',
            'Compare Toyota vs Subaru sales',
            'Average selling price of SUVs',
            'Which counties need more inspectors?',
          ].map((suggestion, i) => (
            <button
              key={i}
              onClick={() => setQuery(suggestion)}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm hover:bg-slate-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {queryResult && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Results for: "{queryResult.query}"</h3>
          
          {queryResult.data?.response && (
            <p className="text-slate-700">{queryResult.data.response}</p>
          )}

          {queryResult.insights && (
            <div className="mt-4">
              <h4 className="font-medium text-slate-800 mb-2">Insights:</h4>
              <ul className="space-y-1">
                {queryResult.insights.map((insight, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'marketplace': return renderMarketplace();
      case 'dealers': return renderDealers();
      case 'auctions': return renderAuctions();
      case 'finance': return renderFinance();
      case 'inspections': return renderInspections();
      case 'marketing': return renderMarketing();
      case 'customers': return renderCustomers();
      case 'countries': return renderCountries();
      case 'revenue': return renderRevenue();
      case 'forecasting': return renderForecasting();
      case 'insights': return renderInsights();
      case 'reports': return renderReports();
      case 'query': return renderQuery();
      default: return renderDashboard();
    }
  };

  const renderMarketing = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Marketing Intelligence</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Total Visits</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(marketing?.overview?.totalVisits)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Unique Visitors</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(marketing?.overview?.uniqueVisitors)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Bounce Rate</p>
          <p className="text-2xl font-bold text-slate-800">{marketing?.overview?.bounceRate}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Avg Session</p>
          <p className="text-2xl font-bold text-slate-800">{marketing?.overview?.avgSessionDuration}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Traffic Sources</h3>
        <div className="space-y-2">
          {marketing?.trafficSources?.map((source, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <span className="text-sm text-slate-700">{source.source}</span>
              <span className="text-sm text-slate-500">{formatNumber(source.visits)} ({source.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Customer Intelligence</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Total Buyers</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(customers?.overview?.totalBuyers)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Active Buyers</p>
          <p className="text-2xl font-bold text-slate-800">{formatNumber(customers?.overview?.activeBuyers)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Avg Lifetime Value</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(customers?.overview?.avgLifetimeValue)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Retention Rate</p>
          <p className="text-2xl font-bold text-emerald-600">{customers?.overview?.retentionRate}%</p>
        </div>
      </div>
    </div>
  );

  const renderCountries = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Country Intelligence</h2>
      <div className="grid grid-cols-3 gap-4">
        {countries?.countries?.map((country, i) => (
          <div key={i} className={`bg-white rounded-xl p-5 shadow-sm border ${
            country.status === 'active' ? 'border-emerald-200' : 'border-amber-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{country.name}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                country.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {country.status}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Revenue</span>
                <span className="font-medium">{formatCurrency(country.metrics?.revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Dealers</span>
                <span className="font-medium">{country.metrics?.dealers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Vehicles</span>
                <span className="font-medium">{formatNumber(country.metrics?.vehicles)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Growth</span>
                <span className="font-medium text-emerald-600">+{country.growth?.revenue}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17244B] to-[#2a3a6e] flex items-center justify-center">
                  <BarChart3 size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Executive Intelligence Center</h1>
                  <p className="text-xs text-slate-500">Business Intelligence Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                Live Data
              </div>
              <button onClick={loadAllData} className="p-2 hover:bg-slate-100 rounded-lg">
                <RefreshCw size={20} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive ? 'bg-[#17244B] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{mod.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
