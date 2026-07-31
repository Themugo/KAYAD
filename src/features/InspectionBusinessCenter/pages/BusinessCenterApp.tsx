// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - MAIN APP
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  BarChart3,
  DollarSign,
  Settings,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Package,
  Building,
  Award,
  AlertTriangle,
  FolderOpen,
  CheckCircle,
} from 'lucide-react';
import ExecutiveHome from './ExecutiveHome';
import BookingManagement from './BookingManagement';
import CalendarView from './CalendarView';
import EngineerManagement from './EngineerManagement';
import ReportReviewCenter from './ReportReviewCenter';
import BusinessAnalytics from './BusinessAnalytics';
import FinanceCenter from './FinanceCenter';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
};

type Section = 'home' | 'bookings' | 'calendar' | 'engineers' | 'reports' | 'analytics' | 'finance' | 'customers' | 'marketing' | 'documents' | 'quality' | 'settings';

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function BusinessCenterApp({ providerId }: { providerId: string }) {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [collapsed, setCollapsed] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<string | undefined>();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Executive Home', icon: <LayoutDashboard size={20} /> },
    { id: 'bookings', label: 'Bookings', icon: <ClipboardList size={20} />, badge: 3 },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
    { id: 'engineers', label: 'Engineers', icon: <Users size={20} /> },
    { id: 'reports', label: 'Report Review', icon: <FileText size={20} />, badge: 2 },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
    { id: 'finance', label: 'Finance', icon: <DollarSign size={20} /> },
    { id: 'customers', label: 'Customers', icon: <Building size={20} /> },
    { id: 'marketing', label: 'Marketing', icon: <Package size={20} /> },
    { id: 'documents', label: 'Documents', icon: <FolderOpen size={20} /> },
    { id: 'quality', label: 'Quality', icon: <CheckCircle size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const handleNavigate = (section: Section, filter?: string) => {
    setActiveSection(section);
    if (section === 'bookings' && filter) {
      setBookingFilter(filter);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full shadow-lg transition-all duration-300 z-20 flex flex-col`}
        style={{ 
          backgroundColor: KAYAD_COLORS.lightNavy,
          width: collapsed ? '80px' : '260px'
        }}
      >
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold" style={{ color: KAYAD_COLORS.white }}>
                  Business Center
                </h1>
                <p className="text-xs" style={{ color: KAYAD_COLORS.mutedTerracotta }}>
                  Inspection Operations
                </p>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: KAYAD_COLORS.white }}
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activeSection === item.id 
                      ? 'text-white' 
                      : 'hover:bg-white/10 text-gray-300'
                  }`}
                  style={{ 
                    backgroundColor: activeSection === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span 
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center"
                      style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}
            >
              DM
            </div>
            {!collapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.white }}>
                  David Maina
                </p>
                <p className="text-xs" style={{ color: KAYAD_COLORS.mutedTerracotta }}>
                  Lead Engineer
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: collapsed ? '80px' : '260px' }}
      >
        {/* Header */}
        <header 
          className="sticky top-0 z-10 px-6 py-4 shadow-sm"
          style={{ backgroundColor: KAYAD_COLORS.white }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                {navItems.find(n => n.id === activeSection)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                AutoInspect Kenya
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: KAYAD_COLORS.softBlue }}>
                <Bell size={20} />
                <span 
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: KAYAD_COLORS.emerald }}
                />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: KAYAD_COLORS.softBlue }}>
                <Settings size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeSection === 'home' && (
              <ExecutiveHome 
                providerId={providerId} 
                onNavigate={handleNavigate}
              />
            )}
            
            {activeSection === 'bookings' && (
              <BookingManagement 
                providerId={providerId}
                initialFilter={bookingFilter}
              />
            )}
            
            {activeSection === 'calendar' && (
              <CalendarView providerId={providerId} />
            )}
            
            {activeSection === 'engineers' && (
              <EngineerManagement providerId={providerId} />
            )}
            
            {activeSection === 'reports' && (
              <ReportReviewCenter providerId={providerId} />
            )}
            
            {activeSection === 'analytics' && (
              <BusinessAnalytics providerId={providerId} />
            )}
            
            {activeSection === 'finance' && (
              <FinanceCenter providerId={providerId} />
            )}
            
            {activeSection === 'customers' && (
              <PlaceholderPage title="Customer Management" description="Customer relationships and history" />
            )}
            
            {activeSection === 'marketing' && (
              <PlaceholderPage title="Marketing" description="Packages, promotions, and campaigns" />
            )}
            
            {activeSection === 'documents' && (
              <PlaceholderPage title="Document Center" description="Certificates, licenses, and templates" />
            )}
            
            {activeSection === 'quality' && (
              <PlaceholderPage title="Quality Management" description="Quality monitoring and compliance" />
            )}
            
            {activeSection === 'settings' && (
              <PlaceholderPage title="Business Settings" description="Configure your business profile and preferences" />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

// Placeholder Page Component
function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96">
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
      >
        <Calendar size={32} style={{ color: KAYAD_COLORS.lightNavy }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>
        {title}
      </h2>
      <p className="text-center max-w-md" style={{ color: KAYAD_COLORS.softBlue }}>
        {description}
      </p>
    </div>
  );
}
