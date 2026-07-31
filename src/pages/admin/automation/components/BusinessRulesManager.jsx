import React, { useState } from 'react';
import {
  Shield, Plus, Edit, Trash2, Play, Pause, Search, Filter,
  ChevronRight, CheckCircle, XCircle, AlertCircle, GripVertical,
  ArrowRight, Copy, Settings, X, Save, ChevronDown
} from 'lucide-react';

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
};

// Operators for conditions
const operators = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'greater_than_or_equal', label: 'is at least' },
  { value: 'less_than_or_equal', label: 'is at most' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'in', label: 'is one of' },
];

// Available fields
const fields = [
  { category: 'Dealer', fields: [
    { value: 'dealer.rating', label: 'Dealer Rating' },
    { value: 'dealer.status', label: 'Dealer Status' },
    { value: 'dealer.verified', label: 'Is Verified' },
    { value: 'dealer.subscription', label: 'Subscription Status' },
    { value: 'dealer.listings', label: 'Active Listings' },
  ]},
  { category: 'Vehicle', fields: [
    { value: 'vehicle.price', label: 'Price' },
    { value: 'vehicle.year', label: 'Year' },
    { value: 'vehicle.mileage', label: 'Mileage' },
    { value: 'vehicle.status', label: 'Status' },
    { value: 'vehicle.inspectionScore', label: 'Inspection Score' },
  ]},
  { category: 'Auction', fields: [
    { value: 'auction.status', label: 'Auction Status' },
    { value: 'auction.bids', label: 'Number of Bids' },
    { value: 'auction.deposit', label: 'Deposit Status' },
    { value: 'auction.currentBid', label: 'Current Bid' },
  ]},
  { category: 'User', fields: [
    { value: 'user.role', label: 'User Role' },
    { value: 'user.verified', label: 'Is Verified' },
    { value: 'user.subscribed', label: 'Has Subscription' },
  ]},
  { category: 'Transaction', fields: [
    { value: 'transaction.amount', label: 'Amount' },
    { value: 'transaction.status', label: 'Payment Status' },
    { value: 'transaction.method', label: 'Payment Method' },
  ]},
];

// Available actions
const actions = [
  { value: 'notification.email', label: 'Send Email', icon: 'mail' },
  { value: 'notification.sms', label: 'Send SMS', icon: 'message-square' },
  { value: 'notification.push', label: 'Send Push Notification', icon: 'bell' },
  { value: 'task.create', label: 'Create Task', icon: 'clipboard' },
  { value: 'listing.hide', label: 'Hide Listing', icon: 'eye-off' },
  { value: 'listing.archive', label: 'Archive Listing', icon: 'archive' },
  { value: 'listing.featured', label: 'Feature Listing', icon: 'star' },
  { value: 'dealer.suspend', label: 'Suspend Dealer', icon: 'user-x' },
  { value: 'dealer.activate', label: 'Activate Dealer', icon: 'user-check' },
  { value: 'dealer.verify', label: 'Mark as Verified', icon: 'check-circle' },
  { value: 'subscription.disable', label: 'Disable Subscription', icon: 'x-circle' },
  { value: 'subscription.upgrade', label: 'Upgrade Subscription', icon: 'arrow-up' },
  { value: 'escalate', label: 'Escalate', icon: 'arrow-up-circle' },
  { value: 'webhook.call', label: 'Call Webhook', icon: 'webhook' },
];

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  draft: 'bg-slate-100 text-slate-700',
};

// Sample rules
const sampleRules = [
  {
    id: '1',
    name: 'Low Dealer Rating Protection',
    description: 'Suspend new listings for dealers with rating below 3 stars',
    category: 'dealer',
    status: 'active',
    priority: 1,
    conditions: [
      { field: 'dealer.rating', operator: 'less_than', value: '3' }
    ],
    actions: [
      { type: 'listing.hide', config: { reason: 'Low dealer rating' } },
      { type: 'notification.email', config: { template: 'dealer_rating_warning' } }
    ],
    executions: 45,
    lastExecuted: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Auction Deposit Verification',
    description: 'Issue bidder pass when deposit is verified',
    category: 'auction',
    status: 'active',
    priority: 2,
    conditions: [
      { field: 'auction.deposit', operator: 'equals', value: 'verified' }
    ],
    actions: [
      { type: 'task.create', config: { title: 'Issue Bidder Pass' } }
    ],
    executions: 234,
    lastExecuted: '2024-01-15T14:22:00Z',
  },
  {
    id: '3',
    name: 'Low Inspection Score',
    description: 'Hide listings with inspection scores below minimum threshold',
    category: 'vehicle',
    status: 'active',
    priority: 1,
    conditions: [
      { field: 'vehicle.inspectionScore', operator: 'less_than', value: '60' }
    ],
    actions: [
      { type: 'listing.hide', config: { reason: 'Below minimum inspection score' } }
    ],
    executions: 12,
    lastExecuted: '2024-01-14T09:15:00Z',
  },
  {
    id: '4',
    name: 'Subscription Expiry',
    description: 'Disable premium features when subscription expires',
    category: 'subscription',
    status: 'active',
    priority: 1,
    conditions: [
      { field: 'user.subscription', operator: 'equals', value: 'expired' }
    ],
    actions: [
      { type: 'subscription.disable', config: {} }
    ],
    executions: 89,
    lastExecuted: '2024-01-15T08:00:00Z',
  },
  {
    id: '5',
    name: 'Vehicle Sold',
    description: 'Archive listing when vehicle is marked as sold',
    category: 'vehicle',
    status: 'active',
    priority: 3,
    conditions: [
      { field: 'vehicle.status', operator: 'equals', value: 'sold' }
    ],
    actions: [
      { type: 'listing.archive', config: {} }
    ],
    executions: 567,
    lastExecuted: '2024-01-15T16:45:00Z',
  },
  {
    id: '6',
    name: 'Payment Failed Recovery',
    description: 'Send notification to seller when payment fails',
    category: 'payment',
    status: 'paused',
    priority: 2,
    conditions: [
      { field: 'transaction.status', operator: 'equals', value: 'failed' }
    ],
    actions: [
      { type: 'notification.email', config: { template: 'payment_failed' } }
    ],
    executions: 23,
    lastExecuted: '2024-01-10T11:30:00Z',
  },
];

export default function BusinessRulesManager() {
  const [rules, setRules] = useState(sampleRules);
  const [selectedRule, setSelectedRule] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingRule, setEditingRule] = useState({
    name: '',
    description: '',
    category: 'dealer',
    status: 'draft',
    priority: 1,
    conditions: [{ field: '', operator: 'equals', value: '' }],
    actions: [{ type: '', config: {} }],
  });

  const filteredRules = rules.filter(rule => {
    if (filterCategory !== 'all' && rule.category !== filterCategory) return false;
    if (searchQuery && !rule.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const addCondition = () => {
    setEditingRule(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: '', operator: 'equals', value: '' }]
    }));
  };

  const updateCondition = (index, key, value) => {
    setEditingRule(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => i === index ? { ...c, [key]: value } : c)
    }));
  };

  const removeCondition = (index) => {
    setEditingRule(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const addAction = () => {
    setEditingRule(prev => ({
      ...prev,
      actions: [...prev.actions, { type: '', config: {} }]
    }));
  };

  const updateAction = (index, key, value) => {
    setEditingRule(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) => i === index ? { ...a, [key]: value } : a)
    }));
  };

  const removeAction = (index) => {
    setEditingRule(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const saveRule = () => {
    if (selectedRule) {
      setRules(rules.map(r => r.id === selectedRule.id ? { ...editingRule, id: selectedRule.id } : r));
    } else {
      setRules([...rules, { ...editingRule, id: `rule_${Date.now()}`, executions: 0 }]);
    }
    setShowBuilder(false);
    setIsEditing(false);
    setSelectedRule(null);
  };

  const toggleRuleStatus = (ruleId) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        return { ...r, status: r.status === 'active' ? 'paused' : 'active' };
      }
      return r;
    }));
  };

  return (
    <div className="flex h-full bg-[#F6F1E8]">
      {/* Rules List */}
      <div className={`${showBuilder ? 'w-1/2' : 'w-full'} bg-white border-r border-slate-200 flex flex-col transition-all`}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Business Rules</h2>
            <button
              onClick={() => {
                setEditingRule({
                  name: '',
                  description: '',
                  category: 'dealer',
                  status: 'draft',
                  priority: 1,
                  conditions: [{ field: '', operator: 'equals', value: '' }],
                  actions: [{ type: '', config: {} }],
                });
                setSelectedRule(null);
                setShowBuilder(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
            >
              <Plus size={18} />
              Create Rule
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none"
            >
              <option value="all">All Categories</option>
              <option value="dealer">Dealer</option>
              <option value="vehicle">Vehicle</option>
              <option value="auction">Auction</option>
              <option value="payment">Payment</option>
              <option value="subscription">Subscription</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              onClick={() => setSelectedRule(rule)}
              className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                selectedRule?.id === rule.id ? 'border-[#17244B]' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{rule.name}</h3>
                  <p className="text-xs text-slate-400 capitalize">{rule.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[rule.status]}`}>
                    {rule.status}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleRuleStatus(rule.id); }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg"
                  >
                    {rule.status === 'active' ? <Pause size={16} className="text-slate-500" /> : <Play size={16} className="text-slate-500" />}
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-500 mb-4">{rule.description}</p>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Priority:</span>
                  <span className="font-medium text-slate-600">{rule.priority}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Conditions:</span>
                  <span className="font-medium text-slate-600">{rule.conditions.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Actions:</span>
                  <span className="font-medium text-slate-600">{rule.actions.length}</span>
                </div>
                <div className="ml-auto text-slate-400">
                  {rule.executions} executions
                </div>
              </div>

              {/* Conditions Preview */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500">IF</span>
                  {rule.conditions.map((cond, i) => (
                    <React.Fragment key={i}>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                        {cond.field.split('.')[1]} {cond.operator.replace('_', ' ')} {cond.value}
                      </span>
                      {i < rule.conditions.length - 1 && <span className="text-xs text-slate-400">AND</span>}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500">THEN</span>
                  {rule.actions.map((action, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">
                      {action.type.split('.')[1]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rule Builder */}
      {showBuilder && (
        <div className="w-1/2 flex flex-col bg-[#F6F1E8]">
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              {selectedRule ? 'Edit Rule' : 'Create New Rule'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBuilder(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
              >
                <Save size={18} />
                Save Rule
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={editingRule.name}
                    onChange={(e) => setEditingRule(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
                    placeholder="Enter rule name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                  <textarea
                    value={editingRule.description}
                    onChange={(e) => setEditingRule(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none resize-none"
                    rows={2}
                    placeholder="Describe what this rule does"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
                    <select
                      value={editingRule.category}
                      onChange={(e) => setEditingRule(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none"
                    >
                      <option value="dealer">Dealer</option>
                      <option value="vehicle">Vehicle</option>
                      <option value="auction">Auction</option>
                      <option value="payment">Payment</option>
                      <option value="subscription">Subscription</option>
                      <option value="user">User</option>
                      <option value="support">Support</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Priority</label>
                    <select
                      value={editingRule.priority}
                      onChange={(e) => setEditingRule(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none"
                    >
                      <option value="1">1 - Highest</option>
                      <option value="2">2 - High</option>
                      <option value="3">3 - Medium</option>
                      <option value="4">4 - Low</option>
                      <option value="5">5 - Lowest</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                    <select
                      value={editingRule.status}
                      onChange={(e) => setEditingRule(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Conditions</h3>
                <button
                  onClick={addCondition}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#17244B] hover:bg-[#17244B]/10 rounded-lg"
                >
                  <Plus size={16} />
                  Add Condition
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">All conditions must be met (AND logic)</p>

              <div className="space-y-3">
                {editingRule.conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {index > 0 && (
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">AND</span>
                    )}
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    >
                      <option value="">Select field...</option>
                      {fields.map(cat => (
                        <optgroup key={cat.category} label={cat.category}>
                          {cat.fields.map(field => (
                            <option key={field.value} value={field.value}>{field.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                      className="w-40 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    >
                      {operators.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      className="w-32 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                      placeholder="Value"
                    />
                    {editingRule.conditions.length > 1 && (
                      <button
                        onClick={() => removeCondition(index)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Actions</h3>
                <button
                  onClick={addAction}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#17244B] hover:bg-[#17244B]/10 rounded-lg"
                >
                  <Plus size={16} />
                  Add Action
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">All actions will be executed when conditions are met</p>

              <div className="space-y-3">
                {editingRule.actions.map((action, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        value={action.type}
                        onChange={(e) => updateAction(index, 'type', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                      >
                        <option value="">Select action...</option>
                        {actions.map(a => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                      {editingRule.actions.length > 1 && (
                        <button
                          onClick={() => removeAction(index)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {action.type && (
                      <div className="p-3 bg-white rounded border border-slate-200">
                        <p className="text-xs text-slate-500">Configure action parameters...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
