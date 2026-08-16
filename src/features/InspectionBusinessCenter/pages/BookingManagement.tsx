// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - BOOKING MANAGEMENT
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  Clock,
  MapPin,
  User,
  Car,
  Phone,
  Mail,
  FileText,
  Check,
  X,
  ChevronRight,
  Filter,
  Search,
  MoreVertical,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import type { Booking, BookingStatus } from '../types/businessCenter';
import { BOOKING_STATUS_LABELS } from '../types/businessCenter';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  red: '#dc2626',
};

interface BookingManagementProps {
  providerId: string;
  initialFilter?: string;
}

const KANBAN_COLUMNS: { id: BookingStatus | 'all'; label: string; color: string }[] = [
  { id: 'booked', label: 'New Requests', color: '#3b82f6' },
  { id: 'confirmed', label: 'Accepted', color: '#8b5cf6' },
  { id: 'inspector_assigned', label: 'Engineer Assigned', color: '#8b5cf6' },
  { id: 'travelling', label: 'Travelling', color: '#f59e0b' },
  { id: 'inspection_started', label: 'In Progress', color: '#10b981' },
  { id: 'inspection_complete', label: 'Report Writing', color: '#10b981' },
  { id: 'report_generated', label: 'Quality Review', color: '#10b981' },
  { id: 'closed', label: 'Completed', color: '#6b7280' },
];

// Sample data
const SAMPLE_BOOKINGS: Booking[] = [
  { id: '1', reference: 'KAYAD-001', customerName: 'John Kamau', vehicle: 'Toyota Corolla 2022', scheduledDate: '2024-01-15', scheduledTime: '09:00', status: 'booked', price: 15000, county: 'Nairobi' },
  { id: '2', reference: 'KAYAD-002', customerName: 'Sarah Wanjiku', vehicle: 'Mercedes C-Class 2021', scheduledDate: '2024-01-15', scheduledTime: '11:30', status: 'confirmed', price: 25000, engineerId: 'e1', county: 'Kiambu' },
  { id: '3', reference: 'KAYAD-003', customerName: 'Auto Dealers Ltd', vehicle: 'Toyota Land Cruiser 2020', scheduledDate: '2024-01-15', scheduledTime: '14:00', status: 'inspector_assigned', price: 35000, engineerId: 'e2', county: 'Mombasa' },
  { id: '4', reference: 'KAYAD-004', customerName: 'James Ochieng', vehicle: 'Honda Civic 2019', scheduledDate: '2024-01-15', scheduledTime: '10:00', status: 'travelling', price: 12000, engineerId: 'e3', county: 'Nairobi' },
  { id: '5', reference: 'KAYAD-005', customerName: 'Grace Muthoni', vehicle: 'BMW 3 Series 2022', scheduledDate: '2024-01-14', scheduledTime: '14:00', status: 'inspection_started', price: 30000, engineerId: 'e1', county: 'Nairobi' },
  { id: '6', reference: 'KAYAD-006', customerName: 'Peter Njoroge', vehicle: 'Nissan Altima 2020', scheduledDate: '2024-01-14', scheduledTime: '11:00', status: 'inspection_complete', price: 18000, engineerId: 'e2', county: 'Kajiado' },
  { id: '7', reference: 'KAYAD-007', customerName: 'Faith Njeri', vehicle: 'VW Golf 2021', scheduledDate: '2024-01-14', scheduledTime: '09:00', status: 'report_generated', price: 15000, engineerId: 'e3', county: 'Nairobi' },
  { id: '8', reference: 'KAYAD-008', customerName: 'Michael Odhiambo', vehicle: 'Mazda CX-5 2022', scheduledDate: '2024-01-13', scheduledTime: '10:00', status: 'closed', price: 22000, engineerId: 'e1', county: 'Nairobi' },
  { id: '9', reference: 'KAYAD-009', customerName: 'Lucy Achieng', vehicle: 'Hyundai Tucson 2021', scheduledDate: '2024-01-15', scheduledTime: '15:30', status: 'booked', price: 16000, county: 'Machakos' },
];

export default function BookingManagement({ providerId, initialFilter }: BookingManagementProps) {
  const [bookings, setBookings] = useState<Booking[]>(SAMPLE_BOOKINGS);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeColumn, setActiveColumn] = useState<BookingStatus | 'all'>(initialFilter as BookingStatus || 'all');

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = searchQuery === '' || 
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.vehicle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesColumn = activeColumn === 'all' || b.status === activeColumn;
    return matchesSearch && matchesColumn;
  });

  const groupedBookings = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = bookings.filter(b => b.status === col.id);
    return acc;
  }, {} as Record<string, Booking[]>);

  const handleStatusChange = (bookingId: string, newStatus: BookingStatus) => {
    setBookings(prev => prev.map(b => 
      b.id === bookingId ? { ...b, status: newStatus } : b
    ));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            Booking Management
          </h1>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {bookings.length} total bookings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search 
              size={18} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: KAYAD_COLORS.softBlue }}
            />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border outline-none focus:border-emerald-500"
              style={{ borderColor: KAYAD_COLORS.softBlue }}
            />
          </div>
        </div>
      </div>

      {/* Column Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveColumn('all')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeColumn === 'all' ? 'text-white' : ''
          }`}
          style={{
            backgroundColor: activeColumn === 'all' ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
            color: activeColumn === 'all' ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
          }}
        >
          All ({bookings.length})
        </button>
        {KANBAN_COLUMNS.map(col => (
          <button
            key={col.id}
            onClick={() => setActiveColumn(col.id as BookingStatus)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeColumn === col.id ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: activeColumn === col.id ? col.color : KAYAD_COLORS.white,
              color: activeColumn === col.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
            }}
          >
            {col.label} ({groupedBookings[col.id as BookingStatus]?.length || 0})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Kanban / List View */}
        <div className="flex-1 overflow-auto">
          {activeColumn === 'all' ? (
            // Kanban View
            <div className="flex gap-4 min-w-max pb-4">
              {KANBAN_COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  id={col.id as BookingStatus}
                  label={col.label}
                  color={col.color}
                  bookings={groupedBookings[col.id as BookingStatus] || []}
                  onSelect={setSelectedBooking}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          ) : (
            // Single Column View
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
              {filteredBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onClick={() => setSelectedBooking(booking)}
                  expanded={selectedBooking?.id === booking.id}
                />
              ))}
              {filteredBookings.length === 0 && (
                <div className="col-span-2 text-center py-12" style={{ color: KAYAD_COLORS.softBlue }}>
                  <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No bookings found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedBooking && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-96 rounded-xl shadow-lg p-6 h-fit sticky top-0"
              style={{ backgroundColor: KAYAD_COLORS.white }}
            >
              <BookingDetail
                booking={selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onStatusChange={(status) => {
                  handleStatusChange(selectedBooking.id, status);
                  setSelectedBooking({ ...selectedBooking, status });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({ 
  id, 
  label, 
  color, 
  bookings, 
  onSelect,
  onStatusChange 
}: { 
  id: BookingStatus; 
  label: string; 
  color: string;
  bookings: Booking[];
  onSelect: (b: Booking) => void;
  onStatusChange: (id: string, status: BookingStatus) => void;
}) {
  return (
    <div className="w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
            {label}
          </h3>
        </div>
        <span 
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {bookings.length}
        </span>
      </div>
      
      <div className="space-y-3 min-h-96">
        {bookings.map(booking => (
          <div
            key={booking.id}
            onClick={() => onSelect(booking)}
            className="p-3 rounded-lg cursor-pointer transition-all hover:shadow-md"
            style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
          >
            <p className="font-medium text-sm truncate" style={{ color: KAYAD_COLORS.lightNavy }}>
              {booking.vehicle}
            </p>
            <p className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
              {booking.customerName}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>
                <Clock size={12} className="inline mr-1" />
                {booking.scheduledTime}
              </span>
              <span className="text-xs font-medium" style={{ color: KAYAD_COLORS.emerald }}>
                KES {booking.price.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
        
        {bookings.length === 0 && (
          <div 
            className="h-24 rounded-lg flex items-center justify-center text-sm"
            style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.softBlue }}
          >
            No bookings
          </div>
        )}
      </div>
    </div>
  );
}

// Booking Card Component
function BookingCard({ 
  booking, 
  onClick, 
  expanded 
}: { 
  booking: Booking; 
  onClick: () => void;
  expanded?: boolean;
}) {
  const statusColors: Record<string, string> = {
    booked: '#3b82f6',
    confirmed: '#8b5cf6',
    inspector_assigned: '#8b5cf6',
    travelling: '#f59e0b',
    inspection_started: '#10b981',
    inspection_complete: '#10b981',
    report_generated: '#10b981',
    customer_reviewed: '#6b7280',
    closed: '#6b7280',
    cancelled: '#ef4444',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
        expanded ? 'ring-2' : ''
      }`}
      style={{ 
        backgroundColor: KAYAD_COLORS.white,
        ['--tw-ring-color' as any]: statusColors[booking.status]
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
            {booking.vehicle}
          </p>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {booking.reference}
          </p>
        </div>
        <span 
          className="px-2 py-1 rounded-full text-xs font-medium capitalize"
          style={{ 
            backgroundColor: `${statusColors[booking.status]}20`,
            color: statusColors[booking.status]
          }}
        >
          {booking.status.replace('_', ' ')}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
          <User size={14} />
          <span>{booking.customerName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
          <Calendar size={14} />
          <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
          <Clock size={14} className="ml-2" />
          <span>{booking.scheduledTime}</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
          <MapPin size={14} />
          <span>{booking.county}</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-4 pt-3 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        <span className="text-lg font-bold" style={{ color: KAYAD_COLORS.emerald }}>
          KES {booking.price.toLocaleString()}
        </span>
        <ChevronRight size={20} style={{ color: KAYAD_COLORS.softBlue }} />
      </div>
    </div>
  );
}

// Booking Detail Component
function BookingDetail({ 
  booking, 
  onClose, 
  onStatusChange 
}: { 
  booking: Booking; 
  onClose: () => void;
  onStatusChange: (status: BookingStatus) => void;
}) {
  const statusColors: Record<string, string> = {
    booked: '#3b82f6',
    confirmed: '#8b5cf6',
    inspector_assigned: '#8b5cf6',
    travelling: '#f59e0b',
    inspection_started: '#10b981',
    inspection_complete: '#10b981',
    report_generated: '#10b981',
    customer_reviewed: '#6b7280',
    closed: '#6b7280',
    cancelled: '#ef4444',
  };

  const nextStatuses: Record<string, BookingStatus[]> = {
    booked: ['confirmed', 'cancelled'],
    confirmed: ['inspector_assigned', 'cancelled'],
    inspector_assigned: ['travelling', 'cancelled'],
    travelling: ['inspection_started', 'cancelled'],
    inspection_started: ['inspection_complete'],
    inspection_complete: ['report_generated'],
    report_generated: ['customer_reviewed'],
    customer_reviewed: ['closed'],
  };

  const getNextActions = () => {
    return nextStatuses[booking.status] || [];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
          Booking Details
        </h2>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100"
          style={{ color: KAYAD_COLORS.softBlue }}
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Status Badge */}
      <div className="mb-4">
        <span 
          className="px-3 py-1 rounded-full text-sm font-medium capitalize"
          style={{ 
            backgroundColor: `${statusColors[booking.status]}20`,
            color: statusColors[booking.status]
          }}
        >
          {BOOKING_STATUS_LABELS[booking.status]}
        </span>
      </div>

      {/* Vehicle */}
      <div className="mb-4">
        <h3 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
          {booking.vehicle}
        </h3>
        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
          {booking.reference}
        </p>
      </div>

      {/* Details */}
      <div className="space-y-3 mb-6">
        <DetailRow icon={<User size={16} />} label="Customer" value={booking.customerName} />
        <DetailRow icon={<Calendar size={16} />} label="Date" value={new Date(booking.scheduledDate).toLocaleDateString()} />
        <DetailRow icon={<Clock size={16} />} label="Time" value={booking.scheduledTime} />
        <DetailRow icon={<MapPin size={16} />} label="Location" value={booking.county || 'N/A'} />
        <DetailRow icon={<DollarSign size={16} />} label="Price" value={`KES ${booking.price.toLocaleString()}`} highlight />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <p className="text-sm font-medium mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>
          Actions
        </p>
        {getNextActions().map(status => (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className="w-full py-2 px-4 rounded-lg font-medium text-white transition-colors"
            style={{ 
              backgroundColor: status === 'cancelled' ? KAYAD_COLORS.red : KAYAD_COLORS.emerald 
            }}
          >
            {status === 'cancelled' ? 'Cancel Booking' : 
             status === 'confirmed' ? 'Accept Booking' :
             status === 'inspector_assigned' ? 'Assign Engineer' :
             status === 'travelling' ? 'Mark Travelling' :
             status === 'inspection_started' ? 'Start Inspection' :
             status === 'inspection_complete' ? 'Complete Inspection' :
             status === 'report_generated' ? 'Submit Report' :
             status === 'customer_reviewed' ? 'Send to Customer' :
             'Complete'}
          </button>
        ))}
        
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button className="py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
            <Phone size={16} />
            Call
          </button>
          <button className="py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
            <Mail size={16} />
            Email
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div style={{ color: KAYAD_COLORS.softBlue }}>{icon}</div>
      <div className="flex-1">
        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{label}</p>
        <p className={`text-sm ${highlight ? 'font-semibold' : ''}`} style={{ color: KAYAD_COLORS.lightNavy }}>
          {value}
        </p>
      </div>
    </div>
  );
}
