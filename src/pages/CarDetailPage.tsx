import { useParams } from 'react-router-dom';
import CarDetail from './CarDetail';
import { CARS } from '../data/cars';

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const car = CARS.find(c => String(c.id) === id) || CARS[0];
  
  return (
    <CarDetail 
      car={car}
      setPage={() => {}}
      viewCar={() => {}}
    />
  );
}
