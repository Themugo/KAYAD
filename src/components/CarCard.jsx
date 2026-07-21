/**
 * CarCard - Legacy wrapper for backward compatibility
 * 
 * This component is deprecated. Please use VehicleCard instead.
 * 
 * @example
 * import VehicleCard from './components/VehicleCard';
 * 
 * <VehicleCard car={carData} />
 */

import { memo } from 'react';
import VehicleCard from './VehicleCard/VehicleCard';

const CarCard = memo(({ car, onSave, onCompare, showCompare, ...props }) => {
  return (
    <VehicleCard
      car={car}
      showCompare={showCompare}
      onSave={onSave}
      onCompare={onCompare}
      {...props}
    />
  );
});

CarCard.displayName = 'CarCard';

export default CarCard;

// Also export the new VehicleCard for direct usage
export { default as VehicleCard } from './VehicleCard/VehicleCard';
export { VehicleCardSkeleton } from './VehicleCard/VehicleCard';
