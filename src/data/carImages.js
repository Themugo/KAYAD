// Kenya-market car images — curated for local appeal (SUVs, saloons, pickups common in KE)
const CAR_IMAGE_URLS = [
  // — Toyota Land Cruiser / Large SUVs —
  'https://images.unsplash.com/photo-1606664514617-d3a39beb7b5e?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1606664444110-0c1e1e84b8fe?w=800&h=533&fit=crop',

  // — Mercedes-Benz / Luxury sedans —
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d1?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&h=533&fit=crop',

  // — BMW / Sport luxury —
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1556189250-72ea1b8b5b1f?w=800&h=533&fit=crop',

  // — Subaru / Japanese AWD —
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=533&fit=crop',

  // — Nissan / Japanese SUVs & saloons —
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=533&fit=crop',

  // — Mazda / Stylish Japanese —
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&h=533&fit=crop',

  // — Range Rover / Premium British —
  'https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1603584173870-7f23fd4c2b4b?w=800&h=533&fit=crop',

  // — Audi / German executive —
  'https://images.unsplash.com/photo-1606664514617-d3a39beb7b5e?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&h=533&fit=crop',

  // — VW / Practical German —
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1570733117311-d990c3816c47?w=800&h=533&fit=crop',

  // — Honda / Reliable Japanese —
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=533&fit=crop',

  // — Toyota Hilux / Pickup king of Kenya —
  'https://images.unsplash.com/photo-1583267746897-3e42c7e14754?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=800&h=533&fit=crop',

  // — Economy / Hatchbacks (Vitz, Demio etc) —
  'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1511919886926-f7fb7d0c6e2c?w=800&h=533&fit=crop',

  // — More SUVs / Crossovers (Kenya favourites) —
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1554744511-0d3d7f8b0a1e?w=800&h=533&fit=crop',
  'https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=800&h=533&fit=crop',
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
