-- KAYAD canonical inspection convergence.
-- Booking lifecycle remains in inspection_bookings; execution remains in
-- vehicle_inspections. The nullable one-to-one link prevents a second
-- inspection execution model while preserving existing bookings.

ALTER TABLE public.vehicle_inspections
  ADD COLUMN IF NOT EXISTS inspection_booking_id UUID
  REFERENCES public.inspection_bookings(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_inspections_booking
  ON public.vehicle_inspections(inspection_booking_id)
  WHERE inspection_booking_id IS NOT NULL;

ALTER TABLE public.inspection_bookings
  ADD COLUMN IF NOT EXISTS vehicle_inspection_id UUID
  REFERENCES public.vehicle_inspections(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_bookings_vehicle_inspection
  ON public.inspection_bookings(vehicle_inspection_id)
  WHERE vehicle_inspection_id IS NOT NULL;
