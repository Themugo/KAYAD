-- KAYAD production cleanup: remove vehicles inserted by the historical demo seed.
-- The original seed migration is intentionally left immutable; this forward
-- migration makes the cleanup safe for databases that already applied it.
DELETE FROM public.cars
WHERE title IN (
  'Toyota Land Cruiser V8',
  'Mercedes-Benz GLE 350d',
  'BMW X5 M Sport',
  'Land Rover Defender 110',
  'Toyota Land Cruiser Prado TX',
  'Subaru Outback 3.6R',
  'Mazda CX-5 Skyactiv',
  'Porsche Cayenne S',
  'Toyota Hilux Double Cab',
  'Honda CR-V Turbo AWD',
  'Audi Q7 55 TFSI Quattro',
  'Volkswagen Tiguan R-Line'
)
AND dealer_id IS NULL;
