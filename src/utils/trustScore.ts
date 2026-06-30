/**
 * Trust Score Engine
 * Calculates a trust score (0-100) for dealers and sellers based on various factors
 * including verification status, transaction history, reviews, and platform tenure.
 */

export interface TrustScoreFactors {
  verified: boolean;
  verifications: string[];
  totalTransactions: number;
  successfulTransactions: number;
  dealerRating: number;
  yearsActive: number;
  responseTime?: number; // in hours
  disputeRate?: number; // percentage
  escrowCompliance?: number; // percentage
  listingQuality?: number; // average quality score
  ntsaVerified?: boolean;
  businessVerified?: boolean;
  physicalVerified?: boolean;
}

export interface TrustScoreResult {
  score: number;
  level: 'Low' | 'Medium' | 'High' | 'Excellent';
  factors: TrustScoreFactors;
  breakdown: {
    category: string;
    score: number;
    maxScore: number;
    weight: number;
  }[];
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
}

export function calculateTrustScore(factors: Partial<TrustScoreFactors>): TrustScoreResult {
  const f: TrustScoreFactors = {
    verified: factors.verified || false,
    verifications: factors.verifications || [],
    totalTransactions: factors.totalTransactions || 0,
    successfulTransactions: factors.successfulTransactions || factors.totalTransactions || 0,
    dealerRating: factors.dealerRating || 0,
    yearsActive: factors.yearsActive || 0,
    responseTime: factors.responseTime,
    disputeRate: factors.disputeRate || 0,
    escrowCompliance: factors.escrowCompliance || 100,
    listingQuality: factors.listingQuality || 0,
    ntsaVerified: factors.ntsaVerified || false,
    businessVerified: factors.businessVerified || false,
    physicalVerified: factors.physicalVerified || false,
  };

  const breakdown: { category: string; score: number; maxScore: number; weight: number }[] = [];
  const suggestions: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Verification Score (25 points)
  const verificationScore = calculateVerificationScore(f);
  breakdown.push({ category: 'Verification', score: verificationScore, maxScore: 25, weight: 0.25 });
  if (verificationScore >= 20) strengths.push('Strong verification profile');
  else if (verificationScore < 10) { weaknesses.push('Incomplete verification'); suggestions.push('Complete all verification steps'); }

  // Transaction History Score (25 points)
  const transactionScore = calculateTransactionScore(f);
  breakdown.push({ category: 'Transactions', score: transactionScore, maxScore: 25, weight: 0.25 });
  if (transactionScore >= 20) strengths.push('Proven transaction history');
  else if (transactionScore < 10) { weaknesses.push('Limited transaction history'); suggestions.push('Build transaction volume'); }

  // Rating Score (20 points)
  const ratingScore = calculateRatingScore(f);
  breakdown.push({ category: 'Rating', score: ratingScore, maxScore: 20, weight: 0.20 });
  if (ratingScore >= 16) strengths.push('Excellent customer ratings');
  else if (ratingScore < 10) { weaknesses.push('Below-average ratings'); suggestions.push('Improve customer service'); }

  // Tenure Score (15 points)
  const tenureScore = calculateTenureScore(f);
  breakdown.push({ category: 'Tenure', score: tenureScore, maxScore: 15, weight: 0.15 });
  if (tenureScore >= 12) strengths.push('Established platform presence');
  else if (tenureScore < 5) weaknesses.push('New to platform');

  // Compliance Score (15 points)
  const complianceScore = calculateComplianceScore(f);
  breakdown.push({ category: 'Compliance', score: complianceScore, maxScore: 15, weight: 0.15 });
  if (complianceScore >= 12) strengths.push('Strong compliance record');
  else if (complianceScore < 8) { weaknesses.push('Compliance concerns'); suggestions.push('Improve escrow compliance'); }

  const totalScore = breakdown.reduce((sum, item) => sum + item.score, 0);

  let level: 'Low' | 'Medium' | 'High' | 'Excellent';
  if (totalScore >= 85) level = 'Excellent';
  else if (totalScore >= 65) level = 'High';
  else if (totalScore >= 40) level = 'Medium';
  else level = 'Low';

  return {
    score: totalScore,
    level,
    factors: f,
    breakdown,
    suggestions,
    strengths,
    weaknesses,
  };
}

function calculateVerificationScore(f: TrustScoreFactors): number {
  let score = 0;
  if (f.verified) score += 5;
  
  const verificationWeights: Record<string, number> = {
    email: 3,
    phone: 3,
    id: 4,
    business: 5,
    ntsa: 4,
    physical: 4,
  };
  
  f.verifications.forEach(v => {
    score += verificationWeights[v] || 0;
  });
  
  if (f.ntsaVerified) score += 2;
  if (f.businessVerified) score += 2;
  if (f.physicalVerified) score += 2;
  
  return Math.min(score, 25);
}

function calculateTransactionScore(f: TrustScoreFactors): number {
  if (f.totalTransactions === 0) return 0;
  
  let score = 0;
  
  // Volume score (up to 15 points)
  if (f.totalTransactions >= 100) score += 15;
  else if (f.totalTransactions >= 50) score += 12;
  else if (f.totalTransactions >= 25) score += 9;
  else if (f.totalTransactions >= 10) score += 6;
  else if (f.totalTransactions >= 5) score += 3;
  
  // Success rate score (up to 10 points)
  const successRate = f.totalTransactions > 0 ? (f.successfulTransactions / f.totalTransactions) * 100 : 0;
  if (successRate >= 95) score += 10;
  else if (successRate >= 90) score += 8;
  else if (successRate >= 80) score += 6;
  else if (successRate >= 70) score += 4;
  else score += 2;
  
  return Math.min(score, 25);
}

function calculateRatingScore(f: TrustScoreFactors): number {
  if (f.dealerRating === 0) return 0;
  
  const rating = f.dealerRating;
  if (rating >= 4.8) return 20;
  if (rating >= 4.5) return 18;
  if (rating >= 4.0) return 15;
  if (rating >= 3.5) return 12;
  if (rating >= 3.0) return 9;
  if (rating >= 2.5) return 6;
  return 3;
}

function calculateTenureScore(f: TrustScoreFactors): number {
  const years = f.yearsActive;
  if (years >= 5) return 15;
  if (years >= 3) return 12;
  if (years >= 2) return 9;
  if (years >= 1) return 6;
  if (years >= 0.5) return 3;
  return 0;
}

function calculateComplianceScore(f: TrustScoreFactors): number {
  let score = 0;
  
  // Escrow compliance (up to 8 points)
  if (f.escrowCompliance !== undefined) {
    if (f.escrowCompliance >= 95) score += 8;
    else if (f.escrowCompliance >= 90) score += 6;
    else if (f.escrowCompliance >= 80) score += 4;
    else score += 2;
  }
  
  // Dispute rate (up to 4 points) - lower is better
  if (f.disputeRate !== undefined) {
    if (f.disputeRate <= 2) score += 4;
    else if (f.disputeRate <= 5) score += 3;
    else if (f.disputeRate <= 10) score += 2;
    else score += 1;
  }
  
  // Listing quality (up to 3 points)
  if (f.listingQuality !== undefined) {
    if (f.listingQuality >= 80) score += 3;
    else if (f.listingQuality >= 60) score += 2;
    else score += 1;
  }
  
  return Math.min(score, 15);
}

export function getTrustScoreColor(score: number): string {
  if (score >= 85) return '#22C55E';
  if (score >= 65) return '#84CC16';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

export function getTrustScoreGradient(score: number): string {
  if (score >= 85) return 'linear-gradient(135deg, #22C55E, #16A34A)';
  if (score >= 65) return 'linear-gradient(135deg, #84CC16, #65A30D)';
  if (score >= 40) return 'linear-gradient(135deg, #F59E0B, #D97706)';
  return 'linear-gradient(135deg, #EF4444, #DC2626)';
}

export function getTrustScoreIcon(level: string): string {
  switch (level) {
    case 'Excellent': return '🏆';
    case 'High': return '⭐';
    case 'Medium': return '✓';
    case 'Low': return '⚠';
    default: return '?';
  }
}
