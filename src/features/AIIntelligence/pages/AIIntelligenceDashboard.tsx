// ============================================================
// KAYAD AI INTELLIGENCE & DECISION ENGINE
// AI INTELLIGENCE DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Car,
  Users,
  Gavel,
  Shield,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Target,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Info,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  amber: '#f59e0b',
  red: '#ef4444',
  orange: '#ea580c',
  purple: '#8b5cf6',
};

// Sample AI Recommendations
const BUYER_RECOMMENDATIONS = [
  {
    id: 1,
    type: 'vehicle_recommendation',
    title: '2022 Toyota Corolla - 92% Match',
    description: 'Based on your budget of KES 2.8M and preference for fuel efficiency, this vehicle scores highest on compatibility.',
    price: 2850000,
    confidence: 92,
    reasons: ['Matches your budget', 'Low mileage (15,000km)', 'Excellent reliability score', '3 previous owners'],
    evidence: 'Based on 12 similar sales in Nairobi',
    source: 'Marketplace Data',
  },
  {
    id: 2,
    type: 'cost_estimate',
    title: 'Estimated Monthly Ownership Cost',
    description: 'Total monthly cost breakdown for this vehicle category',
    breakdown: { fuel: 12000, maintenance: 8000, insurance: 5000, depreciation: 15000 },
    total: 40000,
    confidence: 85,
  },
];

const SELLER_RECOMMENDATIONS = [
  {
    id: 1,
    type: 'pricing',
    title: 'Optimal Listing Price',
    description: 'Based on current market conditions and similar vehicles',
    recommended: 2750000,
    range: { min: 2550000, max: 2950000 },
    confidence: 88,
    factors: [
      { name: 'Market Comparison', impact: '+2%' },
      { name: 'Mileage Adjustment', impact: '-5%' },
      { name: 'Condition Bonus', impact: '+3%' },
    ],
  },
  {
    id: 2,
    type: 'improvements',
    title: 'Listing Quality Score: 78/100',
    description: 'Key improvements to increase visibility',
    suggestions: [
      { category: 'Photos', score: 65, suggestion: 'Add 5 more photos including interior details' },
      { category: 'Description', score: 70, suggestion: 'Include service history and notable features' },
      { category: 'Pricing', score: 85, suggestion: 'Price is competitive for this market' },
    ],
  },
];

const FRAUD_ALERTS = [
  { id: 1, type: 'duplicate_listing', severity: 'high', title: 'Possible Duplicate Listing', description: 'VIN matches existing active listing', entity: 'Listing #12345', time: '2 hours ago' },
  { id: 2, type: 'price_manipulation', severity: 'medium', title: 'Suspiciously Low Price', description: 'Listed 40% below market value', entity: 'Listing #12398', time: '5 hours ago' },
  { id: 3, type: 'image_reuse', severity: 'low', title: 'Photos Previously Used', description: 'Image hash matches other listings', entity: 'Listing #12401', time: '1 day ago' },
];

const MARKET_INSIGHTS = [
  { type: 'trend', title: 'SUV Segment Up 15%', description: 'SUV demand continues to grow with average prices increasing 4-6%', impact: 'positive' },
  { type: 'opportunity', title: 'Pre-owned EV Interest', description: 'Growing interest in electric vehicles creating new market segment', impact: 'opportunity' },
  { type: 'risk', title: 'Import Delays Expected', description: 'Port congestion may affect vehicle availability in Q2', impact: 'negative' },
];

const AI_CATEGORIES = [
  { id: 'buyer', label: 'Buyer AI', icon: <Users size={20} />, description: 'Vehicle recommendations & cost analysis' },
  { id: 'seller', label: 'Seller AI', icon: <Car size={20} />, description: 'Pricing & listing optimization' },
  { id: 'dealer', label: 'Dealer AI', icon: <BarChart3 size={20} />, description: 'Inventory & sales insights' },
  { id: 'fraud', label: 'Fraud Detection', icon: <Shield size={20} />, description: 'Pattern detection & alerts' },
  { id: 'market', label: 'Market Intelligence', icon: <TrendingUp size={20} />, description: 'Trends & analytics' },
  { id: 'auction', label: 'Auction AI', icon: <Gavel size={20} />, description: 'Bid optimization' },
];

const CONFIDENCE_LEVELS = [
  { range: [90, 100], label: 'Very High', color: KAYAD_COLORS.emerald },
  { range: [75, 89], label: 'High', color: '#22c55e' },
  { range: [60, 74], label: 'Medium', color: KAYAD_COLORS.amber },
  { range: [0, 59], label: 'Low', color: KAYAD_COLORS.red },
];

export default function AIIntelligenceDashboard() {
  const [activeCategory, setActiveCategory] = useState('buyer');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  const getConfidenceInfo = (score: number) => {
    return CONFIDENCE_LEVELS.find(cl => score >= cl.range[0] && score <= cl.range[1]) || CONFIDENCE_LEVELS[3];
  };

  const handleFeedback = (itemId: string, helpful: boolean) => {
    setFeedbackGiven(prev => ({ ...prev, [itemId]: helpful }));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Brain size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Intelligence</h1>
                <p className="text-sm opacity-80">Powered by KAYAD Decision Engine</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2" style={{ backgroundColor: `${KAYAD_COLORS.emerald}`, color: KAYAD_COLORS.white }}>
                <Sparkles size={14} />
                AI Active
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* AI Categories */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {AI_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`p-4 rounded-xl text-center transition-all ${
                activeCategory === category.id ? 'shadow-md' : ''
              }`}
              style={{
                backgroundColor: activeCategory === category.id ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                color: activeCategory === category.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              <div className="mx-auto mb-2">{category.icon}</div>
              <p className="font-medium text-sm">{category.label}</p>
            </button>
          ))}
        </div>

        {/* Buyer AI */}
        {activeCategory === 'buyer' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Buyer AI Recommendations</h2>
              <div className="flex items-center gap-2 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                <Info size={16} />
                Recommendations based on verified marketplace data
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {BUYER_RECOMMENDATIONS.map((rec) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-6 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.purple}15` }}>
                        <Car size={24} style={{ color: KAYAD_COLORS.purple }} />
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{rec.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: `${getConfidenceInfo(rec.confidence).color}20`, color: getConfidenceInfo(rec.confidence).color }}
                          >
                            {rec.confidence}% Confidence
                          </span>
                        </div>
                      </div>
                    </div>
                    {!feedbackGiven[rec.id] && (
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleFeedback(String(rec.id), true)}
                          className="p-1.5 rounded hover:bg-gray-100"
                          title="Helpful"
                        >
                          <ThumbsUp size={16} style={{ color: KAYAD_COLORS.softBlue }} />
                        </button>
                        <button 
                          onClick={() => handleFeedback(String(rec.id), false)}
                          className="p-1.5 rounded hover:bg-gray-100"
                          title="Not Helpful"
                        >
                          <ThumbsDown size={16} style={{ color: KAYAD_COLORS.softBlue }} />
                        </button>
                      </div>
                    )}
                    {feedbackGiven[rec.id] && (
                      <CheckCircle size={20} style={{ color: KAYAD_COLORS.emerald }} />
                    )}
                  </div>

                  <p className="text-sm mb-4" style={{ color: KAYAD_COLORS.softBlue }}>{rec.description}</p>

                  {'price' in rec && (
                    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Estimated Price</p>
                      <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                        KES {rec.price.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {'reasons' in rec && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>Why This Recommendation?</p>
                      <ul className="space-y-1">
                        {rec.reasons.map((reason, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                            <CheckCircle size={14} style={{ color: KAYAD_COLORS.emerald }} />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-4 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: KAYAD_COLORS.softBlue }}>
                      <Eye size={12} />
                      Evidence: {rec.evidence}
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                      <Target size={12} />
                      Data Source: {rec.source}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Seller AI */}
        {activeCategory === 'seller' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Seller AI Insights</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {SELLER_RECOMMENDATIONS.map((rec) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-6 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.emerald}15` }}>
                      <TrendingUp size={24} style={{ color: KAYAD_COLORS.emerald }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{rec.title}</h3>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{rec.description}</p>
                    </div>
                  </div>

                  {'recommended' in rec && (
                    <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Recommended Price</p>
                      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>
                        KES {rec.recommended.toLocaleString()}
                      </p>
                      <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                        Range: KES {rec.range.min.toLocaleString()} - {rec.range.max.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {'factors' in rec && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>Pricing Factors</p>
                      {rec.factors.map((factor, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                          <span style={{ color: KAYAD_COLORS.softBlue }}>{factor.name}</span>
                          <span style={{ color: factor.impact.startsWith('+') ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                            {factor.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {'suggestions' in rec && (
                    <div className="space-y-3">
                      {rec.suggestions.map((sug, i) => (
                        <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{sug.category}</span>
                            <span className="text-sm" style={{ color: sug.score >= 80 ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber }}>
                              {sug.score}/100
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{sug.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Fraud Detection */}
        {activeCategory === 'fraud' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Fraud Detection Alerts</h2>
              <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${KAYAD_COLORS.amber}20`, color: KAYAD_COLORS.amber }}>
                {FRAUD_ALERTS.length} Active Alerts
              </span>
            </div>

            <div className="space-y-4">
              {FRAUD_ALERTS.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl p-4 border-l-4 shadow-md"
                  style={{
                    backgroundColor: KAYAD_COLORS.white,
                    borderLeftColor: alert.severity === 'high' ? KAYAD_COLORS.red : alert.severity === 'medium' ? KAYAD_COLORS.amber : KAYAD_COLORS.softBlue,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <AlertTriangle 
                        size={20} 
                        style={{ 
                          color: alert.severity === 'high' ? KAYAD_COLORS.red : alert.severity === 'medium' ? KAYAD_COLORS.amber : KAYAD_COLORS.softBlue,
                          marginTop: 2,
                        }} 
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                            style={{ 
                              backgroundColor: alert.severity === 'high' ? `${KAYAD_COLORS.red}20` : `${KAYAD_COLORS.amber}20`,
                              color: alert.severity === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.amber,
                            }}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{alert.time}</span>
                        </div>
                        <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{alert.title}</h3>
                        <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>{alert.description}</p>
                        <p className="text-xs mt-2" style={{ color: KAYAD_COLORS.softBlue }}>Entity: {alert.entity}</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 rounded text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                      Review
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="rounded-xl p-4 border" style={{ borderColor: KAYAD_COLORS.softBlue, backgroundColor: `${KAYAD_COLORS.softBlue}08` }}>
              <div className="flex items-start gap-3">
                <Info size={20} style={{ color: KAYAD_COLORS.softBlue, marginTop: 2 }} />
                <div>
                  <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>AI-Assisted Detection</p>
                  <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                    All flags require human review before action. AI assists by identifying patterns and anomalies—final decisions remain with your compliance team.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Market Intelligence */}
        {activeCategory === 'market' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Market Intelligence</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trends */}
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                  <TrendingUp size={20} style={{ color: KAYAD_COLORS.emerald }} />
                  Market Trends
                </h3>
                <div className="space-y-4">
                  {[
                    { make: 'Toyota', share: 32, change: '+2.1%' },
                    { make: 'Nissan', share: 18, change: '+4.3%' },
                    { make: 'Mercedes-Benz', share: 12, change: '+5.8%' },
                    { make: 'Honda', share: 10, change: '-1.2%' },
                    { make: 'Subaru', share: 8, change: '+7.2%' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold" style={{ color: KAYAD_COLORS.softBlue, width: 30 }}>{i + 1}</span>
                        <span style={{ color: KAYAD_COLORS.lightNavy }}>{item.make}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span style={{ color: KAYAD_COLORS.softBlue }}>{item.share}%</span>
                        <span className="text-sm" style={{ color: item.change.startsWith('+') ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                          {item.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights */}
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                  <Lightbulb size={20} style={{ color: KAYAD_COLORS.amber }} />
                  AI Insights
                </h3>
                <div className="space-y-4">
                  {MARKET_INSIGHTS.map((insight, i) => (
                    <div 
                      key={i} 
                      className="p-4 rounded-lg border-l-4"
                      style={{
                        backgroundColor: KAYAD_COLORS.warmBeige,
                        borderLeftColor: insight.impact === 'positive' ? KAYAD_COLORS.emerald : insight.impact === 'opportunity' ? KAYAD_COLORS.purple : KAYAD_COLORS.amber,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                          style={{ 
                            backgroundColor: insight.impact === 'positive' ? `${KAYAD_COLORS.emerald}20` : insight.impact === 'opportunity' ? `${KAYAD_COLORS.purple}20` : `${KAYAD_COLORS.amber}20`,
                            color: insight.impact === 'positive' ? KAYAD_COLORS.emerald : insight.impact === 'opportunity' ? KAYAD_COLORS.purple : KAYAD_COLORS.amber,
                          }}
                        >
                          {insight.type}
                        </span>
                      </div>
                      <h4 className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{insight.title}</h4>
                      <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>{insight.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Regional Demand */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Regional Demand Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { region: 'Nairobi', demand: 85, avgPrice: 2650000 },
                  { region: 'Mombasa', demand: 72, avgPrice: 2450000 },
                  { region: 'Kisumu', demand: 55, avgPrice: 2200000 },
                  { region: 'Nakuru', demand: 48, avgPrice: 2100000 },
                ].map((item) => (
                  <div key={item.region} className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{item.region}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: KAYAD_COLORS.softBlue }}>Demand</span>
                        <span style={{ color: KAYAD_COLORS.lightNavy }}>{item.demand}%</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}30` }}>
                        <div 
                          className="h-full rounded-full"
                          style={{ width: `${item.demand}%`, backgroundColor: item.demand > 70 ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber }}
                        />
                      </div>
                    </div>
                    <p className="text-sm mt-2" style={{ color: KAYAD_COLORS.softBlue }}>
                      Avg: KES {(item.avgPrice / 1000000).toFixed(1)}M
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dealer & Auction AI placeholders */}
        {(activeCategory === 'dealer' || activeCategory === 'auction') && (
          <div className="rounded-xl p-12 text-center shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.lightNavy}15` }}>
              <Zap size={32} style={{ color: KAYAD_COLORS.lightNavy }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>
              {activeCategory === 'dealer' ? 'Dealer AI' : 'Auction AI'}
            </h3>
            <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
              AI insights for {activeCategory === 'dealer' ? 'dealers' : 'auction organizers'} available in the business dashboard
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
