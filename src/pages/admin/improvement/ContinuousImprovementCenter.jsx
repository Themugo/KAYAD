import React, { useState, useEffect } from 'react';
import {
  Lightbulb, TrendingUp, Target, BarChart3, Users, Zap, Search,
  Rocket, Clock, CheckCircle, AlertTriangle, ThumbsUp, ThumbsDown,
  ArrowRight, Filter, RefreshCw, Bot, Eye, FlaskConical, Heart,
  Code, Palette, ShoppingCart, Gavel, Clipboard, DollarSign, Globe,
  MessageSquare, Shield, Server, Brain, Star, ChevronRight, Send,
  Play, Pause, Plus, Vote, Calendar, Flag, TrendingDown
} from 'lucide-react';
import * as impApi from '../../../services/improvementApi';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
  mutedOrange: '#FB923C',
  mutedCrimson: '#EF4444',
  purple: '#8B5CF6',
};

const modules = [
  { id: 'dashboard', label: 'Innovation', icon: Lightbulb, color: colors.navy },
  { id: 'opportunities', label: 'Opportunities', icon: Target, color: colors.emerald },
  { id: 'ai', label: 'AI Insights', icon: Brain, color: '#FBBF24' },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical, color: colors.purple },
  { id: 'health', label: 'Health', icon: Heart, color: colors.mutedCrimson },
  { id: 'ideas', label: 'Ideas', icon: Rocket, color: colors.terracotta },
  { id: 'roadmap', label: 'Roadmap', icon: Calendar, color: colors.softBlue },
  { id: 'optimization', label: 'Optimization', icon: TrendingUp, color: colors.navy },
];

export default function ContinuousImprovementCenter() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [healthScores, setHealthScores] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [roadmap, setRoadmap] = useState(null);
  const [customerExp, setCustomerExp] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantResponse, setAssistantResponse] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const { data: dashData } = await impApi.getInnovationDashboard();
      setDashboard(dashData.data);
      
      const { data: oppData } = await impApi.getImprovementOpportunities();
      setOpportunities(oppData.data);
      
      const { data: recData } = await impApi.getAIRecommendations();
      setRecommendations(recData.data);
      
      const { data: expData } = await impApi.getExperiments();
      setExperiments(expData.data);
      
      const { data: healthData } = await impApi.getProductHealthScores();
      setHealthScores(healthData.data);
      
      const { data: ideasData } = await impApi.getInnovationIdeas();
      setIdeas(ideasData.data);
      
      const { data: roadmapData } = await impApi.getRoadmap();
      setRoadmap(roadmapData.data);
      
      const { data: expMetrics } = await impApi.getCustomerExperience();
      setCustomerExp(expMetrics.data);
      
      const { data: perfData } = await impApi.getPerformanceMetrics();
      setPerformance(perfData.data);
    } catch (error) {
      console.error('Failed to load improvement data:', error);
      setDashboard({
        overallHealth: 87.5,
        improvementsThisMonth: 23,
        activeExperiments: 5,
        pendingIdeas: 45,
        avgImprovementImpact: 12.5,
        quickWins: 8,
      });
      setOpportunities([
        { id: '1', type: 'ux', title: 'Simplify Registration', priority: 'high', impact: 'high', estimatedBenefit: 15, confidence: 92 },
        { id: '2', type: 'performance', title: 'Optimize Images', priority: 'high', impact: 'high', estimatedBenefit: 25, confidence: 95 },
        { id: '3', type: 'conversion', title: 'Improve Search Filters', priority: 'high', impact: 'medium', estimatedBenefit: 10, confidence: 85 },
      ]);
      setRecommendations([
        { id: '1', category: 'homepage', title: 'Homepage CTA should be moved higher', expectedImpact: '+8% conversion', confidence: 89 },
        { id: '2', category: 'registration', title: 'Reduce registration to 4 steps', expectedImpact: '+25% completion', confidence: 94 },
      ]);
      setExperiments([
        { id: '1', name: 'Homepage CTA Position', status: 'running', winner: 'B', lift: 15.6 },
        { id: '2', name: 'Vehicle Card Layout', status: 'running' },
      ]);
      setIdeas([
        { id: '1', title: 'AI Vehicle Valuation', source: 'ai', status: 'idea', priority: 'high', votes: 45 },
        { id: '2', title: 'WhatsApp Integration', source: 'dealer', status: 'research', priority: 'high', votes: 38 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssistantAsk = async () => {
    if (!assistantQuestion.trim()) return;
    try {
      const { data } = await impApi.askAssistant(assistantQuestion);
      setAssistantResponse(data.data);
    } catch (error) {
      console.error('Assistant error:', error);
    }
  };

  // ============================================
  // DASHBOARD
  // ============================================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Innovation Dashboard</h2>
          <p className="text-slate-500">Track continuous improvement across KAYAD</p>
        </div>
        <button onClick={loadAllData} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={20} className="text-emerald-600" />
            <span className="text-sm text-slate-500">Health Score</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{dashboard?.overallHealth}%</p>
          <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${dashboard?.overallHealth}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={20} className="text-blue-600" />
            <span className="text-sm text-slate-500">Improvements</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{dashboard?.improvementsThisMonth}</p>
          <p className="text-xs text-emerald-600 mt-2">This month</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical size={20} className="text-purple-600" />
            <span className="text-sm text-slate-500">Experiments</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{dashboard?.activeExperiments}</p>
          <p className="text-xs text-slate-500 mt-2">Active</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Rocket size={20} className="text-amber-600" />
            <span className="text-sm text-slate-500">Ideas</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{dashboard?.pendingIdeas}</p>
          <p className="text-xs text-slate-500 mt-2">Pending</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} className="text-emerald-600" />
            <span className="text-sm text-slate-500">Avg Impact</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">+{dashboard?.avgImprovementImpact}%</p>
          <p className="text-xs text-slate-500 mt-2">Per improvement</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={20} className="text-amber-600" />
            <span className="text-sm text-slate-500">Quick Wins</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{dashboard?.quickWins}</p>
          <p className="text-xs text-emerald-600 mt-2">Ready to implement</p>
        </div>
      </div>

      {/* AI Recommendations Preview */}
      <div className="bg-gradient-to-br from-[#17244B] to-[#2a3a6e] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Bot size={24} />
          <h3 className="text-lg font-semibold">AI Top Recommendation</h3>
        </div>
        <p className="text-xl font-medium mb-2">{recommendations[0]?.title}</p>
        <p className="text-white/80 mb-4">{recommendations[0]?.reasoning}</p>
        <div className="flex gap-4">
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
            Expected: {recommendations[0]?.expectedImpact}
          </span>
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
            Confidence: {recommendations[0]?.confidence}%
          </span>
        </div>
      </div>

      {/* Active Experiments */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Active Experiments</h3>
          <button onClick={() => setActiveModule('experiments')} className="text-sm text-[#17244B] hover:underline">
            View All
          </button>
        </div>
        <div className="space-y-3">
          {experiments.filter(e => e.status === 'running').slice(0, 3).map((exp) => (
            <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FlaskConical size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{exp.name}</p>
                  <p className="text-xs text-slate-500">
                    {exp.winner ? `Winner: ${exp.winner} (+${exp.lift}%)` : 'Running...'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                {exp.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // OPPORTUNITIES
  // ============================================

  const renderOpportunities = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Improvement Opportunities</h2>

      <div className="grid grid-cols-3 gap-4">
        {opportunities.map((opp) => (
          <div key={opp.id} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${
            opp.priority === 'high' ? 'border-red-500' :
            opp.priority === 'medium' ? 'border-amber-500' : 'border-blue-500'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                opp.type === 'ux' ? 'bg-blue-100 text-blue-700' :
                opp.type === 'performance' ? 'bg-purple-100 text-purple-700' :
                opp.type === 'conversion' ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {opp.type}
              </span>
              <span className="text-xs text-slate-500">{opp.page}</span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">{opp.title}</h3>
            <p className="text-sm text-slate-600 mb-4">{opp.description}</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">Impact</p>
                <p className="font-medium text-slate-800 capitalize">{opp.impact}</p>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">Effort</p>
                <p className="font-medium text-slate-800 capitalize">{opp.difficulty}</p>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">Benefit</p>
                <p className="font-medium text-emerald-600">+{opp.estimatedBenefit}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-[#17244B] h-2 rounded-full" style={{ width: `${opp.confidence}%` }} />
                </div>
              </div>
              <span className="text-xs text-slate-500">{opp.confidence}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // AI INSIGHTS
  // ============================================

  const renderAIInsights = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">AI Improvement Insights</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Top Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs capitalize">{rec.category}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    rec.effort === 'low' ? 'bg-emerald-100 text-emerald-700' :
                    rec.effort === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {rec.effort} effort
                  </span>
                </div>
                <p className="font-medium text-slate-800 mb-2">{rec.title}</p>
                <p className="text-sm text-slate-600 mb-3">{rec.reasoning}</p>
                <div className="flex gap-3">
                  <span className="text-sm text-emerald-600">Expected: {rec.expectedImpact}</span>
                  <span className="text-sm text-slate-500">Confidence: {rec.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* AI Assistant */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Bot size={20} className="text-amber-600" />
              Digital Assistant
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={assistantQuestion}
                onChange={(e) => setAssistantQuestion(e.target.value)}
                placeholder="Ask about improvements..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17244B]"
              />
              <button
                onClick={handleAssistantAsk}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
              >
                <Send size={16} />
                Ask AI
              </button>
            </div>
            {assistantResponse && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-700 mb-3">{assistantResponse.answer}</p>
                {assistantResponse.actions?.length > 0 && (
                  <div className="space-y-2">
                    {assistantResponse.actions.map((action, i) => (
                      <button key={i} className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded text-sm hover:bg-slate-50">
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Questions */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Quick Questions</h3>
            <div className="space-y-2">
              {[
                'What requires my approval?',
                "Show today's biggest risks",
                "Why did auction conversion fall?",
                "Which dealers need attention?",
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setAssistantQuestion(q)}
                  className="w-full text-left px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // EXPERIMENTS
  // ============================================

  const renderExperiments = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Experiment Center</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          New Experiment
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {experiments.map((exp) => (
          <div key={exp.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">{exp.name}</h3>
                <p className="text-sm text-slate-500">
                  {exp.control} vs {exp.variant}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                exp.status === 'running' ? 'bg-emerald-100 text-emerald-700' :
                exp.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                exp.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {exp.status}
              </span>
            </div>

            {exp.status === 'running' && exp.conversion && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Control</p>
                  <p className="text-xl font-bold text-slate-800">{exp.conversion.control}%</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-emerald-600 mb-1">Variant</p>
                  <p className="text-xl font-bold text-emerald-600">{exp.conversion.variant}%</p>
                </div>
              </div>
            )}

            {exp.lift && (
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-emerald-600" />
                <span className="text-emerald-600 font-medium">+{exp.lift}% lift</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-500">{exp.confidence}% confidence</span>
              </div>
            )}

            <div className="flex gap-2">
              {exp.status === 'draft' && (
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  <Play size={16} />
                  Start
                </button>
              )}
              {exp.status === 'running' && (
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  <Pause size={16} />
                  Pause
                </button>
              )}
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                <Eye size={16} />
                Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // PRODUCT HEALTH
  // ============================================

  const renderHealth = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Product Health Scores</h2>

      {/* Overall Score */}
      <div className="bg-gradient-to-br from-[#17244B] to-[#2a3a6e] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 mb-1">Overall Health Score</p>
            <p className="text-5xl font-bold">{healthScores?.overall}%</p>
            <p className="text-white/60 mt-2">Grade: {healthScores?.overall >= 90 ? 'A' : healthScores?.overall >= 80 ? 'B' : 'C'}</p>
          </div>
          <div className="w-32 h-32 rounded-full border-8 border-white/20 flex items-center justify-center">
            <span className="text-4xl font-bold">{healthScores?.overall}%</span>
          </div>
        </div>
      </div>

      {/* Module Scores */}
      <div className="grid grid-cols-4 gap-4">
        {healthScores?.modules?.map((mod) => (
          <div key={mod.name} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-800">{mod.name}</span>
              {mod.trend === 'up' ? (
                <TrendingUp size={16} className="text-emerald-600" />
              ) : mod.trend === 'down' ? (
                <TrendingDown size={16} className="text-red-600" />
              ) : (
                <TrendingUp size={16} className="text-slate-400" />
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800">{mod.score}%</p>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
              <div className="h-1.5 rounded-full" style={{
                width: `${mod.score}%`,
                backgroundColor: mod.score >= 90 ? colors.emerald : mod.score >= 70 ? colors.softBlue : colors.mutedOrange
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Technical Debt */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Technical Debt</h3>
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800">{healthScores?.technicalDebt?.score}</p>
            <p className="text-xs text-slate-500">Score</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">{healthScores?.technicalDebt?.outdatedLibraries}</p>
            <p className="text-xs text-slate-500">Libraries</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{healthScores?.technicalDebt?.deprecatedAPIs}</p>
            <p className="text-xs text-slate-500">Deprecated</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{healthScores?.technicalDebt?.duplicateCode}</p>
            <p className="text-xs text-slate-500">Duplicates</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{healthScores?.technicalDebt?.securityWarnings}</p>
            <p className="text-xs text-slate-500">Security</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // IDEAS PIPELINE
  // ============================================

  const renderIdeas = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Innovation Ideas</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Submit Idea
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ideas.map((idea) => (
          <div key={idea.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  idea.source === 'ai' ? 'bg-amber-100 text-amber-700' :
                  idea.source === 'customer' ? 'bg-blue-100 text-blue-700' :
                  idea.source === 'dealer' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {idea.source}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  idea.priority === 'high' ? 'bg-red-100 text-red-700' :
                  idea.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {idea.priority} priority
                </span>
              </div>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs capitalize">{idea.status}</span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">{idea.title}</h3>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm text-slate-500">
                <span>Value: {idea.expectedValue}</span>
                <span>Cost: {idea.estimatedCost}</span>
              </div>
              <button className="flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded-lg">
                <ThumbsUp size={16} />
                <span>{idea.votes}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // ROADMAP
  // ============================================

  const renderRoadmap = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Product Roadmap</h2>

      <div className="space-y-6">
        {roadmap?.quarters?.map((quarter) => (
          <div key={quarter.name} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">{quarter.name}</h3>
            <div className="space-y-3">
              {quarter.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 capitalize">{item.status}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-[#17244B] h-2 rounded-full" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">{item.progress}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // OPTIMIZATION
  // ============================================

  const renderOptimization = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Optimization Center</h2>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ShoppingCart size={20} className="text-emerald-600" />
            Marketplace
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Conversion Rate</span>
              <span className="font-medium text-emerald-600">6.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Avg Days to Sell</span>
              <span className="font-medium text-slate-800">14 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Listing Quality</span>
              <span className="font-medium text-slate-800">78%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Search size={20} className="text-blue-600" />
            Search
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Search Volume</span>
              <span className="font-medium text-slate-800">45,678</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Zero Results</span>
              <span className="font-medium text-emerald-600">2.3%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CTR</span>
              <span className="font-medium text-slate-800">8.5%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600" />
            Revenue
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Avg Order Value</span>
              <span className="font-medium text-slate-800">2.85M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CLV</span>
              <span className="font-medium text-slate-800">2.45M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Revenue/User</span>
              <span className="font-medium text-emerald-600">45,678</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'opportunities': return renderOpportunities();
      case 'ai': return renderAIInsights();
      case 'experiments': return renderExperiments();
      case 'health': return renderHealth();
      case 'ideas': return renderIdeas();
      case 'roadmap': return renderRoadmap();
      case 'optimization': return renderOptimization();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17244B] to-[#2a3a6e] flex items-center justify-center">
                  <Lightbulb size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Continuous Improvement</h1>
                  <p className="text-xs text-slate-500">Self-Improving Platform Engine</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                Innovation Active
              </div>
              <button onClick={loadAllData} className="p-2 hover:bg-slate-100 rounded-lg">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive ? 'bg-[#17244B] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{mod.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
