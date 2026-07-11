import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EnterpriseCard, EnterpriseKPI, EnterpriseTimeline, EnterpriseQuickActions, EnterpriseTable, EnterpriseTaskSummary, EnterpriseMetricRow, EnterpriseStatus, DashboardHeader } from '../components/enterprise/EnterpriseDashboard';

const MOCK_TICKETS = [
  { id: 'TK-4021', subject: 'Vehicle not delivered', customer: 'James K.', status: 'open', priority: 'high', date: '2026-07-11', agent: 'Unassigned' },
  { id: 'TK-4020', subject: 'Payment dispute on escrow #8291', customer: 'Aisha M.', status: 'open', priority: 'high', date: '2026-07-10', agent: 'Sarah M.' },
  { id: 'TK-4019', subject: 'How do I list my car?', customer: 'Peter O.', status: 'pending', priority: 'low', date: '2026-07-10', agent: 'John D.' },
  { id: 'TK-4018', subject: 'Inspection report missing photos', customer: 'Grace W.', status: 'in_progress', priority: 'medium', date: '2026-07-09', agent: 'Sarah M.' },
  { id: 'TK-4017', subject: 'Dealer verification delay', customer: 'Nairobi Auto Hub', status: 'open', priority: 'medium', date: '2026-07-09', agent: 'Unassigned' },
  { id: 'TK-4016', subject: 'Account suspended incorrectly', customer: 'John K.', status: 'solved', priority: 'high', date: '2026-07-08', agent: 'Admin' },
  { id: 'TK-4015', subject: 'Escrow release not received', customer: 'Mombasa Motors', status: 'in_progress', priority: 'high', date: '2026-07-08', agent: 'Admin' },
];

const MOCK_AGENTS = [
  { name: 'Sarah M.', role: 'Senior Agent', tickets: 12, resolved: 8, rating: 4.9, status: 'online' },
  { name: 'John D.', role: 'Agent', tickets: 9, resolved: 6, rating: 4.7, status: 'online' },
  { name: 'Admin', role: 'Super Admin', tickets: 5, resolved: 5, rating: 5.0, status: 'online' },
  { name: 'Peter K.', role: 'Agent', tickets: 4, resolved: 2, rating: 4.5, status: 'away' },
];

export default function SupportDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    setTickets(MOCK_TICKETS);
    setTimeout(() => setLoading(false), 300);
  }, []);

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;
  const solved = tickets.filter(t => t.status === 'solved').length;
  const highPriority = tickets.filter(t => t.priority === 'high' && t.status !== 'solved').length;
  const avgResponse = '2.5h';

  const statusColor = (status) => {
    const map = { open: '#ef4444', pending: '#f59e0b', in_progress: '#3b82f6', solved: '#22c55e' };
    return map[status] || 'rgba(255,255,255,0.3)';
  };

  const priorityColor = (p) => {
    const map = { high: '#ef4444', medium: '#f59e0b', low: 'rgba(255,255,255,0.3)' };
    return map[p] || 'rgba(255,255,255,0.3)';
  };

  return (
    <div className="page" style={{ paddingTop: 88 }}>
      <DashboardHeader badge="Support Dashboard" greeting="Welcome" name={user?.name?.split(' ')[0] || 'Agent'}
        subtitle={`${tickets.length} tickets · ${openTickets} open · ${avgResponse} avg response`}
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
          <EnterpriseKPI icon="🎫" label="Open Tickets" value={openTickets} trend={-12} accent="#ef4444" />
          <EnterpriseKPI icon="🔄" label="In Progress" value={inProgress} accent="#3b82f6" />
          <EnterpriseKPI icon="✅" label="Solved Today" value={solved} trend={8} accent="#22c55e" />
          <EnterpriseKPI icon="🔴" label="High Priority" value={highPriority} accent="#ef4444" />
          <EnterpriseKPI icon="⏱" label="Avg Response" value={avgResponse} accent="var(--gold)" />
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Quick Actions</div>
          <EnterpriseQuickActions actions={[
            { to: '/support', icon: '🎫', label: 'Ticket Queue', desc: 'View and manage all tickets' },
            { to: '/support?tab=knowledge', icon: '📚', label: 'Knowledge Base', desc: 'FAQs and support articles' },
            { to: '/admin/users', icon: '👤', label: 'Customer Lookup', desc: 'Find user accounts and history' },
            { to: '/admin/escrows', icon: '🔒', label: 'Escrow Inquiries', desc: 'Payment and dispute management' },
          ]} />
        </div>

        {/* Tasks + Agent Performance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          <EnterpriseCard header="📊 Ticket Summary">
            <EnterpriseTaskSummary tasks={[
              { label: 'Open', count: openTickets, color: '#ef4444' },
              { label: 'In Progress', count: inProgress, color: '#3b82f6' },
              { label: 'Pending', count: tickets.filter(t => t.status === 'pending').length, color: '#f59e0b' },
              { label: 'Solved', count: solved, color: '#22c55e' },
              { label: 'Total', count: tickets.length, color: 'rgba(255,255,255,0.4)' },
            ]} />
          </EnterpriseCard>

          <EnterpriseCard header="👥 Agent Performance">
            <EnterpriseTable
              columns={[
                { key: 'name', label: 'Agent' },
                { key: 'load', label: 'Load', align: 'center' },
                { key: 'resolved', label: 'Resolved', align: 'center' },
                { key: 'rating', label: 'Rating', align: 'center' },
                { key: 'status', label: 'Status', align: 'center' },
              ]}
              rows={MOCK_AGENTS.map(a => ({
                name: <span style={{ fontWeight: 600, color: '#fff' }}>{a.name}</span>,
                load: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{a.tickets}</span>,
                resolved: <span style={{ color: '#22c55e' }}>{a.resolved}</span>,
                rating: <span style={{ color: 'var(--gold)' }}>★ {a.rating}</span>,
                status: <EnterpriseStatus label={a.status} color={a.status === 'online' ? '#22c55e' : '#f59e0b'} />,
              }))}
              emptyMessage="No agents"
            />
          </EnterpriseCard>
        </div>

        {/* Recent Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          <EnterpriseCard header="⚡ Recent Activity">
            <EnterpriseTimeline items={[
              { title: 'TK-4021 escalated to high priority', description: 'Vehicle not delivered — buyer request', time: '10m ago', color: '#ef4444' },
              { title: 'TK-4018 inspection report updated', description: 'Photos added by inspector', time: '25m ago', color: '#3b82f6' },
              { title: 'TK-4017 assigned to Sarah M.', description: 'Dealer verification delay', time: '1h ago', color: '#3b82f6' },
              { title: 'TK-4016 marked as solved', description: 'Account suspension resolved', time: '2h ago', color: '#22c55e' },
              { title: 'New ticket: TK-4022', description: 'Inquiry about auction deposit', time: '3h ago', color: 'var(--gold)' },
            ]} />
          </EnterpriseCard>

          <EnterpriseCard header="📈 Satisfaction Metrics">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: '⭐', value: '4.7', label: 'Avg Rating' },
                { icon: '⏱', value: avgResponse, label: 'Response Time' },
                { icon: '✅', value: '94%', label: 'Resolution Rate' },
                { icon: '🔄', value: `${tickets.filter(t => t.status !== 'solved').length}`, label: 'Open Backlog' },
              ].map((m, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff' }}>{m.value}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </EnterpriseCard>
        </div>

        {/* Tickets Table */}
        <EnterpriseCard header="🎫 Recent Tickets">
          <EnterpriseTable
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'subject', label: 'Subject' },
              { key: 'customer', label: 'Customer' },
              { key: 'priority', label: 'Priority', align: 'center' },
              { key: 'status', label: 'Status', align: 'center' },
              { key: 'agent', label: 'Agent' },
              { key: 'date', label: 'Date' },
            ]}
            rows={tickets.slice(0, 7).map(t => ({
              id: <span style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace', fontSize: 12 }}>{t.id}</span>,
              subject: <span style={{ color: '#fff', fontWeight: 500 }}>{t.subject}</span>,
              customer: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t.customer}</span>,
              priority: <EnterpriseStatus label={t.priority} color={priorityColor(t.priority)} />,
              status: <EnterpriseStatus label={t.status} color={statusColor(t.status)} />,
              agent: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t.agent}</span>,
              date: <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t.date}</span>,
            }))}
            emptyMessage="No tickets yet"
          />
        </EnterpriseCard>
      </div>
    </div>
  );
}
