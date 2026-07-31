import React, { useState, useEffect } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ClipboardCheck, Car, Search,
  Clock, Star, MapPin, CheckCircle2, ChevronRight, ChevronDown,
  Phone, Mail, MessageCircle, Calendar, User, FileCheck, Award,
  BarChart3, Bot, Zap, Eye, AlertTriangle, ThumbsUp, ThumbsDown,
  Camera, Mic, FileText, Check, X, ArrowRight, Globe, Truck,
  Building2, Banknote, Percent, Bot as BotIcon, Loader2, Download,
  Play, Pause, Map, Navigation, CheckSquare, Square, Circle,
  Volume2, Image, Video, Signature, Wifi, WifiOff, RefreshCw,
  Settings, Users, DollarSign, TrendingUp, CalendarDays,
  AlertCircle, Info, ExternalLink, Clipboard, BarChart,
  PieChart, Activity, Wrench, Gauge, Disc, Home, ArrowDown,
  Circle as CircleIcon, Monitor, ArrowUpRight, ArrowDownRight,
  PieChart as PieChartIcon, LayoutDashboard, ClipboardList,
  Package, Truck as FleetIcon, Building, Shield as ShieldIcon,
  UserCheck, FileBarChart, Calculator, Phone as PhoneIcon,
  Mail as MailIcon, MessageSquare as MessageIcon, Send,
  Leaf, Zap as ZapIcon, Battery, Thermometer, CreditCard,
} from 'lucide-react';

// ============================================================
// SUB-COMPONENTS
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

const StatsCard = ({ value, label, icon: Icon }) => (
  <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
    <Icon className="w-8 h-8 text-emerald-400 mb-2" />
    <p className="text-4xl font-bold text-white">{value}</p>
    <p className="text-slate-300 text-sm">{label}</p>
  </div>
);

const TrustBadge = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur rounded-xl">
    <Icon className="w-5 h-5 text-white" />
    <span className="text-white font-medium text-sm">{label}</span>
  </div>
);

const CoverageCity = ({ city, available, avgTime }) => (
  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${available ? 'bg-emerald-100' : 'bg-slate-100'}`}>
        <MapPin className={`w-5 h-5 ${available ? 'text-emerald-600' : 'text-slate-400'}`} />
      </div>
      <div>
        <span className="font-semibold text-slate-800">{city}</span>
        {available && <span className="text-xs text-slate-400 block">~{avgTime}</span>}
      </div>
    </div>
    {available ? (
      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Available</span>
    ) : (
      <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">Coming Soon</span>
    )}
  </div>
);

const TestimonialCard = ({ name, role, text, rating }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
    <div className="flex gap-1 mb-3">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
    <p className="text-slate-600 mb-4 leading-relaxed">"{text}"</p>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
        <User className="w-5 h-5 text-slate-500" />
      </div>
      <div>
        <p className="font-semibold text-slate-800">{name}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
    </div>
  </div>
);

const PackageCard = ({ pkg, onSelect }) => (
  <div className={`bg-white rounded-2xl border-2 transition-all hover:shadow-lg ${pkg.popular ? 'border-emerald-500 shadow-md' : 'border-slate-200'}`}>
    {pkg.popular && (
      <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-t-lg text-center">MOST POPULAR</div>
    )}
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">{pkg.name}</h3>
          <p className="text-sm text-slate-500 mt-1">{pkg.description}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pkg.popular ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          <pkg.icon className={`w-6 h-6 ${pkg.popular ? 'text-emerald-600' : 'text-slate-500'}`} />
        </div>
      </div>
      <div className="mb-6">
        <span className="text-3xl font-bold text-slate-800">Ksh {pkg.price.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
        <div className="flex items-center gap-1"><ClipboardCheck className="w-4 h-4" /><span>{pkg.items} points</span></div>
        <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{pkg.duration}</span></div>
      </div>
      <ul className="space-y-2 mb-6">
        {pkg.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />{feature}
          </li>
        ))}
      </ul>
      <button onClick={() => onSelect(pkg)} className={`w-full py-3 rounded-xl font-semibold transition-all ${pkg.popular ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
        Select Package
      </button>
    </div>
  </div>
);

const Step = ({ number, title, description, icon: Icon, completed }) => (
  <div className="relative flex-1">
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${completed ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          {completed ? <CheckCircle2 className="w-7 h-7 text-emerald-600" /> : <Icon className="w-7 h-7 text-slate-500" />}
        </div>
        <div className="absolute -top-2 -left-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {completed ? <Check className="w-4 h-4" /> : number}
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  </div>
);

const InspectorCard = ({ inspector }) => (
  <div className="bg-white rounded-xl border border-slate-100 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
        <User className="w-8 h-8 text-slate-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-800">{inspector.name}</h3>
          {inspector.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
        </div>
        <p className="text-sm text-slate-500">{inspector.location}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-sm font-semibold text-slate-700">{inspector.rating}</span>
          <span className="text-xs text-slate-400">({inspector.reviews} reviews)</span>
        </div>
      </div>
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${inspector.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        {inspector.available ? 'Available' : 'Busy'}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">Completed</p><p className="text-lg font-bold text-slate-800">{inspector.completed}</p></div>
      <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">Experience</p><p className="text-lg font-bold text-slate-800">{inspector.experience}y</p></div>
    </div>
    <div className="flex flex-wrap gap-2 mb-4">
      {inspector.certifications.map((cert, i) => (
        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{cert}</span>
      ))}
    </div>
    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
      <Clock className="w-4 h-4" /><span>Responds {inspector.responseTime}</span>
    </div>
    <button className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors">View Profile</button>
  </div>
);

const PortalCard = ({ title, description, icon: Icon, color }) => (
  <div className="bg-white rounded-xl border border-slate-100 p-6 hover:shadow-md transition-all cursor-pointer group">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 mb-4">{description}</p>
    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 group-hover:gap-3 transition-all">
      Learn more <ArrowRight className="w-4 h-4" />
    </div>
  </div>
);

const VehiclePassportPreview = () => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
    <div className="p-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8" />
          <div><h3 className="font-bold text-lg">Digital Vehicle Passport</h3><p className="text-emerald-100 text-sm">Verified by Ghost Checkers</p></div>
        </div>
        <div className="text-right">
          <p className="text-xs text-emerald-100">Passport ID</p>
          <p className="font-bold">GCP-LC300-2024</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center"><p className="text-3xl font-bold">94%</p><p className="text-xs text-emerald-100">Health Score</p></div>
        <div className="text-center"><p className="text-3xl font-bold">2</p><p className="text-xs text-emerald-100">Inspections</p></div>
        <div className="text-center"><p className="text-3xl font-bold">Low</p><p className="text-xs text-emerald-100">Risk Level</p></div>
      </div>
    </div>
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
        <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center"><Car className="w-8 h-8 text-slate-400" /></div>
        <div><h4 className="font-bold text-slate-800">Toyota Land Cruiser 300 GX-R</h4><p className="text-sm text-slate-500">2022 • 28,500 km • Diesel</p></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100"><p className="text-xs text-emerald-600 mb-1">Engine Score</p><p className="text-xl font-bold text-emerald-700">96%</p></div>
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100"><p className="text-xs text-emerald-600 mb-1">Transmission</p><p className="text-xl font-bold text-emerald-700">94%</p></div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100"><p className="text-xs text-blue-600 mb-1">Exterior</p><p className="text-xl font-bold text-blue-700">88%</p></div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100"><p className="text-xs text-blue-600 mb-1">Interior</p><p className="text-xl font-bold text-blue-700">90%</p></div>
      </div>
      <button className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2">
        <Download className="w-4 h-4" />Download Full Passport
      </button>
    </div>
  </div>
);

const AIAssistant = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your Ghost Checkers AI assistant. Ask me anything about vehicle inspections, reports, or how to interpret your inspection results." }
  ]);
  const [loading, setLoading] = useState(false);

  const quickQuestions = ['Summarize my inspection report', 'What does my health score mean?', 'Show estimated repair costs', 'Compare to similar vehicles', 'Recommend local workshops', 'Explain the 150-point checklist'];

  const handleSend = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setQuestion('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    const responses = {
      'Summarize my inspection report': 'Your Toyota Land Cruiser 300 scored 94% overall. Engine (96%) and Electrical (98%) are excellent. Exterior (88%) has minor paint defects. Brake pads show expected wear at this mileage. No critical issues found. Recommended for purchase.',
      'What does my health score mean?': 'Your health score of 94% indicates excellent condition. Scores above 90% mean the vehicle meets high standards. 75-90% means good condition with minor items to monitor. Below 75% requires attention before purchase.',
      'Show estimated repair costs': 'Based on your inspection, estimated repairs: Front brake pads Ksh 8,000, Minor paint touch-up Ksh 5,000, Next service Ksh 15,000. Total estimated: Ksh 28,000 within the next 12 months.',
      'Compare to similar vehicles': 'Compared to 23 similar Toyota Land Cruiser 300 listings, your vehicle is priced 5% below average. Only 3 others have inspection reports. This vehicle has the highest score among inspected competitors.',
      'Recommend local workshops': 'Top-rated workshops near Nairobi: Toyota Kenya Service Center (5.0★), Elite Auto Care (4.8★), Master Motors (4.7★). All offer Ghost Checkers partnership discounts.',
      'Explain the 150-point checklist': 'Our 150-point inspection covers: Documentation (7pts), Exterior/Body (10pts), Engine (12pts), Transmission (5pts), Suspension (7pts), Brakes (7pts), Electrical (11pts), Interior (10pts), Test Drive (10pts), Undercarriage (7pts), Tyres (6pts), Diagnostics (7pts).',
    };
    setMessages(prev => [...prev, { role: 'assistant', content: responses[query] || 'Based on your inspection report, this vehicle shows excellent overall condition with no critical issues. Would you like more specific details?' }]);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><Bot className="w-5 h-5 text-emerald-600" /></div>
        <div><h3 className="font-bold text-slate-800">AI Assistant</h3><p className="text-xs text-slate-500">Powered by Ghost Checkers AI</p></div>
      </div>
      <div className="h-80 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}><p className="text-sm">{msg.content}</p></div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-slate-100 p-3 rounded-xl"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div></div>}
      </div>
      <div className="p-3 border-t border-slate-200">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickQuestions.map((q) => (
            <button key={q} onClick={() => handleSend(q)} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full hover:bg-slate-200">{q}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about your report..." className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          <button onClick={() => handleSend()} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"><Send className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
};

const BookingWizard = ({ packages, onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(packages.find(p => p.popular));
  const [formData, setFormData] = useState({
    vehicle: { make: '', model: '', year: '', plate: '', vin: '' },
    location: { city: '', address: '' },
    date: '', time: '',
    seller: { name: '', phone: '', email: '' },
    notes: '', payment: 'card',
  });
  const [loading, setLoading] = useState(false);
  const [bookingRef, setBookingRef] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setBookingRef(`GC-${Date.now().toString(36).toUpperCase()}`);
    setLoading(false);
  };

  if (bookingRef) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Booking Confirmed!</h2>
        <p className="text-slate-500 mb-6">Your inspection has been scheduled successfully</p>
        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <p className="text-sm text-slate-500 mb-1">Booking Reference</p>
          <p className="text-3xl font-bold text-slate-800">{bookingRef}</p>
        </div>
        <div className="text-left bg-emerald-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-3">Next Steps</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-600 mt-0.5" /><span>Confirmation SMS sent to your phone</span></li>
            <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-600 mt-0.5" /><span>Inspector will contact seller within 2 hours</span></li>
            <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-600 mt-0.5" /><span>Report delivered within 24 hours of inspection</span></li>
          </ul>
        </div>
        <button onClick={onComplete} className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl">Done</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {['Package', 'Vehicle', 'Location', 'Contact', 'Payment'].map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step > i + 1 ? <Check className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`text-xs ${step === i + 1 ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>{label}</span>
              </div>
              {i < 4 && <div className={`flex-1 h-1 mx-2 rounded ${step > i + 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="p-6">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Select Inspection Package</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} onClick={() => setSelectedPackage(pkg)} className={`cursor-pointer rounded-2xl border-2 transition-all ${selectedPackage?.id === pkg.id ? 'border-emerald-500 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                  {pkg.popular && <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-t-lg text-center">MOST POPULAR</div>}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-slate-800">{pkg.name}</h3>
                      <span className="text-lg font-bold text-emerald-600">Ksh {pkg.price.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{pkg.items} points • {pkg.duration}</p>
                    <ul className="space-y-1">
                      {pkg.features.slice(0, 4).map((f, i) => <li key={i} className="flex items-center gap-2 text-xs text-slate-600"><Check className="w-3 h-3 text-emerald-500" />{f}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Vehicle Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Make *</label><input type="text" placeholder="e.g., Toyota" value={formData.vehicle.make} onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, make: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Model *</label><input type="text" placeholder="e.g., Land Cruiser" value={formData.vehicle.model} onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, model: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Year *</label><input type="text" placeholder="e.g., 2022" value={formData.vehicle.year} onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, year: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Plate Number</label><input type="text" placeholder="e.g., KBZ 123A" value={formData.vehicle.plate} onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, plate: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">VIN (optional)</label><input type="text" placeholder="Vehicle Identification Number" value={formData.vehicle.vin} onChange={(e) => setFormData({ ...formData, vehicle: { ...formData.vehicle, vin: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" /></div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Inspection Location</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">City *</label><select value={formData.location.city} onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"><option value="">Select city</option><option value="Nairobi">Nairobi</option><option value="Mombasa">Mombasa</option><option value="Kisumu">Kisumu</option><option value="Nakuru">Nakuru</option></select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Address *</label><textarea placeholder="Street address, landmark, etc." value={formData.location.address} onChange={(e) => setFormData({ ...formData, location: { ...formData.location, address: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 h-24 resize-none" /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Preferred Date *</label><input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Preferred Time</label><select value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"><option value="">Select time</option><option value="morning">Morning (8AM - 12PM)</option><option value="afternoon">Afternoon (12PM - 4PM)</option><option value="evening">Evening (4PM - 6PM)</option></select></div>
              </div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Seller Contact</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Seller Name *</label><input type="text" placeholder="Full name" value={formData.seller.name} onChange={(e) => setFormData({ ...formData, seller: { ...formData.seller, name: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label><input type="tel" placeholder="+254..." value={formData.seller.phone} onChange={(e) => setFormData({ ...formData, seller: { ...formData.seller, phone: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" placeholder="email@example.com" value={formData.seller.email} onChange={(e) => setFormData({ ...formData, seller: { ...formData.seller, email: e.target.value } })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Special Instructions</label><textarea placeholder="Any specific areas to check, access codes, etc." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 h-24 resize-none" /></div>
            </div>
          </div>
        )}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Payment</h2>
            <div className="p-4 bg-slate-50 rounded-xl mb-4">
              <h3 className="font-semibold text-slate-800 mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Package</span><span className="font-medium text-slate-800">{selectedPackage?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-medium text-slate-800">{formData.vehicle.year} {formData.vehicle.make} {formData.vehicle.model}</span></div>
                <div className="border-t border-slate-200 pt-2 mt-2"><div className="flex justify-between"><span className="font-semibold text-slate-800">Total</span><span className="text-xl font-bold text-emerald-600">Ksh {selectedPackage?.price.toLocaleString()}</span></div></div>
              </div>
            </div>
            <div className="space-y-2">
              {[{ id: 'card', label: 'Credit/Debit Card', icon: CreditCard }, { id: 'mpesa', label: 'M-Pesa', icon: PhoneIcon }, { id: 'bank', label: 'Bank Transfer', icon: Building }].map((method) => (
                <label key={method.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${formData.payment === method.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="payment" value={method.id} checked={formData.payment === method.id} onChange={(e) => setFormData({ ...formData, payment: e.target.value })} className="sr-only" />
                  <method.icon className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-700">{method.label}</span>
                  {formData.payment === method.id && <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto" />}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between">
        <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-6 py-3 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-white disabled:opacity-50">Back</button>
        {step < 5 ? (
          <button onClick={() => setStep(step + 1)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">Continue</button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-70 flex items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}Confirm & Pay
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function GhostCheckersComplete() {
  const [showBooking, setShowBooking] = useState(false);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    setPackages([
      { id: 'basic', name: 'Basic Inspection', icon: Eye, price: 3500, items: 45, duration: '1 hour', description: 'Essential checks for budget buyers', features: ['Exterior Condition', 'Interior Condition', 'Engine Start', 'Basic Fluids'], popular: false },
      { id: 'standard', name: 'Standard Inspection', icon: Shield, price: 7500, items: 75, duration: '2 hours', description: 'Comprehensive inspection for peace of mind', features: ['All Basic checks', 'Test Drive', 'Suspension Check', 'Brake Test', 'Electrical Scan'], popular: true },
      { id: '150point', name: '150-Point Inspection', icon: ClipboardCheck, price: 15000, items: 150, duration: '3 hours', description: 'The most thorough inspection available', features: ['All Standard checks', 'Computer Diagnostics', 'Undercarriage', 'Paint Analysis', 'AI Damage Detection'], popular: false },
      { id: 'certification', name: 'Dealer Certification', icon: Award, price: 35000, items: 200, duration: '4 hours', description: 'Full certification for dealers', features: ['All 150-Point checks', 'Full Documentation', 'Market Valuation', 'Certified Badge', '12-Month Validity'], popular: false },
      { id: 'bank', name: 'Bank Inspection', icon: Building2, price: 20000, items: 180, duration: '3 hours', description: 'For financial institutions', features: ['All 150-Point checks', 'Asset Valuation', 'Condition Grading', 'Bank-Ready Report'], popular: false },
      { id: 'insurance', name: 'Insurance Inspection', icon: ShieldIcon, price: 18000, items: 165, duration: '3 hours', description: 'For pre-insurance and claims', features: ['All 150-Point checks', 'Damage Assessment', 'Valuation Report', 'Claim Documentation'], popular: false },
    ]);
  }, []);

  const inspectors = [
    { id: 1, name: 'John Kamau', photo: null, rating: 4.9, reviews: 234, location: 'Nairobi', verified: true, completed: 1245, experience: 8, certifications: ['Automotive Engineering', 'AI Diagnostics'], responseTime: '< 1 hour', available: true },
    { id: 2, name: 'Mary Wanjiku', photo: null, rating: 4.8, reviews: 189, location: 'Nairobi', verified: true, completed: 876, experience: 6, certifications: ['Mechanical Engineering', 'EV Specialist'], responseTime: '< 2 hours', available: true },
    { id: 3, name: 'Peter Otieno', photo: null, rating: 4.7, reviews: 156, location: 'Mombasa', verified: true, completed: 654, experience: 5, certifications: ['Automotive Technology'], responseTime: '< 3 hours', available: false },
    { id: 4, name: 'Grace Achieng', photo: null, rating: 4.9, reviews: 201, location: 'Kisumu', verified: true, completed: 987, experience: 7, certifications: ['Mechanical Engineering', 'Bank Certification'], responseTime: '< 2 hours', available: true },
  ];

  const coverageAreas = [
    { city: 'Nairobi', available: true, avgTime: '4 hours' },
    { city: 'Mombasa', available: true, avgTime: '6 hours' },
    { city: 'Kisumu', available: true, avgTime: '8 hours' },
    { city: 'Nakuru', available: true, avgTime: '6 hours' },
    { city: 'Eldoret', available: true, avgTime: '8 hours' },
    { city: 'Kampala', available: true, avgTime: '12 hours' },
    { city: 'Dar es Salaam', available: false, avgTime: '' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-slate-800">Ghost Checkers</span>
                <span className="text-xs text-slate-500 block">by KAYAD</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-800">How It Works</a>
              <a href="#packages" className="text-sm font-medium text-slate-600 hover:text-slate-800">Packages</a>
              <a href="#inspectors" className="text-sm font-medium text-slate-600 hover:text-slate-800">Inspectors</a>
              <a href="#portals" className="text-sm font-medium text-slate-600 hover:text-slate-800">Business</a>
              <button onClick={() => setShowBooking(true)} className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700">Book Inspection</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(16, 185, 129, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.2) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-300 font-medium text-sm">Africa's Most Trusted Inspection Service</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Know Exactly<br /><span className="text-emerald-400">What You're Buying</span>
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed">
                150-point inspections by certified engineers. AI-powered damage detection. Digital Vehicle Passports. The complete truth about every vehicle.
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => setShowBooking(true)} className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-500/25">
                  <Calendar className="w-5 h-5" />Book Inspection
                </button>
                <button className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 flex items-center gap-2 backdrop-blur">
                  <FileText className="w-5 h-5" />View Sample Report
                </button>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <TrustBadge icon={Shield} label="ISO 9001 Certified" />
                <TrustBadge icon={Bot} label="AI-Powered" />
                <TrustBadge icon={ClipboardCheck} label="150-Point Checklist" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatsCard value="45,892+" label="Inspections Completed" icon={CheckCircle2} />
              <StatsCard value="156" label="Certified Inspectors" icon={Users} />
              <StatsCard value="96.5%" label="Customer Satisfaction" icon={Star} />
              <StatsCard value="< 24h" label="Average Turnaround" icon={Clock} />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">How Ghost Checkers Works</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Three simple steps to complete vehicle transparency</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Step number={1} title="Book Online" description="Select your package, provide vehicle details, and choose a convenient time. Takes just 3 minutes." icon={Calendar} completed={false} />
            <Step number={2} title="Expert Inspection" description="Our certified inspector visits the vehicle and performs a comprehensive 150-point check with AI assistance." icon={Search} completed={false} />
            <Step number={3} title="Receive Report" description="Get your detailed digital report with photos, scores, and recommendations within 24 hours." icon={FileCheck} completed={false} />
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Inspection Packages</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Choose the level of inspection that fits your needs and budget</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} onSelect={() => setShowBooking(true)} />)}
          </div>
        </div>
      </section>

      {/* 150-Point Checklist */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">150-Point Inspection Checklist</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Every inspection covers these critical areas for complete peace of mind</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Documentation', points: 7, icon: FileText },
              { name: 'Exterior & Body', points: 10, icon: Car },
              { name: 'Engine', points: 12, icon: Settings },
              { name: 'Transmission', points: 5, icon: Disc },
              { name: 'Suspension', points: 7, icon: CircleIcon },
              { name: 'Brakes', points: 7, icon: Disc },
              { name: 'Electrical', points: 11, icon: Zap },
              { name: 'Interior', points: 10, icon: Home },
              { name: 'Test Drive', points: 10, icon: Navigation },
              { name: 'Undercarriage', points: 7, icon: ArrowDown },
              { name: 'Tyres', points: 6, icon: CircleIcon },
              { name: 'Diagnostics', points: 7, icon: Monitor },
            ].map((cat, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><cat.icon className="w-6 h-6 text-emerald-600" /></div>
                <div><p className="font-semibold text-slate-800">{cat.name}</p><p className="text-sm text-slate-500">{cat.points} points</p></div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-6 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0"><Bot className="w-7 h-7 text-white" /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">AI-Powered Damage Detection</h3>
                <p className="text-slate-600">Our advanced AI detects panel repairs, paint mismatches, rust, accident damage, and mileage anomalies with confidence scores to help you make informed decisions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Digital Vehicle Passport */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Digital Vehicle Passport</h2>
              <p className="text-slate-500 mb-6">Every inspected vehicle receives a unique digital passport that follows it through ownership changes.</p>
              <div className="space-y-4">
                {[
                  { title: 'Unique Passport ID', desc: 'Each vehicle gets a permanent ID (e.g., GCP-LC300-2024)' },
                  { title: 'Complete History', desc: 'All inspections, ownership changes, and service records' },
                  { title: 'Mileage Timeline', desc: 'Verified odometer readings from inspections' },
                  { title: 'Risk Assessment', desc: 'Low, Medium, or High risk with detailed factors' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" /><div><p className="font-semibold text-slate-800">{item.title}</p><p className="text-sm text-slate-500">{item.desc}</p></div></div>
                ))}
              </div>
            </div>
            <div><VehiclePassportPreview /></div>
          </div>
        </div>
      </section>

      {/* Inspector Network */}
      <section id="inspectors" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Certified Inspector Network</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">156 trained and verified inspectors across East Africa</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {inspectors.map((inspector) => <InspectorCard key={inspector.id} inspector={inspector} />)}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Coverage Areas</h2>
              <p className="text-slate-500 mb-6">We're expanding rapidly across East Africa</p>
              <div className="space-y-3">{coverageAreas.map((area, i) => <CoverageCity key={i} {...area} />)}</div>
            </div>
            <div id="portals">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Business Portals</h2>
              <p className="text-slate-500 mb-6">Dedicated portals for enterprise clients</p>
              <div className="grid grid-cols-2 gap-4">
                <PortalCard title="Banks" description="Vehicle valuations for loan approvals" icon={Building2} color="bg-blue-500" />
                <PortalCard title="Insurance" description="Pre-insurance and claims assessment" icon={ShieldIcon} color="bg-purple-500" />
                <PortalCard title="Fleet" description="Manage inspections across your fleet" icon={FleetIcon} color="bg-amber-500" />
                <PortalCard title="Dealers" description="Get certified and build trust" icon={Award} color="bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4">AI Report Assistant</h2>
              <p className="text-slate-500 mb-6">Get instant answers about your inspection report, estimated repairs, and recommendations.</p>
              <div className="space-y-4">
                {[
                  { q: 'What does my health score mean?', a: 'Your 94% health score indicates excellent condition. We rate scores above 90% as excellent.' },
                  { q: 'Show estimated repair costs', a: 'Based on your report, estimated repairs total Ksh 28,000 for the next 12 months.' },
                  { q: 'Compare to similar vehicles', a: 'Your vehicle is priced 5% below market average. Only 3 others have verified inspections.' },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl"><p className="font-medium text-slate-700 mb-1">{item.q}</p><p className="text-sm text-slate-500">{item.a}</p></div>
                ))}
              </div>
            </div>
            <AIAssistant />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Trusted by Thousands</h2>
            <p className="text-slate-500">See what our customers say about Ghost Checkers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard name="James Mwangi" role="Car Buyer, Nairobi" text="Ghost Checkers saved me from buying a flood-damaged vehicle. The report was comprehensive and easy to understand." rating={5} />
            <TestimonialCard name="Sarah Ochieng" role="Bank Manager, KCB" text="We use Ghost Checkers for all vehicle valuations before approving loans. Their reports are professionally detailed." rating={5} />
            <TestimonialCard name="AutoKenya Dealer" role="Verified Dealer" text="Getting Ghost Certified has increased buyer confidence and our conversion rate significantly." rating={5} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-emerald-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Don't Buy a Vehicle Without Knowing the Truth</h2>
          <p className="text-lg text-emerald-100 mb-8">Get your comprehensive inspection report today and buy with confidence.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => setShowBooking(true)} className="px-8 py-4 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 flex items-center gap-2 shadow-lg"><Calendar className="w-5 h-5" />Book Inspection</button>
            <button className="px-8 py-4 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 flex items-center gap-2 backdrop-blur"><Phone className="w-5 h-5" />Call Us</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-white" /></div>
                <span className="font-bold">Ghost Checkers</span>
              </div>
              <p className="text-slate-400 text-sm">Africa's most trusted independent vehicle inspection service, powered by KAYAD.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button className="hover:text-white">Basic Inspection</button></li>
                <li><button className="hover:text-white">150-Point Inspection</button></li>
                <li><button className="hover:text-white">Dealer Certification</button></li>
                <li><button className="hover:text-white">Bank Inspections</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button className="hover:text-white">About Us</button></li>
                <li><button className="hover:text-white">Our Inspectors</button></li>
                <li><button className="hover:text-white">Contact</button></li>
                <li><button className="hover:text-white">Careers</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>+254 700 123 456</li>
                <li>info@ghostcheckers.co.ke</li>
                <li>Nairobi, Kenya</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400 text-sm">
            <p>© 2024 Ghost Checkers by KAYAD. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowBooking(false)}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <BookingWizard packages={packages} onComplete={() => setShowBooking(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
