import { Link } from 'react-router-dom';
import { Smartphone, ClipboardCheck, Play, CheckCircle, BarChart3, Clock, Car, MapPin, DollarSign } from 'lucide-react';
import InspectorStatusBadge from './InspectorStatusBadge';
import InspectorWorkflowProgress from './InspectorWorkflowProgress';
import { EnterpriseCard, EnterpriseKPI, EnterpriseTimeline, EnterpriseTaskSummary, EnterpriseTable, DashboardHeader } from '../../../components/enterprise/EnterpriseDashboard';

export default function InspectorTasksView({ tasks, loading, tab, setTab, totalPayment, totalAssigned, totalInProgress, totalCompleted, handleStart, handleBeginChecklist, loadTasks, user, logout }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <DashboardHeader badge="Inspector Dashboard" greeting={greeting} name={user?.name?.split(' ')[0] || 'Inspector'}
        subtitle={`Inspection hub · ${new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${tasks.length} tasks`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadTasks} disabled={loading} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={11} /> {loading ? '...' : 'Refresh'}
            </button>
            <button onClick={async () => { await logout(); window.location.href = '/'; }} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              Sign Out
            </button>
          </div>
        }
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
          <EnterpriseKPI icon={<Smartphone size={18} />} label="Awaiting Payment" value={totalPayment} sub="pending confirmation" accent="#f59e0b" />
          <EnterpriseKPI icon={<ClipboardCheck size={18} />} label="Assigned" value={totalAssigned} sub="awaiting start" accent="#3b82f6" />
          <EnterpriseKPI icon={<Play size={18} />} label="In Progress" value={totalInProgress} sub="active inspections" accent="var(--gold)" />
          <EnterpriseKPI icon={<CheckCircle size={18} />} label="Completed" value={totalCompleted} sub="all time" accent="#22c55e" />
          <EnterpriseKPI icon={<BarChart3 size={18} />} label="Total Tasks" value={tasks.length} sub="assigned to you" accent="rgba(255,255,255,0.4)" />
        </div>

        {/* Task Summary */}
        <div style={{ marginBottom: 28 }}>
          <EnterpriseCard>
            <EnterpriseTaskSummary tasks={[
              { label: 'Assigned', count: totalAssigned, color: '#3b82f6' },
              { label: 'In Progress', count: totalInProgress, color: 'var(--gold)' },
              { label: 'Completed', count: totalCompleted, color: '#22c55e' },
              { label: 'Pending Pay', count: totalPayment, color: '#f59e0b' },
              { label: 'Total', count: tasks.length, color: 'rgba(255,255,255,0.4)' },
            ]} />
          </EnterpriseCard>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          {[
            { key: 'tasks', label: 'All Tasks', count: tasks.length },
            { key: 'payment', label: 'Payment Queue', count: totalPayment },
            { key: 'active', label: 'Active Only', count: totalAssigned + totalInProgress },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '7px 16px', borderRadius: 8,
                background: tab === t.key ? 'rgba(212,196,168,0.1)' : 'transparent',
                border: '1px solid',
                borderColor: tab === t.key ? 'rgba(212,196,168,0.2)' : 'transparent',
                color: tab === t.key ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {t.label}{t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : (() => {
          const filtered = tab === 'payment'
            ? tasks.filter(t => t.status === 'paid' || t.status === 'pending_payment')
            : tab === 'active'
            ? tasks.filter(t => t.status === 'assigned' || t.status === 'in_progress')
            : tasks;

          return filtered.length === 0 ? (
            <EnterpriseCard header={tab === 'payment' ? '💰 Payment Queue' : '📋 Tasks'}>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <ClipboardCheck size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                  {tab === 'payment' ? 'No payments pending' : 'No assignments yet'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                  {tab === 'payment'
                    ? 'All paid inspections have been assigned or completed.'
                    : 'Awaiting inspection orders from dispatch. New tasks will appear here automatically.'}
                </div>
              </div>
            </EnterpriseCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(t => {
                const car = t.car || {};
                const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                return (
                  <div key={t._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
                    <InspectorWorkflowProgress status={t.status} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        {img ? (
                          <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 48, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Car size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                            {car.title || `Vehicle #${t._id?.slice(-6) || '—'}`}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {t.location && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} /> {t.location}</span>}
                            {car.year && <span>{car.year}</span>}
                            {car.brand && <span>{car.brand}</span>}
                            <span>·</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <DollarSign size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
                              Fee: <strong style={{ color: 'var(--gold)' }}>KES {Number(t.fee || 2500).toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>
                        <InspectorStatusBadge status={t.status} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {t.status === 'assigned' && (
                          <button onClick={() => handleStart(t._id)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--gold)', color: '#000', border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Play size={12} /> Start Inspection
                          </button>
                        )}
                        {t.status === 'in_progress' && (
                          <button onClick={() => handleBeginChecklist(t)} style={{ padding: '8px 16px', borderRadius: 8, background: '#22c55e', color: '#000', border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ClipboardCheck size={12} /> Continue 150-Point Check
                          </button>
                        )}
                        {t.status === 'paid' && (
                          <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={11} /> Awaiting Admin Assignment
                          </div>
                        )}
                        {t.status === 'pending_payment' && (
                          <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', color: '#f59e0b', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Smartphone size={11} /> Buyer Payment Pending
                          </div>
                        )}
                        {t.status === 'completed' && (
                          <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CheckCircle size={11} /> Score: {t.overallScore || '—'}/100
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
