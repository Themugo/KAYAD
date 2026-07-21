import { useState } from 'react';
import { ClipboardCheck, ArrowRight, Calendar, CheckCircle2, Wrench, Eye, Zap, Droplets } from 'lucide-react';
import { CARS } from '../data/cars';
import VehicleCard, { type Car } from '../components/VehicleCard/VehicleCard';

const INSPECTION_CATEGORIES = [
  {
    icon: Wrench,
    title: 'Engine & Drivetrain',
    points: 38,
    checks: ['Engine compression test', 'Oil leaks & pressure', 'Transmission condition', 'Driveshaft & CV joints', 'Exhaust system'],
  },
  {
    icon: Eye,
    title: 'Exterior & Body',
    points: 32,
    checks: ['Panel gaps & alignment', 'Paint condition & overspray', 'Frame & chassis integrity', 'Glass & seals', 'Lights & indicators'],
  },
  {
    icon: Zap,
    title: 'Electrical Systems',
    points: 28,
    checks: ['Battery health test', 'Alternator output', 'Airbag system check', 'Central locking', 'Infotainment & sensors'],
  },
  {
    icon: Droplets,
    title: 'Interior & Safety',
    points: 22,
    checks: ['Seat belts & airbags', 'HVAC performance', 'Interior trim & upholstery', 'Dashboard warning lights', 'Braking system'],
  },
  {
    icon: ClipboardCheck,
    title: 'Documentation',
    points: 18,
    checks: ['Log book verification', 'Service history review', 'Encumbrance check', 'Insurance status', 'KRA compliance'],
  },
  {
    icon: CheckCircle2,
    title: 'Road Test',
    points: 12,
    checks: ['Cold start behaviour', 'Gear shift quality', 'Steering response', 'Braking distance', 'Suspension handling'],
  },
];

interface PreInspectionProps {
  viewCar: (car: Car) => void;
}

export default function PreInspection({ viewCar }: PreInspectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const inspectedCars = CARS.slice(0, 4);

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Hero banner */}
      <div className="relative bg-charcoal-900 pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/2533092/pexels-photo-2533092.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Pre-Inspection"
            className="w-full h-full object-cover opacity-20 object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/95 to-charcoal-900/60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label text-gold-400 mb-4">
            CERTIFIED MECHANICS · 150 POINTS · FULL REPORT
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl text-white font-bold mb-6 leading-tight">
            Pre-Inspection
          </h1>
          <p className="font-sans text-white/60 text-lg leading-relaxed max-w-xl mb-8">
            Every vehicle is checked by certified mechanics across 150 points before you commit.
            Know exactly what you're buying — no surprises after the sale.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="btn-gold">
              View Inspected Cars <ArrowRight size={16} />
            </button>
            <button className="btn-outline">
              <Calendar size={16} /> Book an Inspection
            </button>
          </div>
        </div>
      </div>

      {/* 150-point breakdown */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Comprehensive Assessment</p>
            <h2 className="section-heading">150-Point Inspection Breakdown</h2>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {INSPECTION_CATEGORIES.map(({ title }, i) => (
              <button
                key={title}
                onClick={() => setActiveTab(i)}
                className={activeTab === i ? 'pill-active' : 'pill-inactive'}
              >
                {title}
              </button>
            ))}
          </div>

          {/* Active category detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="bg-white rounded-2xl p-8 border border-cream-200">
              {(() => {
                const cat = INSPECTION_CATEGORIES[activeTab];
                const Icon = cat.icon;
                return (
                  <>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gold-600 rounded-xl flex items-center justify-center">
                        <Icon size={22} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-serif text-xl text-charcoal-900 font-semibold">{cat.title}</h3>
                        <p className="font-sans text-sm text-gold-700 font-semibold">{cat.points} inspection points</p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {cat.checks.map(check => (
                        <li key={check} className="flex items-center gap-3">
                          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                          <span className="font-sans text-sm text-charcoal-800">{check}</span>
                        </li>
                      ))}
                      <li className="flex items-center gap-3 opacity-50">
                        <CheckCircle2 size={16} className="text-warm-400 flex-shrink-0" />
                        <span className="font-sans text-sm text-warm-400">+{cat.points - cat.checks.length} more checks…</span>
                      </li>
                    </ul>
                  </>
                );
              })()}
            </div>

            {/* Category grid overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INSPECTION_CATEGORIES.map(({ icon: Icon, title, points }, i) => (
                <button
                  key={title}
                  onClick={() => setActiveTab(i)}
                  className={`text-left p-5 rounded-xl border transition-all duration-200 ${
                    activeTab === i
                      ? 'bg-gold-600/10 border-gold-600/40'
                      : 'bg-white border-cream-200 hover:border-gold-500/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${activeTab === i ? 'bg-gold-600' : 'bg-cream-200'}`}>
                    <Icon size={16} className={activeTab === i ? 'text-white' : 'text-warm-500'} />
                  </div>
                  <p className="font-sans text-xs font-semibold text-charcoal-800 mb-0.5">{title}</p>
                  <p className={`font-sans text-xs font-bold ${activeTab === i ? 'text-gold-700' : 'text-warm-400'}`}>
                    {points} pts
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Inspected cars */}
      <section className="bg-cream-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="section-label mb-2">Ready to Buy</p>
            <h2 className="section-heading">Inspected &amp; Certified Vehicles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {inspectedCars.map(car => (
              <VehicleCard key={car.id} car={car} onClick={() => viewCar(car)} />
            ))}
          </div>
        </div>
      </section>

      {/* Book inspection */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label mb-3">Own a Car to Sell?</p>
            <h2 className="section-heading">Book a Pre-Inspection</h2>
            <p className="font-sans text-warm-500 text-base mt-4">
              Get your vehicle certified by our mechanics. Certified cars sell 3x faster on KAYAD.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-cream-200 p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="font-sans text-xs font-semibold text-warm-400 tracking-wider uppercase mb-1.5 block">Full Name</label>
                <input className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl font-sans text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all" placeholder="John Mwangi" />
              </div>
              <div>
                <label className="font-sans text-xs font-semibold text-warm-400 tracking-wider uppercase mb-1.5 block">Phone Number</label>
                <input className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl font-sans text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all" placeholder="+254 700 000 000" />
              </div>
              <div>
                <label className="font-sans text-xs font-semibold text-warm-400 tracking-wider uppercase mb-1.5 block">Vehicle Make & Model</label>
                <input className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl font-sans text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all" placeholder="e.g. Toyota Land Cruiser 300" />
              </div>
              <div>
                <label className="font-sans text-xs font-semibold text-warm-400 tracking-wider uppercase mb-1.5 block">Preferred Date</label>
                <input type="date" className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl font-sans text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all text-charcoal-800" />
              </div>
            </div>
            <div className="mb-6">
              <label className="font-sans text-xs font-semibold text-warm-400 tracking-wider uppercase mb-1.5 block">Additional Notes</label>
              <textarea rows={3} className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl font-sans text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all resize-none" placeholder="Any specific concerns or areas to check..." />
            </div>
            <button className="w-full btn-gold justify-center text-base py-4">
              Book Inspection <ArrowRight size={18} />
            </button>
            <p className="font-sans text-xs text-warm-400 text-center mt-3">
              Inspection fee: KES 8,000 · Results within 24 hours
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
