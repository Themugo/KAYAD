import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, MessageSquare, Sparkles, FileText, Wand2, Zap, BarChart3,
  BookOpen, Lightbulb, Play, History, Settings, Send, Plus, Search,
  ChevronRight, Check, X, Clock, ArrowRight, RefreshCw, Eye, Edit,
  Trash2, Copy, ChevronDown, User, Shield, AlertTriangle, CheckCircle2,
  FileCode, Layout, Palette, Target, TrendingUp, Users, Globe, Car,
  Gavel, Calculator, Home, Building, ClipboardCheck, MousePointer,
  EyeOff, Download, Upload, Save, RotateCcw
} from 'lucide-react';
import * as aiApi from '../../../services/aiApi';

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
  pink: '#EC4899',
};

const modules = [
  { id: 'assistant', label: 'AI Assistant', icon: MessageSquare, color: colors.navy },
  { id: 'designer', label: 'AI Designer', icon: Wand2, color: colors.purple },
  { id: 'automation', label: 'AI Automation', icon: Zap, color: colors.emerald },
  { id: 'prompts', label: 'Prompt Studio', icon: FileCode, color: colors.terracotta },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, color: colors.softBlue },
  { id: 'analytics', label: 'AI Analytics', icon: BarChart3, color: colors.mutedOrange },
  { id: 'suggestions', label: 'Suggestions', icon: Lightbulb, color: '#FBBF24' },
  { id: 'history', label: 'Command History', icon: History, color: colors.navy },
  { id: 'health', label: 'Platform Health', icon: Shield, color: colors.emerald },
  { id: 'templates', label: 'Command Templates', icon: FileText, color: colors.pink },
];

const quickActions = [
  { icon: Car, label: 'Create Promotion', command: 'Create a {brand} promotion' },
  { icon: Home, label: 'New Homepage', command: 'Create a new homepage' },
  { icon: Target, label: 'Launch Campaign', command: 'Launch {name} campaign' },
  { icon: Palette, label: 'Change Theme', command: 'Change primary color to {color}' },
  { icon: Layout, label: 'Add Menu', command: 'Add a new menu called {name}' },
  { icon: Building, label: 'Dealer Page', command: 'Create a dealer landing page' },
  { icon: Gavel, label: 'Auction Page', command: 'Create an auction page' },
  { icon: Calculator, label: 'Finance Page', command: 'Create a finance landing page' },
];

const exampleCommands = [
  { category: 'Pages', commands: [
    'Create a Toyota promotion page',
    'Create a new homepage for Uganda',
    'Add an inspection landing page',
    'Redesign the vehicle cards',
  ]},
  { category: 'Design', commands: [
    'Make the homepage more premium',
    'Reduce white space in hero section',
    'Modernize the navbar design',
    'Improve mobile experience',
  ]},
  { category: 'Campaigns', commands: [
    'Launch Black Friday campaign',
    'Create a summer sale promotion',
    'Add a new dealer subscription',
    'Start auction week campaign',
  ]},
  { category: 'Content', commands: [
    'Add FAQ section to dealer page',
    'Generate welcome email for dealers',
    'Write auction instructions',
    'Create help articles for buyers',
  ]},
  { category: 'Analytics', commands: [
    'Show dealer growth over last 6 months',
    'Compare auction performance by county',
    'What is the average selling price of Toyota?',
    'Top performing dealers this month',
  ]},
];

export default function AIPlatformBuilder() {
  const [activeModule, setActiveModule] = useState('assistant');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your KAYAD AI assistant. I can help you manage the platform through natural language commands. Try saying things like:\n\n• "Create a Toyota promotion"\n• "Make the homepage more premium"\n• "Launch auction week campaign"\n\nWhat would you like to do?', timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [health, setHealth] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [pendingCommands, setPendingCommands] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      const { data: dashData } = await aiApi.getAIDashboard();
      setDashboard(dashData.data);
      const { data: histData } = await aiApi.getCommandHistory({ limit: 20 });
      setHistory(histData.data);
      const { data: sugData } = await aiApi.getAISuggestions();
      setSuggestions(sugData.data);
      const { data: hlthData } = await aiApi.getPlatformHealth();
      setHealth(hlthData.data);
      const { data: tmplData } = await aiApi.getCommandTemplates();
      setTemplates(tmplData.data);
    } catch (error) {
      console.error('Failed to load AI data:', error);
      // No synthetic production fallback: the UI remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (command) => {
    setInput(command);
  };

  const handleApprove = async (commandId) => {
    try {
      await aiApi.approveAICommand(commandId);
      setPendingCommands(prev => prev.filter(c => c.commandId !== commandId));
      const successMessage = {
        role: 'assistant',
        content: 'Command approved and executed successfully! The changes have been applied to the platform.',
        timestamp: new Date().toISOString(),
        isSuccess: true,
      };
      setMessages(prev => [...prev, successMessage]);
      loadData();
    } catch (error) {
      console.error('Failed to approve command:', error);
    }
  };

  const handleReject = async (commandId) => {
    try {
      await aiApi.rejectAICommand(commandId);
      setPendingCommands(prev => prev.filter(c => c.commandId !== commandId));
    } catch (error) {
      console.error('Failed to reject command:', error);
    }
  };

  // ============================================
  // AI ASSISTANT MODULE
  // ============================================

  const renderAssistant = () => (
    <div className="h-full flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user'
                ? 'bg-[#17244B] text-white rounded-br-md'
                : msg.isError
                  ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-md'
                  : msg.isSuccess
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-bl-md'
                    : 'bg-white border border-slate-200 rounded-bl-md'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={16} className="text-[#17244B]" />
                  <span className="text-xs font-medium text-slate-500">KAYAD AI</span>
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              {msg.data?.preview?.changes && (
                <div className="mt-4 space-y-2">
                  {msg.data.preview.changes.map((change, j) => (
                    <div key={j} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          change.type === 'create' ? 'bg-emerald-100 text-emerald-700' :
                          change.type === 'update' ? 'bg-blue-100 text-blue-700' :
                          change.type === 'move' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {change.type}
                        </span>
                        <span className="text-xs text-slate-500">{change.entity}</span>
                      </div>
                      <p className="text-sm text-slate-700">{change.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Bot size={16} className="animate-pulse" />
                <span className="text-sm">Processing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending Approvals */}
      {pendingCommands.length > 0 && (
        <div className="px-6 pb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="font-medium text-amber-800">Pending Approvals</span>
            </div>
            {pendingCommands.map((cmd) => (
              <div key={cmd.commandId} className="p-3 bg-white rounded-lg border border-amber-200 mb-2 last:mb-0">
                <p className="text-sm text-slate-700 mb-3">{cmd.parsed?.parameters?.message || cmd.parsed?.action}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(cmd.commandId)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                  >
                    <Check size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(cmd.commandId)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                  >
                    <X size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-6 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action.command)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm whitespace-nowrap hover:bg-slate-50 hover:border-[#17244B] transition-colors"
            >
              <action.icon size={14} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-6 pt-2">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your command or question..."
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B] focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-[#17244B] text-white rounded-xl hover:bg-[#1e3054] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // AI DESIGNER MODULE
  // ============================================

  const renderDesigner = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">AI Designer</h2>
        <button
          onClick={() => setActiveModule('assistant')}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <Wand2 size={18} />
          Describe Design
        </button>
      </div>

      <p className="text-slate-600">AI-powered design generation for pages, components, and layouts.</p>

      {/* Design Categories */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { id: 'page', name: 'Page Templates', icon: Layout, count: 24, color: colors.navy },
          { id: 'component', name: 'Components', icon: FileCode, count: 156, color: colors.purple },
          { id: 'section', name: 'Sections', icon: Layout, count: 48, color: colors.emerald },
          { id: 'hero', name: 'Hero Areas', icon: Home, count: 18, color: colors.terracotta },
          { id: 'card', name: 'Card Designs', icon: FileCode, count: 32, color: colors.softBlue },
          { id: 'form', name: 'Forms', icon: FileCode, count: 24, color: colors.mutedOrange },
        ].map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-[#17244B] cursor-pointer transition-colors">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${cat.color}20` }}>
              <cat.icon size={24} style={{ color: cat.color }} />
            </div>
            <h3 className="font-semibold text-slate-800">{cat.name}</h3>
            <p className="text-sm text-slate-500">{cat.count} templates</p>
          </div>
        ))}
      </div>

      {/* Example Designs */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Popular Design Requests</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            'Create a premium car dealership landing page',
            'Design a modern auction bidding interface',
            'Build a mobile-first vehicle search page',
            'Create a dealer onboarding form',
          ].map((request, i) => (
            <button
              key={i}
              onClick={() => { setInput(request); setActiveModule('assistant'); }}
              className="p-4 bg-slate-50 rounded-lg text-left hover:bg-slate-100 transition-colors"
            >
              <Sparkles size={16} className="text-[#8B5CF6] mb-2" />
              <p className="text-sm text-slate-700">{request}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // AI AUTOMATION MODULE
  // ============================================

  const renderAutomation = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">AI Automation Builder</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          New Automation
        </button>
      </div>

      <p className="text-slate-600">Describe a process and let AI build the workflow automatically.</p>

      {/* Example Automations */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: 'Dealer Onboarding', description: 'Welcome email, showroom creation, support assignment, onboarding schedule', icon: Building },
          { title: 'Auction Completion', description: 'Notify winner, process payment, schedule inspection, generate certificate', icon: Gavel },
          { title: 'Vehicle Approval', description: 'Image verification, document check, pricing review, publish to marketplace', icon: Car },
          { title: 'Support Escalation', description: 'AI triage, priority assignment, team routing, SLA tracking', icon: ClipboardCheck },
        ].map((automation, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#17244B]/10 flex items-center justify-center">
                <automation.icon size={24} className="text-[#17244B]" />
              </div>
              <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                <Play size={14} className="inline mr-1" />
                Run
              </button>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">{automation.title}</h3>
            <p className="text-sm text-slate-500">{automation.description}</p>
          </div>
        ))}
      </div>

      {/* Workflow Designer */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Create Custom Automation</h3>
        <textarea
          placeholder="Describe your automation... e.g., 'When a dealer is approved, send a welcome email, create their showroom, assign a support manager, and schedule onboarding.'"
          className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
        />
        <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white rounded-lg hover:bg-[#7c3aed]">
          <Sparkles size={18} />
          Generate Automation
        </button>
      </div>
    </div>
  );

  // ============================================
  // PROMPT STUDIO MODULE
  // ============================================

  const renderPrompts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Prompt Studio</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          New Prompt
        </button>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Command Templates</h3>
        <div className="space-y-4">
          {templates.map((category, i) => (
            <div key={i} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <h4 className="font-medium text-slate-700 mb-2">{category.category}</h4>
              <div className="space-y-2">
                {category.templates?.map((tmpl, j) => (
                  <div key={j} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{tmpl.template}</p>
                      <p className="text-xs text-slate-500">{tmpl.example}</p>
                    </div>
                    <button
                      onClick={() => { setInput(tmpl.example); setActiveModule('assistant'); }}
                      className="p-2 hover:bg-slate-200 rounded-lg"
                    >
                      <Play size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // KNOWLEDGE BASE MODULE
  // ============================================

  const renderKnowledge = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">AI Knowledge Base</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Add Knowledge
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { name: 'Policies', count: 24, color: colors.navy },
          { name: 'Business Rules', count: 18, color: colors.emerald },
          { name: 'Dealer Guidelines', count: 32, color: colors.terracotta },
          { name: 'Auction Rules', count: 15, color: colors.softBlue },
          { name: 'Support Articles', count: 156, color: colors.purple },
          { name: 'Internal Docs', count: 45, color: colors.mutedOrange },
        ].map((cat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${cat.color}20` }}>
              <BookOpen size={20} style={{ color: cat.color }} />
            </div>
            <h3 className="font-semibold text-slate-800">{cat.name}</h3>
            <p className="text-2xl font-bold text-slate-800">{cat.count}</p>
            <p className="text-xs text-slate-500">documents</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Train AI with Knowledge</h3>
        <p className="text-sm text-slate-600 mb-4">
          Add documents, policies, and guidelines to help the AI understand your business better.
        </p>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Upload size={18} />
            Upload Documents
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <FileText size={18} />
            Add URL
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // AI ANALYTICS MODULE
  // ============================================

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">AI Analytics</h2>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Commands', value: dashboard?.totalCommands || 0, icon: Bot, color: colors.navy },
          { label: 'Executed Today', value: dashboard?.executedToday || 0, icon: CheckCircle2, color: colors.emerald },
          { label: 'Active Conversations', value: dashboard?.activeConversations || 0, icon: MessageSquare, color: colors.softBlue },
          { label: 'Success Rate', value: '96%', icon: TrendingUp, color: colors.terracotta },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon size={18} style={{ color: stat.color }} />
              <span className="text-sm text-slate-500">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Command Distribution */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Commands by Type</h3>
          <div className="space-y-3">
            {[
              { name: 'Create Pages', count: 45, color: colors.navy },
              { name: 'Update Design', count: 38, color: colors.purple },
              { name: 'Launch Campaigns', count: 28, color: colors.emerald },
              { name: 'Analytics Queries', count: 25, color: colors.softBlue },
              { name: 'Content Generation', count: 20, color: colors.terracotta },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700">{item.name}</span>
                    <span className="text-sm font-medium text-slate-800">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(item.count / 50) * 100}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Weekly Activity</h3>
          <div className="flex items-end justify-between h-40">
            {[65, 85, 72, 90, 88, 95, 78].map((value, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className="w-8 bg-[#17244B]/20 rounded-t"
                  style={{ height: `${value}%` }}
                >
                  <div className="w-full bg-[#17244B] rounded-t h-full" />
                </div>
                <span className="text-xs text-slate-500">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // SUGGESTIONS MODULE
  // ============================================

  const renderSuggestions = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">AI Suggestions</h2>
      <p className="text-slate-600">AI-powered recommendations to improve your platform.</p>

      <div className="grid grid-cols-2 gap-4">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  suggestion.impact === 'high' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {suggestion.impact} impact
                </span>
                <span className="text-sm text-slate-500">{suggestion.confidence}% confidence</span>
              </div>
              <Sparkles size={16} className="text-[#FBBF24]" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">{suggestion.title}</h3>
            <p className="text-sm text-slate-600 mb-4">{suggestion.description}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setInput(suggestion.command); setActiveModule('assistant'); }}
                className="flex-1 px-3 py-2 bg-[#17244B] text-white rounded-lg text-sm hover:bg-[#1e3054]"
              >
                Apply Suggestion
              </button>
              <button className="px-3 py-2 text-slate-500 text-sm hover:text-slate-700">
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // HISTORY MODULE
  // ============================================

  const renderHistory = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Command History</h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Command</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm text-slate-800">{item.command}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs">{item.action}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === 'executed' ? 'bg-emerald-100 text-emerald-700' :
                    item.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-slate-100 rounded-lg" title="View">
                      <Eye size={16} />
                    </button>
                    {item.status === 'executed' && (
                      <button className="p-2 hover:bg-slate-100 rounded-lg" title="Rollback">
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // PLATFORM HEALTH MODULE
  // ============================================

  const renderHealth = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Platform Health</h2>

      {/* Overall Score */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">Overall Health Score</p>
            <p className="text-5xl font-bold text-slate-800">{health?.score || 95}%</p>
            <p className={`text-sm font-medium ${
              health?.overall === 'healthy' ? 'text-emerald-600' :
              health?.overall === 'warning' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {health?.overall || 'healthy'}
            </p>
          </div>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="12"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={health?.overall === 'healthy' ? '#10B981' : '#FB923C'}
                strokeWidth="12"
                strokeDasharray={`${(health?.score || 95) * 3.52} 352`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(health?.categories || {}).map(([key, cat]) => (
          <div key={key} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-slate-800 capitalize">{key}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                cat.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
                cat.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {cat.status}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${cat.score}%`,
                    backgroundColor: cat.status === 'healthy' ? colors.emerald : colors.mutedOrange
                  }}
                />
              </div>
              <span className="text-sm font-medium text-slate-800">{cat.score}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Recommended Actions</h3>
        <div className="space-y-3">
          {(health?.recommendations || []).map((rec, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  rec.priority === 'high' ? 'bg-red-500' :
                  rec.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />
                <span className="text-sm text-slate-700">{rec.action}</span>
              </div>
              <button className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-slate-100">
                Fix
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // TEMPLATES MODULE
  // ============================================

  const renderTemplates = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Command Templates</h2>
      <p className="text-slate-600">Ready-to-use command templates for common tasks.</p>

      {exampleCommands.map((category, i) => (
        <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">{category.category}</h3>
          <div className="grid grid-cols-2 gap-3">
            {category.commands.map((cmd, j) => (
              <button
                key={j}
                onClick={() => { setInput(cmd); setActiveModule('assistant'); }}
                className="p-3 bg-slate-50 rounded-lg text-left hover:bg-slate-100 transition-colors flex items-center gap-3"
              >
                <ArrowRight size={16} className="text-[#17244B]" />
                <span className="text-sm text-slate-700">{cmd}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'assistant': return renderAssistant();
      case 'designer': return renderDesigner();
      case 'automation': return renderAutomation();
      case 'prompts': return renderPrompts();
      case 'knowledge': return renderKnowledge();
      case 'analytics': return renderAnalytics();
      case 'suggestions': return renderSuggestions();
      case 'history': return renderHistory();
      case 'health': return renderHealth();
      case 'templates': return renderTemplates();
      default: return renderAssistant();
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
                <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] flex items-center justify-center">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">AI Platform Builder</h1>
                  <p className="text-xs text-slate-500">Intelligent Platform Copilot</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                AI Online
              </div>
              <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg">
                <RefreshCw size={20} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#8B5CF6] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{mod.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>

          {/* Quick Stats */}
          {dashboard && (
            <div className="p-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Today's Activity</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Commands</span>
                  <span className="text-sm font-medium text-slate-800">{dashboard.executedToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Success</span>
                  <span className="text-sm font-medium text-emerald-600">96%</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
