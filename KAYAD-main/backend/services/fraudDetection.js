export const detectFraud = (car) => {
  let score = 0;

  if (car.price < 300000) score += 30; // too cheap
  if (!car.images?.length) score += 20;
  if (!car.dealerPhone) score += 20;
  if (car.description?.length < 20) score += 10;

  return score; // higher = more suspicious
};