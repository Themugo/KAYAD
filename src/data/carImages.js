const CAR_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d1?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1603584173870-7f23fd4c2b4b?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1606664444110-0c1e1e84b8fe?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1511919886926-f7fb7d0c6e2c?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1570733117311-d990c3816c47?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1605816988069-b11383b5076e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1583267746897-3e42c7e14754?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&h=400&fit=crop',
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
