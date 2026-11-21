import React, { useState, useEffect } from 'react';
import {
  Activity, GitBranch, ListChecks, Bell, Clock, Shield,
  Zap, BarChart3, FileText, Settings, ChevronRight, Play,
  Pause, Plus, Eye, Edit, Trash2, Search, Filter, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Timer, Users, Webhook,
  Database, Mail, MessageSquare, BellRing, Calendar, RefreshCw,
  Brain, ArrowUpRight, TrendingUp, ClipboardList, FlaskConical
} from 'lucide-react';
import * as automationApi from '../../../services/automationApi';
import { isUnavailable } from '../../../components/admin/adminStat';

// Design System Colors
const colors = {
  navy: '#0A3340',
  beige: '#EEF7F5',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#5aafa4',
  softBlue: '#5AAFA4',
  mutedOrange: '#13b8a6',
  mutedCrimson: '#EF4444',
};

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity, color: colors.navy },
  { id: 'workflows', label: 'Workflows', icon: GitBranch, color: colors.softBlue },
  { id: 'rules', label: 'Business Rules', icon: Shield, color: colors.emerald },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle, color: colors.terracotta },
  { id: 'tasks', label: 'Tasks', icon: ListChecks, color: '#5aafa4' },
  { id: 'notifications', label: 'Notifications', icon: BellRing, color: colors.mutedOrange },
  { id: 'scheduler', label: 'Scheduler', icon: Clock, color: '#13B8A6' },
  { id: 'logs', label: 'Logs', icon: FileText, color: colors.softBlue },
  { id: 'templates', label: 'Templates', icon: FlaskConical, color: '#5aafa4' },
  { id: 'ai', label: 'AI Suggestions', icon: Brain, color: '#13B8A6' },
  { id: 'settings', label: 'Settings', icon: Settings, color: colors.navy },
];

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-[#DDF4F0] text-[#12576D]',
  draft: 'bg-[#EEF7F5] text-[#12576D]',
  failed: 'bg-red-100 text-red-700',
  completed: 'bg-[#DDF4F0] text-[#12576D]',
  pending: 'bg-[#DDF4F0] text-[#12576D]',
  in_progress: 'bg-[#DDF4F0] text-[#12576D]',
};

const known = (value) => typeof value === 'number' && Number.isFinite(value);

export default function AutomationStudio() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await automationApi.getAutomationStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // No synthetic production fallback: the dashboard remains empty until the backend responds.
    }
    try {
      const { data } = await automationApi.getWorkflows();
      setWorkflows(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Automation Overview</h2>
        <button
          onClick={() => setActiveModule('workflows')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D] transition-colors"
        >
          <Plus size={18} />
          Create Workflow
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Workflows', value: stats?.workflows?.active, sub: `${known(stats?.workflows?.total) ? stats.workflows.total : 'Unavailable'} total`, icon: GitBranch, color: colors.softBlue },
          { label: 'Pending Tasks', value: stats?.tasks?.pending, sub: `${known(stats?.tasks?.overdue) ? stats.tasks.overdue : 'Unavailable'} overdue`, icon: ListChecks, color: colors.terracotta },
          { label: 'Active Rules', value: stats?.rules?.active, sub: `${known(stats?.rules?.total) ? stats.rules.total : 'Unavailable'} configured`, icon: Shield, color: colors.emerald },
          { label: 'Executions Today', value: stats?.executions?.total, sub: known(stats?.executions?.total) && stats.executions.total > 0 && known(stats?.executions?.successful) ? `${Math.round(stats.executions.successful / stats.executions.total * 100)}% success` : 'Success rate unavailable', icon: Activity, color: colors.navy },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span className="text-sm text-[#64748B]">{stat.label}</span>
            </div>
            <div className={`${isUnavailable(known(stat.value) ? stat.value.toLocaleString() : 'Unavailable') ? 'text-lg' : 'text-3xl'} font-bold text-[#0A3340]`}>{known(stat.value) ? stat.value.toLocaleString() : 'Unavailable'}</div>
            <div className="text-xs text-[#94A3B8] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Performance & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#0A3340]">Recent Executions</h3>
            <button
              onClick={() => setActiveModule('logs')}
              className="text-sm text-[#0A3340] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {[].map((exec, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#F6FAF9]">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${exec.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {exec.status === 'success' ? <CheckCircle size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-red-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0A3340]">{exec.name}</p>
                    <p className="text-xs text-[#94A3B8]">{exec.time}</p>
                  </div>
                </div>
                <span className="text-xs text-[#64748B]">{exec.duration}</span>
              </div>
            ))}
            <p className="text-sm text-[#64748B]" role="status">No recent executions are connected to this view yet.</p>
          </div>
        </div>

        {/* Task Queue */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#0A3340]">Task Queue</h3>
            <button
              onClick={() => setActiveModule('tasks')}
              className="text-sm text-[#0A3340] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {[].map((task, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#F6FAF9]">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-[#13B8A6]' : 'bg-[#91CEC5]'}`} />
                  <div>
                    <p className="text-sm font-medium text-[#0A3340]">{task.title}</p>
                    <p className="text-xs text-[#94A3B8]">{task.assignee}</p>
                  </div>
                </div>
                <span className="text-xs text-[#64748B]">{task.due}</span>
              </div>
            ))}<p className="col-span-full text-sm text-[#64748B]" role="status">No tasks are connected to this view yet.</p>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#DDF4F0] flex items-center justify-center">
              <Brain size={20} className="text-[#176B87]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0A3340]">AI Automation Suggestions</h3>
              <p className="text-sm text-[#64748B]">Recommendations based on platform patterns</p>
            </div>
          </div>
          <button className="text-sm text-[#0A3340] hover:underline flex items-center gap-1">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[].map((sug, i) => (
            <div key={i} className="p-4 rounded-lg border border-[#D7E7E4] hover:border-[#0A3340] transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-[#0A3340]">{sug.title}</h4>
                <ArrowUpRight size={16} className="text-[#94A3B8]" />
              </div>
              <p className="text-sm text-[#64748B] mb-3">{sug.desc}</p>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600">{sug.impact}</span>
              </div>
            </div>
          ))}<p className="col-span-full text-sm text-[#64748B]" role="status">AI suggestions are not connected to a data source, so none are shown.</p>
        </div>
      </div>
    </div>
  );

  const renderWorkflows = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Workflows</h2>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
            <FlaskConical size={18} />
            Use Template
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
            <Plus size={18} />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4] hover:border-[#0A3340] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EEF7F5] flex items-center justify-center">
                  <GitBranch size={20} className="text-[#64748B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A3340]">{workflow.name || 'Untitled workflow'}</h3>
                  <p className="text-xs text-[#64748B] capitalize">{workflow.category || 'uncategorised'}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[workflow.status] || ''}`}>
                {workflow.status}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#D7E7E4]">
              <div className="flex items-center gap-4 text-sm text-[#64748B]">
                <span>{Number.isFinite(workflow.runs ?? workflow.executionCount) ? `${workflow.runs ?? workflow.executionCount} runs` : 'Runs not reported'}</span>
                {Number.isFinite(workflow.success) && workflow.success > 0 && <span className="text-emerald-600">{workflow.success}% success</span>}
              </div>
              <div className="flex items-center gap-1">
                {workflow.status === 'active' ? (
                  <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" title="Pause" aria-label="Pause">
                    <Pause size={16} className="text-[#64748B]" />
                  </button>
                ) : workflow.status === 'paused' ? (
                  <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" title="Resume" aria-label="Resume">
                    <Play size={16} className="text-[#64748B]" />
                  </button>
                ) : null}
                <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" title="Edit" aria-label="Edit">
                  <Edit size={16} className="text-[#64748B]" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {workflows.length === 0 && <p className="col-span-full text-sm text-[#64748B]" role="status">No workflows were returned.</p>}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Automation Tasks</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          Create Task
        </button>
      </div>

      {/* Task Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] focus:ring-2 focus:ring-[#0A3340]/20 outline-none"
          />
        </div>
        <select className="px-4 py-2.5 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none">
          <option>All Status</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
        <select className="px-4 py-2.5 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none">
          <option>All Priority</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F6FAF9] border-b border-[#D7E7E4]">
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Task</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Priority</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Status</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Assignee</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Due</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {[].map((task, i) => (
              <tr key={i} className="hover:bg-[#F6FAF9] transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-[#0A3340]">{task.title}</p>
                    <p className="text-xs text-[#94A3B8] capitalize">{task.type}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-[#EEF7F5] text-[#12576D]'
                  }`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#5aafa4]/20 text-[#5aafa4] text-xs font-medium flex items-center justify-center">
                      {task.assignee[0]}
                    </div>
                    <span className="text-sm text-[#64748B]">{task.assignee}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{task.due}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {task.status === 'pending' && (
                      <button className="px-3 py-1 text-xs bg-[#0A3340] text-white rounded hover:bg-[#12576D]">
                        Start
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                        Complete
                      </button>
                    )}
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="More actions">
                      <MoreVertical size={16} className="text-[#64748B]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}<tr><td colSpan={6} className="px-6 py-6 text-sm text-[#64748B]">Task data is not connected to a source, so no tasks are listed.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRules = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Business Rules</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          Create Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[].map((rule, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#0A3340]">{rule.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium mt-1 inline-block ${statusColors[rule.status]}`}>
                  {rule.status}
                </span>
              </div>
              <span className="text-sm text-[#64748B]">{rule.executions} executions</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-[#94A3B8] font-medium">IF</span>
                <span className="text-[#64748B]">{rule.condition}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#94A3B8] font-medium">THEN</span>
                <span className="text-[#64748B]">{rule.action}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#D7E7E4]">
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Edit">
                <Edit size={16} className="text-[#64748B]" />
              </button>
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label={rule.status === 'active' ? 'Pause rule' : 'Resume rule'}>
                {rule.status === 'active' ? <Pause size={16} className="text-[#64748B]" /> : <Play size={16} className="text-[#64748B]" />}
              </button>
              <button className="p-2 hover:bg-red-50 rounded-lg" aria-label="Delete">
                <Trash2 size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}<p className="col-span-full text-sm text-[#64748B]" role="status">Business rules are not connected to a source, so none are listed.</p>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Notification Templates</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[].map((template, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#EEF7F5] flex items-center justify-center">
                <Mail size={20} className="text-[#64748B]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#0A3340]">{template.name}</h3>
                <p className="text-xs text-[#94A3B8]">{template.channel}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#D7E7E4]">
              <span className="text-sm text-[#64748B]">{template.usage} sent</span>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="View">
                  <Eye size={16} className="text-[#64748B]" />
                </button>
                <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Edit">
                  <Edit size={16} className="text-[#64748B]" />
                </button>
              </div>
            </div>
          </div>
        ))}<p className="col-span-full text-sm text-[#64748B]" role="status">Notification templates are not connected to a source, so none are listed.</p>
      </div>
    </div>
  );

  const renderScheduler = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Scheduled Jobs</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          Create Scheduled Job
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F6FAF9] border-b border-[#D7E7E4]">
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Job</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Schedule</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Last Run</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Next Run</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Status</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {[].map((job, i) => (
              <tr key={i} className="hover:bg-[#F6FAF9] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF7F5] flex items-center justify-center">
                      <Clock size={16} className="text-[#64748B]" />
                    </div>
                    <span className="font-medium text-[#0A3340]">{job.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{job.schedule}</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{job.lastRun}</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{job.nextRun}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="px-3 py-1 text-xs border border-[#D7E7E4] rounded hover:bg-[#F6FAF9]">
                      Run Now
                    </button>
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Edit">
                      <Edit size={16} className="text-[#64748B]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            <tr><td colSpan={5} className="px-6 py-6 text-center text-sm text-[#64748B]">No scheduled jobs are connected to this view yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'workflows': return renderWorkflows();
      case 'tasks': return renderTasks();
      case 'rules': return renderRules();
      case 'notifications': return renderNotifications();
      case 'scheduler': return renderScheduler();
      default: return (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-[#D7E7E4] text-center">
          <Activity size={64} className="mx-auto text-[#BDE5DE] mb-4" />
          <h3 className="text-xl font-semibold text-[#0A3340] mb-2">{modules.find(m => m.id === activeModule)?.label}</h3>
          <p className="text-[#64748B]">This module is under development</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF7F5]">
      {/* Header */}
      <header className="bg-white border-b border-[#D7E7E4] sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A3340] flex items-center justify-center">
                  <Zap size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Automation Studio</h1>
                  <p className="text-xs text-[#64748B]">Workflow & Business Rules</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Notifications">
                <Bell size={20} className="text-[#64748B]" />
              </button>
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Settings">
                <Settings size={20} className="text-[#64748B]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#D7E7E4] min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#0A3340] text-white'
                      : 'text-[#64748B] hover:bg-[#EEF7F5]'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{module.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {renderModuleContent()}
        </div>
      </div>
    </div>
  );
}
