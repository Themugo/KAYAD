import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardCheck, Shield, Play, CheckCircle, Clock, Car, MapPin, 
  DollarSign, BarChart3, AlertCircle, Award, Calendar, MapPin as LocationIcon
} from 'lucide-react';
import { 
  EnterpriseCard, DashboardHeader, EnterpriseKPI, EnterpriseTimeline,
  EnterpriseTaskSummary, EnterpriseTable, EnterpriseStatus, 
  EnterpriseMetricRow, InspectionStats, TabNavigation, SectionLabel, 
  GridLayout, GridAuto, EnterpriseEmptyState, EdsColors
} from '../../components/enterprise/EnterpriseDesignSystem';

export default function InspectorDashboardRedesigned() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [user, setUser] = useState({ name: 'Inspector' });
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        awaitingPayment: 2,
        assigned: 3,
        inProgress: 1,
        completed: 45,
        totalTasks: 51,
        avgScore: 87,
        pendingPayment: 1,
      });
      setTasks([
        { id: 'INS-1045', vehicle: 'Toyota Land Cruiser V8 2023', location: 'Nairobi', fee: 2500, status: 'assigned', statusColor: EdsColors.blue, date: '2026-07-11' },
        { id: 'INS-1044', vehicle: 'Mercedes GLE 2023', location: 'Mombasa', fee: 2500, status: 'in_progress', statusColor: EdsColors.gold, date: '2026-07-10' },
        { id: 'INS-1043', vehicle: 'BMW X5 M Sport', location: 'Kisumu', fee: 2500, status: 'completed', statusColor: EdsColors.emerald, date: '2026-07-09', score: 92 },
        { id: 'INS-1042', vehicle: 'Audi Q7 2022', location: 'Nairobi', fee: 2500, status: 'paid', statusColor: EdsColors.orange, date: '2026-07-08' },
        { id: 'INS-1041', vehicle: 'Range Rover Sport', location: 'Eldoret', fee: 2500, status: 'completed', statusColor: EdsColors.emerald, date: '2026-07-07', score: 88 },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const recentActivity = [
    { id: 1, title: 'Inspection completed: BMW X5', description: 'Score: 92/100 — Awaiting payment', time: '2h ago', color: EdsColors.emerald },
    { id: 2, title: 'New assignment received', description: 'Mercedes GLE 2023 — Mombasa', time: '4h ago', color: EdsColors.blue },
    { id: 3, title: 'Payment received: INS-1040', description: 'KES 2,500 — Toyota Corolla', time: '1d ago', color: EdsColors.gold },
    { id: 4, title: 'Inspection completed: Audi Q7', description: 'Score: 88/100 — Paid', time: '2d ago', color: EdsColors.emerald },
  ];

  const completedInspections = [
    { id: 'INS-1043', vehicle: 'BMW X5 M Sport', score: 92, date: '2026-07-09', status: 'paid' },
    { id: 'INS-1041', vehicle: 'Range Rover Sport', score: 88, date: '2026-07-07', status: 'paid' },
    { id: 'INS-1039', vehicle: 'Porsche Cayenne', score: 95, date: '2026-07-05', status: 'paid' },
    { id: 'INS-1037', vehicle: 'Lexus LX 570', score: 84, date: '2026-07-03', status: 'paid' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { id: 'tasks', label: 'Tasks', icon: <ClipboardCheck size={14} />, count: stats?.assigned + stats?.inProgress },
    { id: 'history', label: 'History', icon: <Calendar size={14} />, count: stats?.completed },
  ];

  const getHour = () => new Date().getHours();
  const greeting = getHour() < 12 ? 'Good morning' : getHour() < 18 ? 'Good afternoon' : 'Good evening';

  const getStatusLabel = (status) => {
    const labels = {
      assigned: 'Assigned',
      in_progress: 'In Progress',
      completed: 'Completed',
      paid: 'Paid',
      pending_payment: 'Pending Payment',
    };
    return labels[status] || status;
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
        badge="Inspector Hub"
        badgeColor={EdsColors.emerald}
        greeting={greeting}
        name={user.name.split(' ')[0]}
        subtitle={`${stats.totalTasks} total tasks · ${stats.completed} completed`}
        date={new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${EdsColors.border}`,
                color: EdsColors.textMuted,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Clock size={11} /> Refresh
            </button>
          </div>
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
                icon={<Clock size={18} />}
                label="Awaiting Payment" 
                value={stats.awaitingPayment} 
                accent={EdsColors.orange}
                sub="pending confirmation"
              />
              <EnterpriseKPI 
                icon={<ClipboardCheck size={18} />}
                label="Assigned" 
                value={stats.assigned} 
                accent={EdsColors.blue}
                sub="awaiting start"
              />
              <EnterpriseKPI 
                icon={<Play size={18} />}
                label="In Progress" 
                value={stats.inProgress} 
                accent={EdsColors.gold}
                sub="active inspections"
              />
              <EnterpriseKPI 
                icon={<CheckCircle size={18} />}
                label="Completed" 
                value={stats.completed} 
                accent={EdsColors.emerald}
                sub="all time"
              />
              <EnterpriseKPI 
                icon={<Award size={18} />}
                label="Avg Score" 
                value={`${stats.avgScore}/100`} 
                accent={EdsColors.gold}
              />
            </div>

            {/* Task Summary */}
            <div style={{ marginBottom: 24 }}>
              <EnterpriseCard padding="md">
                <EnterpriseTaskSummary 
                  tasks={[
                    { label: 'Assigned', count: stats.assigned, color: EdsColors.blue },
                    { label: 'In Progress', count: stats.inProgress, color: EdsColors.gold },
                    { label: 'Completed', count: stats.completed, color: EdsColors.emerald },
                    { label: 'Pending Pay', count: stats.pendingPayment, color: EdsColors.orange },
                    { label: 'Total', count: stats.totalTasks, color: EdsColors.textMuted },
                  ]}
                  columns={5}
                />
              </EnterpriseCard>
            </div>

            {/* Main Grid */}
            <GridLayout columns={2} gap={24} style={{ marginBottom: 24 }}>
              {/* Active Tasks */}
              <EnterpriseCard 
                header="Active Tasks" 
                icon={<ClipboardCheck size={16} color={EdsColors.gold} />}
                action={{ label: 'View All', to: '/inspector/tasks' }}
                padding="md"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tasks.filter(t => t.status === 'assigned' || t.status === 'in_progress').map(task => (
                    <div 
                      key={task.id}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: EdsColors.surface,
                        border: `1px solid ${EdsColors.border}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: EdsColors.text, marginBottom: 2 }}>
                            {task.vehicle}
                          </div>
                          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: EdsColors.textMuted }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <LocationIcon size={10} /> {task.location}
                            </span>
                            <span>·</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <DollarSign size={10} /> KES {task.fee.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <EnterpriseStatus label={getStatusLabel(task.status)} color={task.statusColor} />
                      </div>
                      {task.status === 'assigned' && (
                        <button 
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            borderRadius: 8,
                            background: EdsColors.gold,
                            color: '#000',
                            border: 'none',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <Play size={12} /> Start Inspection
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button 
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            borderRadius: 8,
                            background: EdsColors.emerald,
                            color: '#000',
                            border: 'none',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <ClipboardCheck size={12} /> Continue 150-Point Check
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </EnterpriseCard>

              {/* Recent Activity */}
              <EnterpriseCard 
                header="Recent Activity" 
                icon={<Clock size={16} color={EdsColors.emerald} />}
                padding="md"
              >
                <EnterpriseTimeline items={recentActivity} maxItems={4} density="compact" />
              </EnterpriseCard>
            </GridLayout>

            {/* Score Overview */}
            <EnterpriseCard 
              header="Performance Score" 
              icon={<Award size={16} color={EdsColors.gold} />}
              padding="md"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: `conic-gradient(${EdsColors.gold} ${stats.avgScore * 3.6}deg, ${EdsColors.border} 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: EdsColors.card,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}>
                    <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-display)', color: EdsColors.text }}>
                      {stats.avgScore}
                    </span>
                    <span style={{ fontSize: 9, color: EdsColors.textMuted }}>avg score</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: EdsColors.text, marginBottom: 12 }}>
                    Based on {stats.completed} completed inspections
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ padding: '8px 14px', borderRadius: 8, background: `${EdsColors.emerald}15`, border: `1px solid ${EdsColors.emerald}30` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: EdsColors.emerald }}>90-100</div>
                      <div style={{ fontSize: 10, color: EdsColors.textMuted }}>Excellent</div>
                    </div>
                    <div style={{ padding: '8px 14px', borderRadius: 8, background: `${EdsColors.blue}15`, border: `1px solid ${EdsColors.blue}30` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: EdsColors.blue }}>80-89</div>
                      <div style={{ fontSize: 10, color: EdsColors.textMuted }}>Good</div>
                    </div>
                    <div style={{ padding: '8px 14px', borderRadius: 8, background: `${EdsColors.orange}15`, border: `1px solid ${EdsColors.orange}30` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: EdsColors.orange }}>70-79</div>
                      <div style={{ fontSize: 10, color: EdsColors.textMuted }}>Fair</div>
                    </div>
                  </div>
                </div>
              </div>
            </EnterpriseCard>
          </>
        )}

        {tab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map(task => (
              <div 
                key={task.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  borderRadius: 12,
                  background: EdsColors.card,
                  border: `1px solid ${EdsColors.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48,
                    height: 36,
                    borderRadius: 8,
                    background: EdsColors.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Car size={20} color={EdsColors.textDim} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: EdsColors.text, marginBottom: 2 }}>
                      {task.vehicle}
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: EdsColors.textMuted }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <LocationIcon size={10} /> {task.location}
                      </span>
                      <span>·</span>
                      <span style={{ fontFamily: 'monospace' }}>{task.id}</span>
                      <span>·</span>
                      <span>KES {task.fee.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <EnterpriseStatus label={getStatusLabel(task.status)} color={task.statusColor} />
                  {task.score && (
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: `${EdsColors.gold}15`,
                      fontSize: 12,
                      fontWeight: 700,
                      color: EdsColors.gold,
                    }}>
                      {task.score}/100
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <EnterpriseCard header="Completed Inspections" padding="md">
            <EnterpriseTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'vehicle', label: 'Vehicle' },
                { key: 'score', label: 'Score', align: 'center' },
                { key: 'date', label: 'Date', align: 'center' },
                { key: 'status', label: 'Status', align: 'center' },
              ]}
              rows={completedInspections.map(i => ({
                ...i,
                id: <span style={{ fontFamily: 'monospace', fontSize: 11, color: EdsColors.textMuted }}>{i.id}</span>,
                vehicle: <span style={{ fontWeight: 600 }}>{i.vehicle}</span>,
                score: (
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: `${EdsColors.gold}15`,
                    fontSize: 12,
                    fontWeight: 700,
                    color: EdsColors.gold,
                    display: 'inline-block',
                  }}>
                    {i.score}/100
                  </div>
                ),
                date: <span style={{ color: EdsColors.textMuted, fontSize: 12 }}>{i.date}</span>,
                status: <EnterpriseStatus label="Paid" color={EdsColors.emerald} />,
              }))}
              striped
            />
          </EnterpriseCard>
        )}
      </div>
    </div>
  );
}
