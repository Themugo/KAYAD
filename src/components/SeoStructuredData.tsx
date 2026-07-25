import { useEffect } from 'react';

const BASE = 'https://www.kayad.space';

function inject(json: any): () => void {
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(json);
  document.head.appendChild(el);
  return () => el.remove();
}

interface VehicleStructuredDataProps {
  car: any;
}

export function VehicleStructuredData({ car }: VehicleStructuredDataProps) {
  useEffect(() => {
    if (!car?._id) return;
    const price = car.currentBid || car.price || 0;
    const img = car.images?.[0]?.url || car.images?.[0] || '';
    return inject({
      '@context': 'https://schema.org',
      '@type': 'Vehicle',
      '@id': `${BASE}/cars/${car._id}`,
      url: `${BASE}/cars/${car._id}`,
      name: car.title,
      description: car.description || `${car.year} ${car.brand} ${car.model} for sale in ${car.location?.city || 'Kenya'}`,
      image: img,
      brand: { '@type': 'Brand', name: car.brand },
      model: car.model,
      vehicleIdentificationNumber: car.vin,
      vehicleTransmission: car.transmission,
      fuelType: car.fuel,
      vehicleEngine: car.engine ? { '@type': 'EngineSpecification', name: car.engine } : undefined,
      mileageFromOdometer: car.mileage ? { '@type': 'QuantitativeValue', value: car.mileage, unitCode: 'KMT' } : undefined,
      bodyType: car.bodyType,
      color: car.color,
      vehicleConfiguration: car.drivetrain,
      productionDate: car.year ? `${car.year}` : undefined,
      condition: car.condition === 'new' ? 'https://schema.org/NewCondition' : car.condition === 'used' ? 'https://schema.org/UsedCondition' : undefined,
      offers: {
        '@type': 'Offer',
        price: price,
        priceCurrency: 'KES',
        availability: car.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        url: `${BASE}/cars/${car._id}`,
        seller: car.dealer ? {
          '@type': car.dealer.role === 'dealer' ? 'AutoDealer' : 'Person',
          name: car.dealer.businessName || car.dealer.name || 'Seller',
          telephone: car.dealer.phone,
          email: car.dealer.email,
        } : undefined,
      },
      ...(car.auctionStatus === 'live' ? {
        additionalProperty: {
          '@type': 'PropertyValue',
          name: 'Auction',
          value: 'Live',
        },
      } : {}),
    });
  }, [car]);
  return null;
}

export function WebSiteStructuredData() {
  useEffect(() => inject({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: BASE,
    name: 'Kayad',
    description: "Kenya's Premium Car Marketplace",
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE}/showroom?brand={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }), []);
  return null;
}

interface ItemListStructuredDataProps {
  items: any[];
}

export function ItemListStructuredData({ items }: ItemListStructuredDataProps) {
  useEffect(() => {
    if (!items?.length) return;
    return inject({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: items.slice(0, 20).map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE}/cars/${item._id}`,
        name: item.title || `${item.brand} ${item.model}`,
      })),
    });
  }, [items]);
  return null;
}

interface BreadcrumbStructuredDataProps {
  items: Array<{ name: string; url: string }>;
}

export function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  useEffect(() => {
    if (!items?.length) return;
    return inject({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: item.url.startsWith('http') ? item.url : `${BASE}${item.url}`,
      })),
    });
  }, [items]);
  return null;
}
