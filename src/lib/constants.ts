export const BRANDS = [
  'Toyota', 'Mercedes-Benz', 'BMW', 'Volkswagen', 'Nissan',
  'Honda', 'Mazda', 'Subaru', 'Audi', 'Land Rover',
  'Hyundai', 'Kia', 'Mitsubishi', 'Ford', 'Isuzu',
  'Lexus', 'Porsche', 'Jaguar', 'Volvo', 'Suzuki',
] as const;

export const BODY_TYPES = ['sedan', 'suv', 'hatchback', 'coupe', 'truck', 'van', 'convertible', 'wagon'] as const;
export const FUEL_TYPES = ['petrol', 'diesel', 'hybrid', 'electric'] as const;
export const TRANSMISSIONS = ['automatic', 'manual'] as const;
export const CONDITIONS = ['new', 'foreign_used', 'local_used'] as const;

export const KENYAN_LOCATIONS = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
  'Thika', 'Malindi', 'Kitale', 'Nyeri', 'Nanyuki',
] as const;

export const KES_FORMATTER = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

export const MIN_BID_INCREMENT = 5000;
