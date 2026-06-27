import { recommendPrice, batchRecommendPrices } from "./valuationService.js";

export class AIPricingService {
  async recommendPrice(carId) { return recommendPrice(carId); }
  async batchRecommendPrices(carIds) { return batchRecommendPrices(carIds); }
}

export default new AIPricingService();
