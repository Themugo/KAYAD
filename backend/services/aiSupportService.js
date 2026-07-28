// backend/services/aiSupportService.js
// AI-powered support assistant service

import { logInfo, logError } from '../utils/logger.js';

export class AISupportService {
  constructor() {
    this.intents = {
      pricing: ['price', 'cost', 'how much', 'expensive', 'cheap'],
      listing: ['list', 'sell', 'post', 'add car', 'create listing'],
      buying: ['buy', 'purchase', 'get car', 'find car'],
      payment: ['pay', 'payment', 'mpesa', 'escrow', 'deposit'],
      account: ['account', 'login', 'register', 'sign up', 'profile'],
      support: ['help', 'support', 'contact', 'issue', 'problem'],
      verification: ['verify', 'verified', 'documents', 'id'],
    };
  }

  /**
   * Process user query and generate response
   */
  async processQuery(query, context = {}) {
    try {
      // Detect intent
      const intent = this.detectIntent(query);
      
      // Extract entities
      const entities = this.extractEntities(query);
      
      // Generate response based on intent
      const response = await this.generateResponse(intent, entities, context);
      
      // Track interaction for improvement
      await this.trackInteraction(query, intent, response);

      return {
        query,
        intent,
        entities,
        response,
        confidence: this.calculateConfidence(intent, entities),
      };
    } catch (error) {
      logError('Failed to process support query', { error: error.message });
      throw error;
    }
  }

  detectIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    for (const [intent, keywords] of Object.entries(this.intents)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          return intent;
        }
      }
    }

    return 'general';
  }

  extractEntities(query) {
    const entities = {};

    // Extract car brand
    const brands = ['toyota', 'nissan', 'honda', 'mazda', 'subaru', 'mitsubishi', 'mercedes', 'bmw', 'audi', 'volkswagen', 'ford', 'chevrolet'];
    for (const brand of brands) {
      if (query.toLowerCase().includes(brand)) {
        entities.brand = brand;
        break;
      }
    }

    // Extract price range
    const priceMatch = query.match(/(\d+)(?:k|ksh|sh|kes)/i);
    if (priceMatch) {
      entities.price = parseInt(priceMatch[1]) * 1000;
    }

    // Extract year
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      entities.year = parseInt(yearMatch[1]);
    }

    return entities;
  }

  async generateResponse(intent, entities, context) {
    const responses = {
      pricing: this.generatePricingResponse(entities),
      listing: this.generateListingResponse(entities),
      buying: this.generateBuyingResponse(entities),
      payment: this.generatePaymentResponse(entities),
      account: this.generateAccountResponse(entities),
      support: this.generateSupportResponse(entities),
      verification: this.generateVerificationResponse(entities),
      general: this.generateGeneralResponse(entities),
    };

    return responses[intent] || responses.general;
  }

  generatePricingResponse(entities) {
    if (entities.brand) {
      return `The price of ${entities.brand.charAt(0).toUpperCase() + entities.brand.slice(1)} vehicles varies based on model, year, condition, and mileage. Would you like me to help you find specific pricing for a particular model?`;
    }
    return 'Pricing depends on the vehicle make, model, year, condition, and mileage. I can help you get a price estimate if you provide these details.';
  }

  generateListingResponse(entities) {
    return 'To list a car for sale, you\'ll need to: 1) Create an account, 2) Get verified as a dealer, 3) Add vehicle details including photos, description, and price. Would you like step-by-step guidance?';
  }

  generateBuyingResponse(entities) {
    if (entities.brand) {
      return `I can help you find ${entities.brand.charAt(0).toUpperCase() + entities.brand.slice(1)} vehicles. What's your budget and preferred year range?`;
    }
    return 'To buy a car, you can browse our listings, filter by make, model, price, and other criteria. Once you find a car you like, you can make an offer or contact the seller directly.';
  }

  generatePaymentResponse(entities) {
    return 'We accept M-Pesa payments for deposits and full payments. All payments are held in escrow until the transaction is completed successfully. Would you like more details about our payment process?';
  }

  generateAccountResponse(entities) {
    return 'To create an account, click the "Sign Up" button and provide your email, phone number, and personal details. Dealer accounts require additional verification including business documents.';
  }

  generateSupportResponse(entities) {
    return 'I\'m here to help! You can ask me about pricing, listing cars, buying cars, payments, account management, or verification. What would you like to know?';
  }

  generateVerificationResponse(entities) {
    return 'Dealer verification requires: 1) Business registration documents, 2) ID verification, 3) Tax compliance certificate. The process typically takes 1-2 business days.';
  }

  generateGeneralResponse(entities) {
    return 'I\'m the KAYAD support assistant. I can help you with pricing, listing cars, buying cars, payments, account management, and verification. How can I assist you today?';
  }

  calculateConfidence(intent, entities) {
    let confidence = 0.5;

    if (intent !== 'general') {
      confidence += 0.3;
    }

    if (Object.keys(entities).length > 0) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1);
  }

  async trackInteraction(query, intent, response) {
    // This would track interactions for model improvement
    logInfo('Support interaction tracked', { query, intent, response });
  }

  /**
   * Get support metrics
   */
  async getMetrics(timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      // This would fetch actual metrics from a database
      return {
        totalQueries: 1000,
        resolvedQueries: 850,
        escalatedQueries: 50,
        averageResponseTime: 2.5,
        resolutionRate: 85,
      };
    } catch (error) {
      logError('Failed to get support metrics', { error: error.message });
      throw error;
    }
  }

  getStartDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1d':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }
}

export default new AISupportService();
