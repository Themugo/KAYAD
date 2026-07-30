import React, { useState } from 'react';
import { AuctionSession } from '../../../types';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Download, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Star, 
  User, 
  Check, 
  Building, 
  Info, 
  X, 
  ChevronRight,
  ExternalLink,
  Car,
  AlertCircle,
  Copy,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Card, Badge, Button, Input } from '../../../components/ui';

export interface InspectorOption {
  id: string;
  name: string;
  agencyName: string;
  rating: number;
  reviewsCount: number;
  price: number;
  availability: string;
  specialization: string;
  badge: string;
  certifiedPoints: number;
  phone: string;
}

const MOCK_INSPECTORS: InspectorOption[] = [
  {
    id: 'insp-1',
    name: 'Eng. Patrick K. Njoroge',
    agencyName: 'AutoCheck East Africa Diagnostics',
    rating: 4.9,
    reviewsCount: 142,
    price: 4500,
    availability: 'Today at 2:30 PM & Tomorrow 9:00 AM',
    specialization: 'German Engineering & OBD-II Scans',
    badge: 'Master Certified',
    certifiedPoints: 150,
    phone: '+254 722 102 938'
  },
  {
    id: 'insp-2',
    name: 'David Omondi',
    agencyName: 'Apex Mobile Vehicle Inspectors',
    rating: 4.8,
    reviewsCount: 98,
    price: 3500,
    availability: 'Tomorrow at 10:00 AM & 1:00 PM',
    specialization: 'Japanese & Commercial Fleet Vehicles',
    badge: 'Vetted Mechanic',
    certifiedPoints: 120,
    phone: '+254 733 881 204'
  },
  {
    id: 'insp-3',
    name: 'Safariline Fleet Certifiers',
    agencyName: 'Safariline Technical Solutions',
    rating: 4.9,
    reviewsCount: 215,
    price: 5000,
    availability: 'Same Day Express (Within 2 Hours)',
    specialization: 'Heavy Commercial, SUV & Hybrid Systems',
    badge: 'Top Rated Agency',
    certifiedPoints: 150,
    phone: '+254 711 900 812'
  }
];

interface PreAuctionInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuctionSession;
  showToast?: (msg: string) => void;
}

export const PreAuctionInspectionModal: React.FC<PreAuctionInspectionModalProps> = ({
  isOpen,
  onClose,
  session,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'physical' | 'booking' | 'report'>('physical');

  // Physical Viewing Contact State
  const [copiedLocation, setCopiedLocation] = useState(false);

  // Professional Inspection Booking State
  const [selectedInspector, setSelectedInspector] = useState<InspectorOption | null>(MOCK_INSPECTORS[0]);
  const [bookingDate, setBookingDate] = useState('2026-07-31');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'confirmed'>('idle');
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  // Download Report State
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const vehicle = session.vehicle;
  const viewingDates = session.viewingDates || 'Monday – Saturday (July 28 – August 2, 2026)';
  const viewingHours = session.viewingHours || '8:30 AM – 4:30 PM EAT';
  const viewingLocation = session.viewingLocation || vehicle.location || 'Nairobi Yard 4B, Mombasa Road, Nairobi';
  const organizerContactName = session.sellerName || 'AutoYard Kenya Operations';
  const organizerPhone = session.organizerPhone || '+254 722 889 012';
  const organizerEmail = session.organizerEmail || 'inspections@autoyard.co.ke';

  const handleCopyLocation = () => {
    navigator.clipboard.writeText(viewingLocation);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 2000);
  };

  const handleConfirmBooking = () => {
    if (!selectedInspector) return;
    setBookingStatus('booking');

    setTimeout(() => {
      const bookingId = `INSP-BOOK-${Math.floor(1000 + Math.random() * 9000)}`;
      setConfirmedBookingId(bookingId);
      setBookingStatus('confirmed');
      if (showToast) {
        showToast(`✅ Inspection request submitted to ${selectedInspector.name}! Ref: ${bookingId}`);
      }
    }, 1200);
  };

  const handleDownloadReport = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      if (showToast) {
        showToast(`📄 Downloading 150-Point Certified Inspection PDF for ${vehicle.year} ${vehicle.make} ${vehicle.model}...`);
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101935]/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <Card className="max-w-4xl w-full p-0 bg-white rounded-2xl border-none shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-[#101935] text-white p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C85A32]/20 border border-[#C85A32]/40 text-[#C85A32] flex items-center justify-center">
              <Car className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Pre-Auction Verification</span>
                <Badge variant="neutral" size="sm" className="bg-white/10 text-slate-200 text-[10px]">
                  Vehicle ID: {vehicle.id}
                </Badge>
              </div>
              <h2 className="text-lg font-black font-display text-white mt-0.5">
                Pre-Auction Inspection Portal: {vehicle.year} {vehicle.make} {vehicle.model}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THREE MANDATORY OPTIONS SELECTOR TABS */}
        <div className="bg-[#F5F2EB] px-6 py-2 border-b border-slate-200 flex items-center justify-between text-xs overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('physical')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                activeTab === 'physical'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>1. Physical Viewing</span>
            </button>

            <button
              onClick={() => setActiveTab('booking')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                activeTab === 'booking'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>2. Mechanic Marketplace Booking</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>3. Digital Inspection Report</span>
            </button>
          </div>
        </div>

        {/* BODY CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">

          {/* OPTION 1: PHYSICAL VIEWING */}
          {activeTab === 'physical' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-[#1E3063]/5 rounded-xl border border-[#1E3063]/20 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#C85A32]" />
                    <span>On-Site Vehicle Viewing & Ground Inspection</span>
                  </h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Inspect <strong>{vehicle.year} {vehicle.make} {vehicle.model}</strong> physically at the holding yard prior to auction day. All prospective bidders are entitled to full mechanical examination and test startup.
                  </p>
                </div>
                <Badge variant="success" size="sm" className="bg-emerald-600 text-white font-bold shrink-0">
                  Open for Inspection
                </Badge>
              </div>

              {/* GRID DETAILS: DATES, HOURS, LOCATION, ORGANIZER CONTACT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* VIEWING DATES & HOURS */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 text-[#1E3063] font-black border-b border-slate-100 pb-3">
                    <Calendar className="w-4.5 h-4.5 text-[#C85A32]" />
                    <span>Viewing Schedule & Operating Hours</span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Viewing Dates</span>
                      <p className="font-extrabold text-[#1E3063] text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {viewingDates}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Viewing Hours</span>
                      <p className="font-extrabold text-emerald-800 text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {viewingHours}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* LOCATION & DIRECTIONS */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-[#1E3063] font-black">
                      <MapPin className="w-4.5 h-4.5 text-[#C85A32]" />
                      <span>Yard Physical Location</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLocation}
                      className="text-[11px] text-[#1E3063] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      {copiedLocation ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLocation ? 'Copied' : 'Copy Address'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-black text-slate-900 text-xs leading-relaxed">
                      {viewingLocation}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Security Gate Entry: Present National ID & reference auction lot code <strong className="text-slate-700">#LOT-{vehicle.id.slice(-4)}</strong>.
                    </p>
                  </div>
                </Card>
              </div>

              {/* ORGANIZER CONTACT CARD */}
              <Card className="p-5 bg-[#101935] text-white border-none rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-4.5 h-4.5 text-amber-400" />
                    <span className="font-black text-white text-xs">Organizer & Yard Ground Custodian</span>
                  </div>
                  <Badge variant="neutral" size="sm" className="bg-white/10 text-amber-300 font-extrabold text-[10px]">
                    Verified Yard Operations
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[10px] font-medium">Organizer / Company</span>
                    <p className="font-bold text-white">{organizerContactName}</p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[10px] font-medium">Direct Phone Hotline</span>
                    <p className="font-mono font-bold text-amber-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-300" />
                      {organizerPhone}
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[10px] font-medium">Official Yard Email</span>
                    <p className="font-bold text-slate-200 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-300" />
                      {organizerEmail}
                    </p>
                  </div>
                </div>
              </Card>

              {/* CTA NEXT */}
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveTab('booking')}
                  className="bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold px-6"
                >
                  <span>Book Independent Mechanic Inspection</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* OPTION 2: PROFESSIONAL INSPECTION BOOKING (MECHANIC MARKETPLACE) */}
          {activeTab === 'booking' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* MANDATORY DISCLAIMER: KAYAD DOES NOT PERFORM INSPECTIONS */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 flex items-start gap-3 shadow-2xs">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-black text-amber-900">Independent Mechanic Marketplace Disclaimer</p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    <strong>KAYAD does NOT perform vehicle inspections.</strong> All inspections are provided by independent certified mechanics and diagnostic firms operating on the KAYAD Mechanic Marketplace. Inspection fees are paid directly to the selected inspector upon digital report delivery.
                  </p>
                </div>
              </div>

              {bookingStatus === 'confirmed' ? (
                /* CONFIRMED BOOKING STATE */
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-300 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <Badge variant="success" size="md" className="bg-emerald-700 text-white font-extrabold text-xs px-3">
                      INSPECTION BOOKED & ASSIGNED
                    </Badge>
                    <h3 className="text-lg font-black text-[#1E3063] font-display mt-2">
                      Booking Reference: {confirmedBookingId}
                    </h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      {selectedInspector?.name} ({selectedInspector?.agencyName}) has been notified to inspect <strong>{vehicle.year} {vehicle.make} {vehicle.model}</strong> at the yard on <strong>{bookingDate} at {bookingTime}</strong>.
                    </p>
                  </div>

                  <div className="max-w-md mx-auto p-4 bg-white rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Inspection Status:</span>
                      <Badge variant="accent" size="sm" className="bg-blue-100 text-blue-900 font-bold">
                        Inspector Dispatched
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Agreed Price:</span>
                      <span className="font-mono font-bold text-slate-900">Ksh {selectedInspector?.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Inspector Hotline:</span>
                      <span className="font-mono font-bold text-[#1E3063]">{selectedInspector?.phone}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBookingStatus('idle')}
                    className="text-xs font-bold border-slate-300"
                  >
                    Book Another Inspector or Modify
                  </Button>
                </div>
              ) : (
                /* INSPECTOR SELECTION & BOOKING FORM */
                <div className="space-y-5">
                  <div className="border-b border-slate-200 pb-3">
                    <h4 className="text-sm font-black text-[#1E3063] font-display flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[#C85A32]" />
                      <span>Select Available Independent Inspector</span>
                    </h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Choose a verified third-party diagnostic specialist to conduct an on-site pre-auction inspection.
                    </p>
                  </div>

                  {/* INSPECTOR LIST */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {MOCK_INSPECTORS.map(inspector => (
                      <div
                        key={inspector.id}
                        onClick={() => setSelectedInspector(inspector)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 relative flex flex-col justify-between ${
                          selectedInspector?.id === inspector.id
                            ? 'bg-[#1E3063]/5 border-[#1E3063] ring-2 ring-[#1E3063]/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {selectedInspector?.id === inspector.id && (
                          <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1E3063] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}

                        <div className="space-y-1.5">
                          <Badge variant="neutral" size="sm" className="bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                            {inspector.badge}
                          </Badge>
                          <h5 className="font-extrabold text-[#1E3063] text-xs leading-tight">{inspector.name}</h5>
                          <p className="text-[11px] text-slate-500 font-medium">{inspector.agencyName}</p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px]">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1 text-amber-600 font-extrabold">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {inspector.rating} ({inspector.reviewsCount})
                            </span>
                            <span className="font-bold text-slate-700">{inspector.certifiedPoints}-Pt Checklist</span>
                          </div>

                          <div className="p-2 bg-slate-100/80 rounded-lg text-slate-600">
                            <span className="font-bold text-slate-800">Next Available:</span> {inspector.availability}
                          </div>

                          <div className="flex items-center justify-between font-black text-xs pt-1">
                            <span className="text-slate-500 font-normal">Fee:</span>
                            <span className="text-emerald-700 font-mono text-sm">Ksh {inspector.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* BOOKING DETAILS FORM */}
                  {selectedInspector && (
                    <Card className="p-5 bg-white border-slate-200 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="font-black text-[#1E3063] flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#C85A32]" />
                          Inspection Slot & Booking Request for {selectedInspector.name}
                        </span>
                        <span className="font-mono font-black text-emerald-700">
                          Price: Ksh {selectedInspector.price.toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-extrabold text-slate-700">Select Inspection Date</label>
                          <Input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-extrabold text-slate-700">Select Preferred Time Slot</label>
                          <select
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
                          >
                            <option value="09:00 AM">09:00 AM EAT</option>
                            <option value="10:30 AM">10:30 AM EAT</option>
                            <option value="01:30 PM">01:30 PM EAT</option>
                            <option value="03:00 PM">03:00 PM EAT</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-extrabold text-slate-700">Specific Systems to Focus On (Optional)</label>
                        <Input
                          value={buyerNotes}
                          onChange={(e) => setBuyerNotes(e.target.value)}
                          placeholder="e.g. Check transmission shifts, turbo pressure, and frame geometry under vehicle..."
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[11px] text-slate-500">
                          Status: <strong className="text-emerald-700">Marketplace Ready</strong>
                        </span>
                        <Button
                          type="button"
                          variant="accent"
                          disabled={bookingStatus === 'booking'}
                          onClick={handleConfirmBooking}
                          className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-black px-6"
                        >
                          {bookingStatus === 'booking' ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                              <span>Confirming Request...</span>
                            </span>
                          ) : (
                            <span>Confirm Mechanic Dispatch (Ksh {selectedInspector.price.toLocaleString()})</span>
                          )}
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* OPTION 3: DOWNLOAD / VIEW EXISTING DIGITAL INSPECTION REPORT */}
          {activeTab === 'report' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" size="sm" className="bg-emerald-700 text-white font-extrabold">
                      Verified 150-Point Digital Certificate
                    </Badge>
                    <span className="text-[11px] font-mono text-emerald-800 font-bold">Report #RPT-2026-9812</span>
                  </div>
                  <h3 className="font-black text-[#1E3063] text-sm font-display mt-1">
                    Pre-Auction Digital Diagnostic & Inspection Report
                  </h3>
                  <p className="text-emerald-900 text-xs">
                    Evaluated on <strong>July 26, 2026</strong> by independent master certified diagnostic team. Overall Grade: <strong className="text-emerald-800">Grade A (95.4% Integrity)</strong>.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  disabled={isDownloading}
                  onClick={handleDownloadReport}
                  className="bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold text-xs shrink-0"
                >
                  <Download className="w-4 h-4 mr-1.5 text-amber-400" />
                  <span>{isDownloading ? 'Downloading PDF...' : 'Download Official PDF Report'}</span>
                </Button>
              </div>

              {/* REPORT OVERVIEW SUMMARY SCORE CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Engine Compression</span>
                  <p className="font-extrabold text-[#1E3063] text-sm mt-0.5">97% (Optimal)</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">✓ Equal across 4 Cyl</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">OBD-II Electronics</span>
                  <p className="font-extrabold text-emerald-700 text-sm mt-0.5">Clean ECU Scan</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">✓ 0 Fault Codes Found</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Transmission</span>
                  <p className="font-extrabold text-[#1E3063] text-sm mt-0.5">Smooth Torque</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">✓ Clean ATF Fluid</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Bodywork & Chassis</span>
                  <p className="font-extrabold text-[#1E3063] text-sm mt-0.5">Zero Major Accident</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">✓ Paint Thickness Verified</span>
                </div>
              </div>

              {/* DETAILED DIAGNOSTIC CHECKLIST BREAKDOWN */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <h4 className="font-extrabold text-[#1E3063] text-xs border-b border-slate-100 pb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>150-Point Certified Inspection Sub-System Evaluation</span>
                </h4>

                <div className="space-y-2 text-xs divide-y divide-slate-100">
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">1. Powertrain & Engine Block</p>
                      <p className="text-[11px] text-slate-500">No oil seepage around valve cover gasket. Cold start exhaust emissions clear.</p>
                    </div>
                    <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 font-bold">PASS (98%)</Badge>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">2. Braking System & ABS Actuator</p>
                      <p className="text-[11px] text-slate-500">Front brake pads at 8.5mm, rear brake pads at 7.0mm. Rotor discs smooth without scoring.</p>
                    </div>
                    <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 font-bold">PASS (94%)</Badge>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">3. Steering & Suspension Bushings</p>
                      <p className="text-[11px] text-slate-500">Control arm bushings intact. Shock absorbers show dry seals with balanced damping.</p>
                    </div>
                    <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 font-bold">PASS (92%)</Badge>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">4. Undercarriage & Rust Protection</p>
                      <p className="text-[11px] text-slate-500">Chassis rails straight with zero structural corrosion or welding splices.</p>
                    </div>
                    <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 font-bold">PASS (96%)</Badge>
                  </div>
                </div>
              </Card>

              {/* DOWNLOAD REPORT CTA */}
              <div className="p-4 bg-[#101935] text-white rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Need an offline printout for your bank or loan officer?</p>
                  <p className="text-[11px] text-slate-300">Contains high-res diagnostic photos, OBD-II scan logs, and certified mechanic stamp.</p>
                </div>
                <Button
                  type="button"
                  variant="accent"
                  onClick={handleDownloadReport}
                  className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-xs"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>Download PDF Certificate</span>
                </Button>
              </div>

            </div>
          )}

        </div>
      </Card>
    </div>
  );
};
