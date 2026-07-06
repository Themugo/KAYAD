// Kenya-market car images — curated for local appeal (SUVs, saloons, pickups common in KE)
const CAR_IMAGE_URLS = [
  // — Toyota Land Cruiser / Large SUVs —
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=533&fit=crop',

  // — Mercedes-Benz / Luxury sedans —
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=800&h=533&fit=crop',

  // — BMW / Sport luxury —
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=533&fit=crop',

  // — Subaru / Japanese AWD —
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=533&fit=crop',

  // — Nissan / Japanese SUVs & saloons —
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=533&fit=crop',

  // — Mazda / Stylish Japanese —
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&h=533&fit=crop',

  // — Range Rover / Premium British —
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=533&fit=crop',

  // — Audi / German executive —
  'https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&h=533&fit=crop',

  // — VW / Practical German —
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=800&h=533&fit=crop',

  // — Honda / Reliable Japanese —
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&h=533&fit=crop',

  // — Toyota Hilux / Pickup king of Kenya —
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=533&fit=crop',

  // — Economy / Hatchbacks (Vitz, Demio etc) —
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=533&fit=crop',

  // — More SUVs / Crossovers (Kenya favourites) —
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=533&fit=crop',
];

const N = CAR_IMAGE_URLS.length;

export function buildCarImages(brandKeys) {
  const result = {};
  brandKeys.forEach((key, i) => {
    const start = (i * 6) % N;
    result[key] = [
      CAR_IMAGE_URLS[start],
      CAR_IMAGE_URLS[(start + 1) % N],
      CAR_IMAGE_URLS[(start + 2) % N],
      CAR_IMAGE_URLS[(start + 3) % N],
      CAR_IMAGE_URLS[(start + 4) % N],
      CAR_IMAGE_URLS[(start + 5) % N],
      CAR_IMAGE_URLS[(start + 6) % N],
      CAR_IMAGE_URLS[(start + 7) % N],
    ];
  });
  return result;
}

export const FALLBACK_IMAGE = CAR_IMAGE_URLS[0];
