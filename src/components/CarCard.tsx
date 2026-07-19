import { Calendar, Gauge, Fuel, MapPin, Shield, Gavel, ChevronRight } from 'lucide-react';

export interface Car {
  id: number;
  make: string;
  model: string;
  price: number;
  year: number;
  mileage: string;
  fuel: string;
  city: string;
  type: 'SUV' | 'Pickup' | 'Sedan' | 'Wagon';
  badges: ('escrow' | 'auction')[];
  image: string;
  transmission?: string;
}

interface CarCardProps {
  car: Car;
  onClick?: () => void;
}

export default function CarCard({ car, onClick }: CarCardProps) {
  const formatPrice = (n: number) =>
    n.toLocaleString('en-KE');

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-cream-200 hover:border-gold-500/50 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={car.image}
          alt={`${car.make} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            {car.badges.includes('escrow') && (
              <span className="card-badge bg-charcoal-900/90 text-white backdrop-blur-sm">
                <Shield size={10} />
                ESCROW
              </span>
            )}
          </div>
          {car.badges.includes('auction') && (
            <span className="card-badge bg-gold-600 text-white">
              <Gavel size={10} />
              AUCTION
            </span>
          )}
        </div>
        {/* Type pill */}
        <div className="absolute bottom-3 right-3">
          <span className="bg-white/90 backdrop-blur-sm text-warm-600 text-xs font-sans font-semibold px-3 py-1 rounded-full">
            {car.type}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="p-5">
        <p className="section-label mb-1">{car.make}</p>
        <h3 className="font-serif text-xl text-charcoal-900 font-semibold mb-3 group-hover:text-gold-600 transition-colors duration-200">
          {car.model}
        </h3>

        {/* Price */}
        <div className="mb-4">
          <p className="text-[10px] font-sans font-semibold tracking-widest text-gold-600 uppercase">Price</p>
          <p className="font-serif text-2xl text-charcoal-900 font-semibold tracking-wide">
            KES {formatPrice(car.price)}
          </p>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-4 border-t border-gold-500/20">
          <div>
            <p className="text-[9px] font-sans font-semibold tracking-widest text-warm-400 uppercase mb-0.5 flex items-center gap-1">
              <Calendar size={9} /> Year
            </p>
            <p className="font-sans text-sm font-semibold text-charcoal-800">{car.year}</p>
          </div>
          <div>
            <p className="text-[9px] font-sans font-semibold tracking-widest text-warm-400 uppercase mb-0.5 flex items-center gap-1">
              <Gauge size={9} /> Mileage
            </p>
            <p className="font-sans text-sm font-semibold text-charcoal-800">{car.mileage}</p>
          </div>
          <div>
            <p className="text-[9px] font-sans font-semibold tracking-widest text-warm-400 uppercase mb-0.5 flex items-center gap-1">
              <Fuel size={9} /> Fuel
            </p>
            <p className="font-sans text-sm font-semibold text-charcoal-800">{car.fuel}</p>
          </div>
          <div>
            <p className="text-[9px] font-sans font-semibold tracking-widest text-warm-400 uppercase mb-0.5 flex items-center gap-1">
              <MapPin size={9} /> City
            </p>
            <p className="font-sans text-sm font-semibold text-charcoal-800">{car.city}</p>
          </div>
        </div>

        {/* CTA */}
        <button className="mt-4 w-full flex items-center justify-center gap-2 text-gold-600 font-sans text-sm font-semibold py-2.5 border border-gold-600/30 rounded-xl hover:bg-gold-600 hover:text-white transition-all duration-200 group-hover:border-gold-600">
          View Details <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
