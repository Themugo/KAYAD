import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ticket, Users, Clock, CheckCircle, AlertCircle, Star, MessageSquare,
  BarChart3, Headphones, Search, Plus, Settings, FileText, ArrowUpRight
} from 'lucide-react';
import { 
  EnterpriseCard, DashboardHeader, EnterpriseKPI, EnterpriseTimeline,
  EnterpriseNotifications, EnterpriseTaskSummary, EnterpriseTable, 
  EnterpriseStatus, EnterpriseMetricRow, TabNavigation, SectionLabel, 
  GridLayout, GridAuto, EnterpriseEmptyState, AgentCard, TicketCard,
  EdsColors
} from '../../components/enterprise/EnterpriseDesignSystem';

export default function SupportDashboardRedesigned() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [user, setUser] = useState({ name: 'Agent' });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        openTickets: 8,
        inProgress: 5,
        solvedToday: 12,
        highPriority: 3,
        avgResponse: '2.5h',
        totalTickets: 47,
        satisfaction: 4.7,
        resolutionRate: '94%',
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const tickets = [
    { id: 'TK-4021', subject: 'Vehicle not delivered', customer: 'James K.', status: 'open', priority: 'high', date: '2026-07-11', agent: 'Unassigned' },
    { id: 'TK-4020', subject: 'Payment dispute on escrow #8291', customer: 'Aisha M.', status: 'open', priority: 'high', date: '2026-07-10', agent: 'Sarah M.' },
    { id: 'TK-4019', subject: 'How do I list my car?', customer: 'Peter O.', status: 'pending', priority: 'low', date: '2026-07-10', agent: 'John D.' },
    { id: 'TK-4018', subject: 'Inspection report missing photos', customer: 'Grace W.', status: 'in_progress', priority: 'medium', date: '2026-07-09', agent: 'Sarah M.' },
    { id: 'TK-4017', subject: 'Dealer verification delay', customer: 'Nairobi Auto Hub', status: 'open', priority: 'medium', date: '2026-07-09', agent: 'Unassigned' },
    { id: 'TK-4016', subject: 'Account suspended incorrectly', customer: 'John K.', status: 'solved', priority: 'high', date: '2026-07-08', agent: 'Admin' },
    { id: 'TK-4015', subject: 'Escrow release not received', customer: 'Mombasa Motors', status: 'in_progress', priority: 'high', date: '2026-07-08', agent: 'Admin' },
  ];

  const agents = [
    { name: 'Sarah M.', role: 'Senior Agent', tickets: 12, resolved: 8, rating: 4.9, status: 'online' },
    { name: 'John D.', role: 'Agent', tickets: 9, resolved: 6, rating: 4.7, status: 'online' },
    { name: 'Admin', role: 'Super Admin', tickets: 5, resolved: 5, rating: 5.0, status: 'online' },
    { name: 'Peter K.', role: 'Agent', tickets: 4, resolved: 2, rating: 4.5, status: 'away' },
  ];

  const recentActivity = [
    { id: 1, title: 'TK-4021 escalated to high priority', description: 'Vehicle not delivered — buyer request', time: '10m ago', color: EdsColors.red },
    { id: 2, title: 'TK-4018 inspection report updated', description: 'Photos added by inspector', time: '25m ago', color: EdsColors.blue },
    { id: 3, title: 'TK-4017 assigned to Sarah M.', description: 'Dealer verification delay', time: '1h ago', color: EdsColors.gold },
    { id: 4, title: 'TK-4016 marked as solved', description: 'Account suspension resolved', time: '2h ago', color: EdsColors.emerald },
    { id: 5, title: 'New ticket: TK-4022', description: 'Inquiry about auction deposit', time: '3h ago', color: EdsColors.gold },
  ];

  const quickActions = [
    { id: 1, icon: <Ticket size={18} />, label: 'Ticket Queue', description: 'View and manage all tickets', to: '/support' },
    { id: 2, icon: <FileText size={18} />, label: 'Knowledge Base', description: 'FAQs and support articles', to: '/support?tab=knowledge' },
    { id: 3, icon: <Search size={18} />, label: 'Customer Lookup', description: 'Find user accounts', to: '/admin/users' },
    { id: 4, icon: <Headphones size={18} />, label: 'Escrow Inquiries', description: 'Payment & dispute management', to: '/admin/escrows' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { id: 'tickets', label: 'Tickets', icon: <Ticket size={14} />, count: stats?.openTickets },
    { id: 'agents', label: 'Team', icon: <Users size={14} /> },
  ];

  const getPriorityColor = (p) => {
    const colors = { high: EdsColors.red, medium: EdsColors.orange, low: EdsColors.textMuted };
    return colors[p] || EdsColors.textMuted;
  };

  const getStatusColor = (s) => {
    const colors = { open: EdsColors.red, pending: EdsColors.orange, in_progress: EdsColors.blue, solved: EdsColors.emerald };
    return colors[s] || EdsColors.textMuted;
  };

  if (loading || !stats) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <DashboardHeader 
        badge="Support Dashboard"
        badgeColor={EdsColors.purple}
        greeting="Welcome back"
        name={user.name.split(' ')[0]}
        subtitle={`${stats.totalTickets} tickets · ${stats.openTickets} open · ${stats.avgResponse} avg response`}
        date={new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
        actions={
          <Link 
            to="/support/new" 
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              background: EdsColors.purple,
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus size={14} /> New Ticket
          </Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px 28px' }}>
        {/* Tab Navigation */}
        <TabNavigation tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
              <EnterpriseKPI 
                icon={<AlertCircle size={18} />}
                label="Open Tickets" 
                value={stats.openTickets} 
                trend={-12}
                accent={EdsColors.red}
              />
              <EnterpriseKPI 
                icon={<Clock size={18} />}
                label="In Progress" 
                value={stats.inProgress} 
                accent={EdsColors.blue}
              />
              <EnterpriseKPI 
                icon={<CheckCircle size={18} />}
                label="Solved Today" 
                value={stats.solvedToday} 
                trend={8}
                accent={EdsColors.emerald}
              />
              <EnterpriseKPI 
                icon={<Star size={18} />}
                label="High Priority" 
                value={stats.highPriority} 
                accent={EdsColors.red}
              />
              <EnterpriseKPI 
                icon={<MessageSquare size={18} />}
                label="Avg Response" 
                value={stats.avgResponse} 
                accent={EdsColors.gold}
              />
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Quick Actions</SectionLabel>
              <EnterpriseQuickActions actions={quickActions} columns={4} density="compact" />
            </div>

            {/* Main Grid */}
            <GridLayout columns={2} gap={24} style={{ marginBottom: 24 }}>
              {/* Ticket Summary */}
              <EnterpriseCard 
                header="Ticket Summary" 
                icon={<Ticket size={16} color={EdsColors.gold} />}
                padding="md"
              >
                <EnterpriseTaskSummary 
                  tasks={[
                    { label: 'Open', count: stats.openTickets, color: EdsColors.red },
                    { label: 'In Progress', count: stats.inProgress, color: EdsColors.blue },
                    { label: 'Pending', count: tickets.filter(t => t.status === 'pending').length, color: EdsColors.orange },
                    { label: 'Solved', count: stats.solvedToday, color: EdsColors.emerald },
                    { label: 'Total', count: stats.totalTickets, color: EdsColors.textMuted },
                  ]}
                  columns={5}
                />
              </EnterpriseCard>

              {/* Agent Performance */}
              <EnterpriseCard 
                header="Agent Performance" 
                icon={<Users size={16} color={EdsColors.blue} />}
                padding="md"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {agents.map((agent, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 10,
                      background: EdsColors.surface,
                      border: `1px solid ${EdsColors.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: `${EdsColors.gold}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                          color: EdsColors.gold,
                        }}>
                          {agent.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: EdsColors.text }}>
                            {agent.name}
                          </div>
                          <div style={{ fontSize: 11, color: EdsColors.textMuted }}>
                            {agent.role}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: EdsColors.text }}>{agent.tickets}</div>
                          <div style={{ fontSize: 9, color: EdsColors.textMuted }}>tickets</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: EdsColors.emerald }}>{agent.resolved}</div>
                          <div style={{ fontSize: 9, color: EdsColors.textMuted }}>resolved</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={12} color={EdsColors.gold} fill={EdsColors.gold} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: EdsColors.text }}>{agent.rating}</span>
                        </div>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: agent.status === 'online' ? EdsColors.emerald : EdsColors.orange,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </EnterpriseCard>
            </GridLayout>

            {/* Secondary Grid */}
            <GridLayout columns={2} gap={24} style={{ marginBottom: 24 }}>
              {/* Recent Activity */}
              <EnterpriseCard 
                header="Recent Activity" 
                icon={<Clock size={16} color={EdsColors.emerald} />}
                padding="md"
              >
                <EnterpriseTimeline items={recentActivity} maxItems={5} density="compact" />
              </EnterpriseCard>

              {/* Satisfaction Metrics */}
              <EnterpriseCard 
                header="Satisfaction Metrics" 
                icon={<Star size={16} color={EdsColors.gold} />}
                padding="md"
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    { icon: <Star size={20} />, value: stats.satisfaction, label: 'Avg Rating', color: EdsColors.gold },
                    { icon: <MessageSquare size={20} />, value: stats.avgResponse, label: 'Response Time', color: EdsColors.blue },
                    { icon: <CheckCircle size={20} />, value: stats.resolutionRate, label: 'Resolution Rate', color: EdsColors.emerald },
                    { icon: <Ticket size={20} />, value: stats.totalTickets - stats.openTickets, label: 'Closed Tickets', color: EdsColors.purple },
                  ].map((m, i) => (
                    <div 
                      key={i}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: `${m.color}10`,
                        border: `1px solid ${m.color}20`,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ color: m.color, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{m.icon}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.text }}>
                        {m.value}
                      </div>
                      <div style={{ fontSize: 9, color: EdsColors.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
              </EnterpriseCard>
            </GridLayout>

            {/* Recent Tickets */}
            <SectionLabel action={<Link to="/support" style={{ color: EdsColors.gold, fontSize: 11, fontWeight: 600 }}>View All →</Link>}>
              Recent Tickets
            </SectionLabel>
            <GridAuto minWidth={280}>
              {tickets.slice(0, 4).map(ticket => (
                <TicketCard 
                  key={ticket.id}
                  ticket={{
                    ...ticket,
                    onClick: () => {},
                  }}
                />
              ))}
            </GridAuto>
          </>
        )}

        {tab === 'tickets' && (
          <EnterpriseCard header="All Tickets" padding="md">
            <EnterpriseTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'subject', label: 'Subject' },
                { key: 'customer', label: 'Customer' },
                { key: 'priority', label: 'Priority', align: 'center' },
                { key: 'status', label: 'Status', align: 'center' },
                { key: 'agent', label: 'Agent' },
                { key: 'date', label: 'Date', align: 'center' },
              ]}
              rows={tickets.map(t => ({
                ...t,
                id: <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: EdsColors.gold }}>{t.id}</span>,
                subject: <span style={{ fontWeight: 500 }}>{t.subject}</span>,
                customer: <span style={{ color: EdsColors.textMuted }}>{t.customer}</span>,
                priority: <EnterpriseStatus label={t.priority} color={getPriorityColor(t.priority)} variant="outline" />,
                status: <EnterpriseStatus label={t.status.replace('_', ' ')} color={getStatusColor(t.status)} />,
                agent: <span style={{ color: EdsColors.textMuted }}>{t.agent}</span>,
                date: <span style={{ color: EdsColors.textMuted, fontSize: 12 }}>{t.date}</span>,
              }))}
              striped
            />
          </EnterpriseCard>
        )}

        {tab === 'agents' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <EnterpriseCard header="Support Team" padding="md">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {agents.map((agent, i) => (
                  <AgentCard key={i} agent={agent} />
                ))}
              </div>
            </EnterpriseCard>
            <EnterpriseCard header="Team Performance" padding="md">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ textAlign: 'center', padding: 20, borderRadius: 12, background: EdsColors.surface }}>
                  <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.emerald }}>26</div>
                  <div style={{ fontSize: 11, color: EdsColors.textMuted, marginTop: 4 }}>Resolved Today</div>
                </div>
                <div style={{ textAlign: 'center', padding: 20, borderRadius: 12, background: EdsColors.surface }}>
                  <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.gold }}>4.7</div>
                  <div style={{ fontSize: 11, color: EdsColors.textMuted, marginTop: 4 }}>Avg Rating</div>
                </div>
                <div style={{ textAlign: 'center', padding: 20, borderRadius: 12, background: EdsColors.surface }}>
                  <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.blue }}>30</div>
                  <div style={{ fontSize: 11, color: EdsColors.textMuted, marginTop: 4 }}>Avg Tickets/Agent</div>
                </div>
                <div style={{ textAlign: 'center', padding: 20, borderRadius: 12, background: EdsColors.surface }}>
                  <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.purple }}>94%</div>
                  <div style={{ fontSize: 11, color: EdsColors.textMuted, marginTop: 4 }}>Resolution Rate</div>
                </div>
              </div>
            </EnterpriseCard>
          </div>
        )}
      </div>
    </div>
  );
}
