import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Car, Users, TrendingUp, TrendingDown, DollarSign,
  Eye, MessageSquare, Phone, Calendar, ShoppingCart, Target, Clock,
  AlertCircle, CheckCircle2, Star, ArrowRight, Plus, Filter,
  MoreVertical, ChevronDown, ChevronRight, Zap, Bot, BarChart3,
  PieChart, Activity, Users as TeamIcon, ShoppingBag, Bell,
  Settings, FileText, Send, RefreshCw, ArrowUpRight, ArrowDownRight,
  UserPlus, Shield, Award, CreditCard, CalendarCheck, ClipboardCheck,
  Gavel, X, Loader2, TrendingUp,
} from 'lucide-react';
import * as dealerApi from '../../services/dealerPlatformApi';

// ============================================================
// DESIGN TOKENS
// ============================================================

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
  amber: '#F59E0B',
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Stat Card */
const StatCard = ({ title, value, change, icon: Icon, color = colors.navy }) => (
  <div className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

/** Lead Pipeline Stage */
const PipelineStage = ({ stage, count, value, color }) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
      <span className="font-medium text-slate-700">{stage}</span>
    </div>
    <div className="text-right">
      <p className="font-bold text-slate-800">{count}</p>
    </div>
  </div>
);

/** Quick Action Button */
const QuickAction = ({ icon: Icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed ${color} hover:bg-opacity-10 transition-all`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
      <Icon className="w-6 h-6" style={{ color }} />
    </div>
    <span className="text-sm font-medium text-slate-700">{label}</span>
  </button>
);

/** Activity Item */
const ActivityItem = ({ type, message, time, icon: Icon }) => {
  const typeColors = {
    lead: colors.emerald,
    view: colors.softBlue,
    sale: colors.navy,
    listing: colors.purple,
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${typeColors[type]}20` }}>
        <Icon className="w-4 h-4" style={{ color: typeColors[type] }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">{message}</p>
        <p className="text-xs text-slate-400 mt-1">{time}</p>
      </div>
    </div>
  );
};

/** Top Vehicle Card */
const TopVehicle = ({ vehicle, rank }) => (
  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100">
    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
      {rank}
    </div>
    <div className="w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0">
      <Car className="w-6 h-6 text-slate-400 m-auto" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-slate-800 truncate">{vehicle.title}</p>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{vehicle.views}</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{vehicle.leads}</span>
      </div>
    </div>
    <div className="text-right">
      <p className="font-bold text-slate-800">Ksh {(vehicle.price / 1000000).toFixed(1)}M</p>
    </div>
  </div>
);

/** AI Copilot */
const AICopilot = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI Dealer Copilot. Ask me about promoting vehicles, pricing recommendations, sales forecasts, or generating reports." }
  ]);
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    'What vehicles should I promote?',
    'Which leads need follow-up?',
    'Predict my sales this month',
    'Generate inventory report',
  ];

  const handleSend = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setQuestion('');
    setLoading(true);
    
    await new Promise(r => setTimeout(r, 1500));
    
    const responses = {
      'What vehicles should I promote?': 'Based on your inventory and market data, I recommend promoting your Toyota Land Cruiser 300 and Mercedes-Benz GLE. They have the highest view-to-lead conversion rates (12% and 9%).',
      'Which leads need follow-up?': '3 high-priority leads need follow-up: James Mwangi (Toyota Land Cruiser, score 85), Sarah Ochieng (Mercedes GLE, score 72), Michael Otieno (BMW X5, score 91).',
      'Predict my sales this month': 'Based on historical data and current market trends, I forecast 12-15 vehicle sales this month with revenue between Ksh 50-65 million.',
      'Generate inventory report': 'Your February report shows: 45 sales (+12% MoM), Ksh 187.5M revenue (+18% MoM), 94% response rate, 29% lead conversion.',
    };
    
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: responses[query] || 'Based on your data, your dealership is performing well. Current inventory has good mix with 38 active listings and 94% response rate.' 
    }]);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold">AI Dealer Copilot</h3>
            <p className="text-xs text-purple-100">Powered by KAYAD Intelligence</p>
          </div>
        </div>
      </div>
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
              msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-3 rounded-xl">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-slate-100">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickQuestions.map((q) => (
            <button key={q} onClick={() => handleSend(q)} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full hover:bg-slate-200">
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <button onClick={() => handleSend()} className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/** Navigation Tab */
const NavTab = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
      active ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium text-sm">{label}</span>
    {badge && (
      <span className="ml-auto px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
        {badge}
      </span>
    )}
  </button>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DealerDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data } = await dealerApi.getDealerDashboard();
      setDashboard(data.data);
    } catch (error) {
      // Use mock data on error
      setDashboard({
        overview: {
          totalListings: 47,
          activeListings: 38,
          totalViews: 12845,
          thisMonthViews: 2341,
          leads: {
            total: 156,
            new: 12,
            contacted: 34,
            negotiating: 28,
            inspectionBooked: 15,
            reserved: 8,
            sold: 45,
            lost: 14,
          },
          revenue: {
            total: 187500000,
            thisMonth: 28500000,
          },
          performance: {
            responseRate: 94,
            leadConversion: 29,
            customerSatisfaction: 4.7,
          },
        },
        recentActivity: [
          { type: 'lead', message: 'New enquiry on Toyota Land Cruiser 300', time: '5 min ago' },
          { type: 'view', message: '45 views on your showroom today', time: '12 min ago' },
          { type: 'lead', message: 'Inspection booked for Mercedes GLE', time: '1 hour ago' },
          { type: 'sale', message: 'Vehicle sold: BMW X5', time: '2 hours ago' },
          { type: 'listing', message: 'New listing published successfully', time: '3 hours ago' },
        ],
        topPerformers: {
          vehicles: [
            { id: '1', title: 'Toyota Land Cruiser 300', views: 456, leads: 12, price: 3200000 },
            { id: '2', title: 'Mercedes-Benz GLE 450', views: 389, leads: 9, price: 1850000 },
            { id: '3', title: 'BMW X5 M Sport', views: 345, leads: 7, price: 1650000 },
          ],
        },
      });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Car },
    { id: 'leads', label: 'Leads', icon: Users, badge: dashboard?.overview?.leads?.new },
    { id: 'pipeline', label: 'Pipeline', icon: TrendingRight },
    { id: 'customers', label: 'Customers', icon: ShoppingBag },
    { id: 'marketing', label: 'Marketing', icon: Zap },
    { id: 'auctions', label: 'Auctions', icon: Gavel },
    { id: 'finance', label: 'Finance', icon: CreditCard },
    { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
    { id: 'team', label: 'Team', icon: TeamIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">Dealer Hub</h1>
              <p className="text-xs text-slate-500">Nairobi Auto Hub</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sections.map((section) => (
            <NavTab
              key={section.id}
              icon={section.icon}
              label={section.label}
              active={activeSection === section.id}
              onClick={() => setActiveSection(section.id)}
              badge={section.badge}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="p-4 bg-gradient-to-r from-purple-100 to-purple-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-800">Platinum Plan</span>
            </div>
            <p className="text-xs text-purple-600 mb-3">38/999 listings used</p>
            <button className="w-full py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">
              Upgrade Plan
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
              <p className="text-slate-500">Welcome back, John</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
                <Bell className="w-5 h-5 text-slate-600" />
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Listing
              </button>
            </div>
          </div>

          {activeSection === 'overview' && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard
                  title="Total Listings"
                  value={dashboard?.overview?.totalListings || 47}
                  change={12}
                  icon={Car}
                  color={colors.softBlue}
                />
                <StatCard
                  title="Total Views"
                  value={dashboard?.overview?.totalViews?.toLocaleString() || '12,845'}
                  change={15}
                  icon={Eye}
                  color={colors.purple}
                />
                <StatCard
                  title="Active Leads"
                  value={dashboard?.overview?.leads?.total || 156}
                  change={23}
                  icon={Users}
                  color={colors.emerald}
                />
                <StatCard
                  title="Revenue (This Month)"
                  value={`Ksh ${((dashboard?.overview?.revenue?.thisMonth || 28500000) / 1000000).toFixed(1)}M`}
                  change={18}
                  icon={DollarSign}
                  color={colors.navy}
                />
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Lead Pipeline */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">Lead Pipeline</h3>
                    <button className="text-sm text-purple-600 font-medium hover:text-purple-700">View All</button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <PipelineStage stage="New" count={dashboard?.overview?.leads?.new || 12} color={colors.softBlue} />
                    <PipelineStage stage="Contacted" count={dashboard?.overview?.leads?.contacted || 34} color={colors.purple} />
                    <PipelineStage stage="Negotiating" count={dashboard?.overview?.leads?.negotiating || 28} color={colors.amber} />
                    <PipelineStage stage="Reserved" count={dashboard?.overview?.leads?.reserved || 8} color={colors.emerald} />
                  </div>
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Conversion Rate</p>
                        <p className="text-2xl font-bold text-emerald-600">{dashboard?.overview?.performance?.leadConversion || 29}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Avg Response Rate</p>
                        <p className="text-2xl font-bold text-purple-600">{dashboard?.overview?.performance?.responseRate || 94}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-slate-100 p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Recent Activity</h3>
                  <div className="space-y-1">
                    {dashboard?.recentActivity?.map((activity, i) => (
                      <ActivityItem
                        key={i}
                        type={activity.type}
                        message={activity.message}
                        time={activity.time}
                        icon={
                          activity.type === 'lead' ? MessageSquare :
                          activity.type === 'view' ? Eye :
                          activity.type === 'sale' ? CheckCircle2 :
                          Car
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {/* Top Performing Vehicles */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">Top Performing Vehicles</h3>
                    <button className="text-sm text-purple-600 font-medium hover:text-purple-700">View Inventory</button>
                  </div>
                  <div className="space-y-3">
                    {dashboard?.topPerformers?.vehicles?.map((vehicle, i) => (
                      <TopVehicle key={vehicle.id} vehicle={vehicle} rank={i + 1} />
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-slate-100 p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <QuickAction icon={Plus} label="Add Listing" color={colors.emerald} onClick={() => {}} />
                    <QuickAction icon={Users} label="View Leads" color={colors.purple} onClick={() => setActiveSection('leads')} />
                    <QuickAction icon={Car} label="Manage Inventory" color={colors.softBlue} onClick={() => setActiveSection('inventory')} />
                    <QuickAction icon={Calendar} label="Book Inspection" color={colors.amber} onClick={() => {}} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'inventory' && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Inventory Management</h3>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Listing
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3 mb-6">
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-emerald-600">38</p>
                  <p className="text-xs text-emerald-600">Published</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-amber-600">5</p>
                  <p className="text-xs text-amber-600">Draft</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-600">2</p>
                  <p className="text-xs text-blue-600">Pending</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-purple-600">4</p>
                  <p className="text-xs text-purple-600">Reserved</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl text-center">
                  <p className="text-2xl font-bold text-slate-600">23</p>
                  <p className="text-xs text-slate-600">Sold</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl text-center">
                  <p className="text-2xl font-bold text-slate-600">3</p>
                  <p className="text-xs text-slate-600">Archived</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { title: 'Toyota Land Cruiser 300 GX-R', price: 3200000, status: 'published', views: 456, days: 23 },
                  { title: 'Mercedes-Benz GLE 450 4MATIC', price: 1850000, status: 'published', views: 389, days: 18 },
                  { title: 'BMW X5 M Sport', price: 1650000, status: 'published', views: 345, days: 12 },
                  { title: 'Porsche Cayenne S', price: 2450000, status: 'reserved', views: 289, days: 28 },
                ].map((car, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-16 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                      <Car className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{car.title}</p>
                      <p className="text-sm text-slate-500">Ksh {(car.price / 1000000).toFixed(1)}M • {car.views} views • {car.days} days</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      car.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                      car.status === 'reserved' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {car.status}
                    </span>
                    <button className="p-2 hover:bg-slate-200 rounded-lg">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'leads' && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Lead Management (CRM)</h3>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50">
                    Filter
                  </button>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700">
                    Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Lead</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Vehicle</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Source</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Score</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Stage</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Assigned To</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Last Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'James Mwangi', email: 'james@example.com', vehicle: 'Toyota Land Cruiser 300', source: 'Website', score: 85, stage: 'new', assigned: 'Sales Team', last: null },
                      { name: 'Sarah Ochieng', email: 'sarah@example.com', vehicle: 'Mercedes-Benz GLE', source: 'WhatsApp', score: 72, stage: 'contacted', assigned: 'Mary Wanjiku', last: '2024-02-20' },
                      { name: 'Michael Otieno', email: 'michael@example.com', vehicle: 'BMW X5', source: 'Phone', score: 91, stage: 'negotiating', assigned: 'Mary Wanjiku', last: '2024-02-19' },
                      { name: 'Grace Achieng', email: 'grace@example.com', vehicle: 'Porsche Cayenne', source: 'Instagram', score: 88, stage: 'inspectionBooked', assigned: 'John Kamau', last: '2024-02-18' },
                      { name: 'David Kamau', email: 'david@example.com', vehicle: 'Range Rover', source: 'Referral', score: 95, stage: 'reserved', assigned: 'John Kamau', last: '2024-02-20' },
                    ].map((lead, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{lead.name}</p>
                          <p className="text-xs text-slate-500">{lead.email}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{lead.vehicle}</td>
                        <td className="py-3 px-4 text-slate-700">{lead.source}</td>
                        <td className="py-3 px-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            lead.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            lead.score >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {lead.score}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            lead.stage === 'new' ? 'bg-blue-100 text-blue-700' :
                            lead.stage === 'contacted' ? 'bg-purple-100 text-purple-700' :
                            lead.stage === 'negotiating' ? 'bg-amber-100 text-amber-700' :
                            lead.stage === 'inspectionBooked' ? 'bg-pink-100 text-pink-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {lead.stage.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{lead.assigned}</td>
                        <td className="py-3 px-4 text-slate-500">{lead.last || 'Never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <StatCard title="Total Revenue" value="Ksh 187.5M" change={18} icon={DollarSign} color={colors.emerald} />
                <StatCard title="Total Sales" value="45" change={12} icon={ShoppingCart} color={colors.navy} />
                <StatCard title="Avg Deal Size" value="Ksh 4.2M" change={5} icon={Target} color={colors.purple} />
                <StatCard title="Customer Rating" value="4.7 ★" change={2} icon={Star} color={colors.amber} />
              </div>
              <AICopilot />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
