// backend/services/aiFraudDetectionService.js
// AI-powered fraud detection service

import FraudDetection from '../models/FraudDetection.js';
import { logInfo, logError } from '../utils/logger.js';

export class AIFraudDetectionService {
  constructor() {
    this.thresholds = {
      high: 0.8,
      medium: 0.5,
      low: 0.3,
    };
  }

  /**
   * Analyze transaction for fraud risk
   */
  async analyzeTransaction(transaction) {
    try {
      let riskScore = 0;
      const riskFactors = [];

      // Factor 1: Amount anomaly detection
      const amountRisk = this.detectAmountAnomaly(transaction.amount);
      riskScore += amountRisk.score;
      if (amountRisk.score > 0) {
        riskFactors.push({ factor: 'amount_anomaly', score: amountRisk.score, details: amountRisk.details });
      }

      // Factor 2: Frequency analysis
      const frequencyRisk = await this.detectFrequencyAnomaly(transaction.userId);
      riskScore += frequencyRisk.score;
      if (frequencyRisk.score > 0) {
        riskFactors.push({ factor: 'frequency_anomaly', score: frequencyRisk.score, details: frequencyRisk.details });
      }

      // Factor 3: Location anomaly
      const locationRisk = this.detectLocationAnomaly(transaction.location, transaction.userLocation);
      riskScore += locationRisk.score;
      if (locationRisk.score > 0) {
        riskFactors.push({ factor: 'location_anomaly', score: locationRisk.score, details: locationRisk.details });
      }

      // Factor 4: Device fingerprint
      const deviceRisk = this.detectDeviceAnomaly(transaction.deviceId, transaction.userDevices);
      riskScore += deviceRisk.score;
      if (deviceRisk.score > 0) {
        riskFactors.push({ factor: 'device_anomaly', score: deviceRisk.score, details: deviceRisk.details });
      }

      // Factor 5: Behavioral pattern
      const behaviorRisk = await this.detectBehavioralAnomaly(transaction.userId, transaction.action);
      riskScore += behaviorRisk.score;
      if (behaviorRisk.score > 0) {
        riskFactors.push({ factor: 'behavioral_anomaly', score: behaviorRisk.score, details: behaviorRisk.details });
      }

      // Normalize risk score to 0-1
      const normalizedScore = Math.min(riskScore / 5, 1);

      // Determine risk level
      let riskLevel = 'low';
      if (normalizedScore >= this.thresholds.high) {
        riskLevel = 'high';
      } else if (normalizedScore >= this.thresholds.medium) {
        riskLevel = 'medium';
      }

      // Store fraud detection result
      await FraudDetection.create({
        transactionId: transaction.id,
        userId: transaction.userId,
        riskScore: normalizedScore,
        riskLevel,
        riskFactors,
        timestamp: new Date(),
      });

      return {
        riskScore: normalizedScore,
        riskLevel,
        riskFactors,
        recommendation: this.getRecommendation(riskLevel),
      };
    } catch (error) {
      logError('Failed to analyze transaction for fraud', { error: error.message });
      throw error;
    }
  }

  detectAmountAnomaly(amount) {
    // Simple anomaly detection based on amount ranges
    if (amount > 1000000) {
      return { score: 0.4, details: 'Amount exceeds typical range' };
    }
    if (amount < 100) {
      return { score: 0.2, details: 'Amount unusually low' };
    }
    return { score: 0, details: 'Amount within normal range' };
  }

  async detectFrequencyAnomaly(userId) {
    // Check transaction frequency in last hour
    const recentTransactions = await FraudDetection.countDocuments({
      userId,
      timestamp: { $gte: new Date(Date.now() - 3600000) },
    });

    if (recentTransactions > 10) {
      return { score: 0.5, details: `High transaction frequency: ${recentTransactions} in last hour` };
    }
    if (recentTransactions > 5) {
      return { score: 0.2, details: `Elevated transaction frequency: ${recentTransactions} in last hour` };
    }
    return { score: 0, details: 'Normal transaction frequency' };
  }

  detectLocationAnomaly(transactionLocation, userLocation) {
    if (!transactionLocation || !userLocation) {
      return { score: 0, details: 'Location data unavailable' };
    }

    const distance = this.calculateDistance(transactionLocation, userLocation);
    if (distance > 1000) { // 1000 km
      return { score: 0.6, details: `Location anomaly: ${distance.toFixed(2)} km from user location` };
    }
    if (distance > 500) {
      return { score: 0.3, details: `Unusual location: ${distance.toFixed(2)} km from user location` };
    }
    return { score: 0, details: 'Location within normal range' };
  }

  detectDeviceAnomaly(deviceId, userDevices) {
    if (!userDevices || !userDevices.includes(deviceId)) {
      return { score: 0.5, details: 'New device detected' };
    }
    return { score: 0, details: 'Known device' };
  }

  async detectBehavioralAnomaly(userId, action) {
    // Check if this action is typical for the user
    const userHistory = await FraudDetection.find({ userId }).sort({ timestamp: -1 }).limit(10);
    
    const actionCounts = {};
    userHistory.forEach(record => {
      const actionType = record.action || 'unknown';
      actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
    });

    const typicalAction = Object.keys(actionCounts).reduce((a, b) => actionCounts[a] > actionCounts[b] ? a : b, 'unknown');
    
    if (action !== typicalAction && actionCounts[action] === 0) {
      return { score: 0.3, details: `Unusual action: ${action} (typical: ${typicalAction})` };
    }
    return { score: 0, details: 'Normal behavioral pattern' };
  }

  calculateDistance(loc1, loc2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.lat - loc1.lat);
    const dLon = this.toRad(loc2.lng - loc1.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(loc1.lat)) * Math.cos(this.toRad(loc2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  getRecommendation(riskLevel) {
    switch (riskLevel) {
      case 'high':
        return 'Block transaction and require manual review';
      case 'medium':
        return 'Require additional verification';
      case 'low':
        return 'Proceed with transaction';
      default:
        return 'Proceed with transaction';
    }
  }

  /**
   * Get fraud detection metrics
   */
  async getMetrics(timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const totalDetections = await FraudDetection.countDocuments({
        timestamp: { $gte: startDate },
      });

      const highRisk = await FraudDetection.countDocuments({
        timestamp: { $gte: startDate },
        riskLevel: 'high',
      });

      const mediumRisk = await FraudDetection.countDocuments({
        timestamp: { $gte: startDate },
        riskLevel: 'medium',
      });

      const lowRisk = await FraudDetection.countDocuments({
        timestamp: { $gte: startDate },
        riskLevel: 'low',
      });

      const averageRiskScore = await FraudDetection.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: null, avgScore: { $avg: '$riskScore' } } },
      ]);

      return {
        totalDetections,
        highRisk,
        mediumRisk,
        lowRisk,
        averageRiskScore: averageRiskScore[0]?.avgScore || 0,
        highRiskRate: totalDetections > 0 ? (highRisk / totalDetections) * 100 : 0,
      };
    } catch (error) {
      logError('Failed to get fraud detection metrics', { error: error.message });
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

export default new AIFraudDetectionService();
