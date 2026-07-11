import { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';

function CarCardInner({ car }) {
  const [fav, setFav] = useState(false);

  const id = car._id || car.id;
  const images = car.images?.map(img => typeof img === 'string' ? img : img.url).filter(Boolean) || [];
  const primaryImage = images[0] || car.image || 'https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg?auto=compress&cs=tinysrgb&w=800';

  const isAuction = car.auction_status === 'live' || car.isAuction;
  const isLive = car.auction_status === 'live' || car.isLive;

  const price = isAuction && car.currentBid > 0 ? car.currentBid : car.price;
  const dealer = car.dealer?.business_name || car.dealer?.name || car.dealerName || 'Nairobi Auto Hub Ltd';
  const mileage = car.mileage != null
    ? (typeof car.mileage === 'number' ? `${Math.round(car.mileage / 1000)}k km` : car.mileage)
    : null;
  const fuel = car.fuel || null;
  const location = car.location?.city || (typeof car.location === 'string' ? car.location : null) || 'Nairobi';

  const handleFav = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setFav(f => !f);
  }, []);

  return (
    <Link
      to={`/cars/${id}`}
      className="kd-car-card"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      {/* Image */}
      <div className="kd-car-card__img-wrap">
        <img
          src={primaryImage}
          alt={car.title}
          loading="lazy"
          className="kd-car-card__img"
        />
        {isLive && (
          <span className="kd-car-card__live-badge">
            <span className="live-dot" /> LIVE
          </span>
        )}
        <button
          className={`kd-car-card__fav${fav ? ' kd-car-card__fav--active' : ''}`}
          onClick={handleFav}
          aria-label={fav ? 'Remove from favorites' : 'Save'}
        >
          {fav ? '♥' : '♡'}
        </button>
      </div>

      {/* Body */}
      <div className="kd-car-card__body">
        <h3 className="kd-car-card__title">{car.title}</h3>
        <p className="kd-car-card__dealer">{dealer}</p>
        <p className="kd-car-card__price">
          KES {(price || 0).toLocaleString()}
        </p>
        <div className="kd-car-card__meta">
          {mileage && (
            <span className="kd-car-card__meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              {mileage}
            </span>
          )}
          {fuel && (
            <span className="kd-car-card__meta-item">{fuel}</span>
          )}
          <span className="kd-car-card__meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {location}
          </span>
        </div>
      </div>
    </Link>
  );
}

const CarCard = memo(CarCardInner);
export default CarCard;
