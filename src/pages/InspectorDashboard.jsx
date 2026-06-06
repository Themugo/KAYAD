import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inspectionAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ClipboardCheck, CheckCircle, Play, MapPin, Car, AlertTriangle, BarChart3, Clock, Shield, Smartphone, DollarSign, ChevronRight, FileText, Image, X } from 'lucide-react';

const CATEGORIES = [
  'Engine', 'Transmission', 'Brakes', 'Suspension', 'Steering',
  'Electrical', 'Body & Paint', 'Interior', 'Tyres & Wheels',
  'Air Conditioning', 'Cooling System', 'Exhaust', 'Fuel System',
  'Lighting', 'Safety Equipment',
];

const ITEMS_PER_CATEGORY = 10;

const WORKFLOW_STEPS = [
  { key: 'pending_payment', label: 'Payment', icon: Smartphone, color: '#f59e0b' },
  { key: 'paid', label: 'Assigned', icon: Car, color: '#3b82f6' },
  { key: 'assigned', label: 'Start', icon: Play, color: '#8b5cf6' },
  { key: 'in_progress', label: 'Inspect', icon: ClipboardCheck, color: 'var(--gold)' },
  { key: 'completed', label: 'Report', icon: FileText, color: '#22c55e' },
];

function StatusBadge({ status }) {
  const map = {
    pending_payment: { bg: 'rgba(251,191,36,0.1)', color: '#f59e0b', label: 'Pending Payment' },
    paid:            { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Paid — Awaiting Assignment' },
    assigned:        { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Assigned' },
    in_progress:     { bg: 'rgba(212,196,168,0.12)', color: 'var(--gold)', label: 'In Progress' },
    completed:       { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'Completed' },
    cancelled:       { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Cancelled' },
  };
  const m = map[status] || { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', label: status };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
      {m.label}
    </span>
  );
}

function WorkflowProgress({ status }) {
  const idx = WORKFLOW_STEPS.findIndex(s => s.key === status);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 16 }}>
      {WORKFLOW_STEPS.map((s, i) => {
        const done = i < idx || (status === 'completed' && i <= idx);
        const active = i === idx;
        return (
          <div key={s.key} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: done ? '#22c55e' : active ? s.color : 'rgba(255,255,255,0.05)',
                border: active ? `2px solid ${s.color}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'all 0.3s',
              }}>
                {done ? <CheckCircle size={12} style={{ color: '#000' }} /> : <s.icon size={11} style={{ color: active ? '#000' : 'rgba(255,255,255,0.2)' }} />}
              </div>
              <div style={{ fontSize: 8, fontWeight: active ? 800 : 500, color: active ? s.color : done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', whiteSpace: 'nowrap', display: 'none' }}>
                {s.label}
              </div>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#22c55e' : 'rgba(255,255,255,0.06)', borderRadius: 1 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent = 'var(--gold)', color }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 22px',
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', background: accent, opacity: 0.06 }} />
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: accent, marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', color: color || '#fff', lineHeight: 1, marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function InspectorDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [score, setScore] = useState(70);
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [tab, setTab] = useState('tasks');
  const [collapsedCats, setCollapsedCats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTasks = async () => {
    try {
      const data = await inspectionAPI.myTasks();
      setTasks(data.orders || []);
    } catch { setTasks([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleStart = async (id) => {
    try {
      await inspectionAPI.start(id);
      toast('Inspection started', 'success');
      loadTasks();
    } catch (error) {
      toast(error?.response?.data?.message || 'Unable to start', 'error');
    }
  };

  const handleBeginChecklist = (task) => {
    setActiveTask(task);
    const initial = [];
    CATEGORIES.forEach(cat => {
      for (let i = 0; i < ITEMS_PER_CATEGORY; i++) {
        initial.push({ category: cat, item: `Check ${cat.toLowerCase()} item ${i + 1}`, passed: null, notes: '' });
      }
    });
    setChecklist(initial);
    setScore(70);
    setCondition('good');
    setNotes('');
    setCollapsedCats([]);
    setSearchQuery('');
  };

  const toggleCheck = (idx) => {
    setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, passed: c.passed === true ? false : c.passed === false ? null : true } : c));
  };

  const updateCheckNotes = (idx, val) => {
    setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, notes: val } : c));
  };

  const handleSubmit = async () => {
    if (!activeTask) return;
    try {
      const passedCount = checklist.filter(c => c.passed === true).length;
      const failedCount = checklist.filter(c => c.passed === false).length;
      const total = checklist.length;
      const calcScore = Math.round((passedCount / total) * 100);

      const reportChecklist = checklist.filter(c => c.passed !== null || c.notes);

      await inspectionAPI.submit(activeTask._id, {
        checklist: reportChecklist,
        overallScore: calcScore,
        conditionRating: condition,
        inspectorNotes: notes,
        images: [],
      });

      toast(`Ghost Check submitted! Score: ${calcScore}/100`, 'success');
      setActiveTask(null);
      loadTasks();
    } catch { toast('Failed to submit', 'error'); }
  };

  const toggleCategory = (cat) => {
    setCollapsedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  if (!user || user.role !== 'ghost_checker') {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}><Shield size={32} style={{ color: '#ef4444' }} /></div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.6rem', color: '#fff', marginBottom: 10 }}>Access Denied</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>This area is restricted to certified Ghost Checkers. If you believe this is an error, contact support.</p>
          <button onClick={() => navigate('/')} style={{ padding: '11px 28px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontWeight: 900, fontSize: 11, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', cursor: 'pointer' }}>Return Home</button>
        </div>
      </div>
    );
  }

  // ── ACTIVE CHECKLIST VIEW ──
  if (activeTask) {
    const total = checklist.length;
    const passed = checklist.filter(c => c.passed === true).length;
    const failed = checklist.filter(c => c.passed === false).length;
    const untested = total - passed - failed;
    const filtered = searchQuery
      ? checklist.filter(c => c.item.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase()))
      : checklist;

    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{
          background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)',
          borderBottom: '1px solid var(--border)', padding: '24px 0 20px',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                  150-Point Ghost Check
                </span>
                <button onClick={() => setActiveTask(null)} style={{
                  padding: '4px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)', fontSize: 10, cursor: 'pointer', fontWeight: 600,
                }}>← Back to Tasks</button>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{passed}</span> passed · <span style={{ color: failed > 0 ? '#ef4444' : 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{failed}</span> failed · <span style={{ color: 'rgba(255,255,255,0.2)' }}>{untested}</span> pending
                </span>
                <div style={{ width: 100, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${(passed / total) * 100}%`, height: '100%', background: '#22c55e', transition: 'width 0.3s' }} />
                  <div style={{ width: `${(failed / total) * 100}%`, height: '100%', background: '#ef4444', transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                  {Math.round((passed / total) * 100)}%
                </span>
              </div>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.2rem,2vw,1.6rem)', color: '#fff', margin: 0 }}>
              {activeTask.car?.title || 'Vehicle Inspection'}
            </h1>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 40px' }}>
          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search inspection items..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 12, outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.3)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }} />
          </div>

          {/* Condition Rating */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Condition:</span>
            {['excellent', 'good', 'fair', 'poor'].map(c => (
              <button key={c} onClick={() => setCondition(c)} style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid',
                background: condition === c ? 'rgba(212,196,168,0.15)' : 'transparent',
                borderColor: condition === c ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.1)',
                color: condition === c ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                transition: 'all 0.15s',
              }}>
                {condition === c ? '✓ ' : ''}{c}
              </button>
            ))}
          </div>

          {/* Categories Summary */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => {
              const items = checklist.filter(c => c.category === cat);
              const catPassed = items.filter(c => c.passed === true).length;
              const catFailed = items.filter(c => c.passed === false).length;
              const allDone = catPassed + catFailed === items.length;
              return (
                <button key={cat} onClick={() => toggleCategory(cat)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid',
                    background: allDone ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                    borderColor: allDone ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
                    color: allDone ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)',
                    fontSize: 9, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  {cat} {allDone ? `✓` : `(${catPassed + catFailed}/${items.length})`}
                </button>
              );
            })}
          </div>

          {/* Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {CATEGORIES.map(cat => {
              const items = (searchQuery ? filtered : checklist).filter(c => c.category === cat);
              if (items.length === 0) return null;
              const catPassed = items.filter(c => c.passed === true).length;
              const catFailed = items.filter(c => c.passed === false).length;
              const isCollapsed = collapsedCats.includes(cat);
              return (
                <div key={cat} style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 12, overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div
                    onClick={() => toggleCategory(cat)}
                    style={{
                      padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', cursor: 'pointer', userSelect: 'none',
                      borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{cat}</span>
                      {catFailed > 0 && <AlertTriangle size={12} style={{ color: '#ef4444' }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 6 }}>
                        <span style={{ color: '#22c55e' }}>{catPassed}✓</span>
                        {catFailed > 0 && <span style={{ color: '#ef4444' }}>{catFailed}✗</span>}
                      </span>
                      <ChevronRight size={12} style={{
                        color: 'rgba(255,255,255,0.2)',
                        transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                        transition: 'transform 0.2s',
                      }} />
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div style={{ padding: '8px 16px 12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 2 }}>
                        {items.map((item, i) => {
                          const globalIdx = checklist.indexOf(item);
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                              <button onClick={() => toggleCheck(globalIdx)}
                                style={{
                                  width: 16, height: 16, borderRadius: 4, border: '1px solid',
                                  flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: item.passed === true ? '#22c55e' : item.passed === false ? '#ef4444' : 'transparent',
                                  borderColor: item.passed === true ? '#22c55e' : item.passed === false ? '#ef4444' : 'rgba(255,255,255,0.15)',
                                  color: item.passed !== null ? '#fff' : 'transparent',
                                  fontSize: 9, fontWeight: 700,
                                  transition: 'all 0.15s',
                                }}>
                                {item.passed === true ? '✓' : item.passed === false ? '✗' : ''}
                              </button>
                              <span style={{
                                fontSize: 10, flex: 1,
                                color: item.passed === true ? 'rgba(255,255,255,0.4)' : item.passed === false ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.5)',
                                textDecoration: item.passed === false ? 'line-through' : 'none',
                              }}>{item.item}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inspector Notes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Overall Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              style={{
                width: '100%', background: '#0C0C0C', border: '1px solid var(--border)',
                borderRadius: 10, padding: 12, color: '#fff', fontSize: 12, resize: 'vertical',
                fontFamily: 'inherit', outline: 'none',
              }}
              placeholder="Summarize overall condition, notable findings..."
            />
          </div>

          <button onClick={handleSubmit} style={{
            width: '100%', padding: '14px', borderRadius: 10,
            background: 'var(--gold)', color: '#000', border: 'none',
            fontSize: 13, fontWeight: 900, cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <FileText size={16} /> Submit Ghost Check Report ({Math.round((passed / total) * 100)}%)
          </button>
        </div>
      </div>
    );
  }

  // ── TASK LIST DASHBOARD ──
  const totalAssigned = tasks.filter(t => t.status === 'assigned').length;
  const totalInProgress = tasks.filter(t => t.status === 'in_progress').length;
  const totalCompleted = tasks.filter(t => t.status === 'completed').length;
  const totalPayment = tasks.filter(t => t.status === 'paid' || t.status === 'pending_payment').length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)', padding: '40px 0 36px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)', borderRadius: 9999, padding: '4px 12px', marginBottom: 10, width: 'fit-content' }}>
            <span style={{ fontSize: 14 }}>🔍</span>
            <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ghost Checker Dashboard</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#fff', margin: '0 0 4px' }}>
                {greeting}, <span style={{ color: 'var(--gold)' }}>{user?.name?.split(' ')[0] || 'Inspector'}</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>
                Ghost Check hub · {new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {tasks.length} tasks
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/" style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Home
              </Link>
              <button onClick={async () => { await logout(); window.location.href = '/'; }} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 32px' }}>
        {/* ── STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard icon={<Smartphone size={18} />} label="Awaiting Payment" value={totalPayment} sub="pending confirmation" accent="#f59e0b" color="#f59e0b" />
          <StatCard icon={<ClipboardCheck size={18} />} label="Assigned" value={totalAssigned} sub="awaiting start" accent="#3b82f6" />
          <StatCard icon={<Play size={18} />} label="In Progress" value={totalInProgress} sub="active inspections" accent="var(--gold)" />
          <StatCard icon={<CheckCircle size={18} />} label="Completed" value={totalCompleted} sub="all time" accent="#22c55e" />
          <StatCard icon={<BarChart3 size={18} />} label="Total Tasks" value={tasks.length} sub="assigned to you" accent="rgba(255,255,255,0.4)" />
        </div>

        {/* ── TAB SWITCHER ── */}
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
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
              {t.label}{t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
          <button onClick={loadTasks} disabled={loading} style={{
            marginLeft: 'auto', padding: '7px 14px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Clock size={11} /> {loading ? '...' : 'Refresh'}
          </button>
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
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '60px 32px', textAlign: 'center',
            }}>
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
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(t => {
                const car = t.car || {};
                const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                return (
                  <div key={t._id} style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: '16px 20px',
                    transition: 'border-color 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    {/* Workflow Progress Bar */}
                    <WorkflowProgress status={t.status} />

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
                        <StatusBadge status={t.status} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {t.status === 'assigned' && (
                          <button onClick={() => handleStart(t._id)} style={{
                            padding: '8px 16px', borderRadius: 8, background: 'var(--gold)', color: '#000',
                            border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <Play size={12} /> Start Inspection
                          </button>
                        )}
                        {t.status === 'in_progress' && (
                          <button onClick={() => handleBeginChecklist(t)} style={{
                            padding: '8px 16px', borderRadius: 8, background: '#22c55e', color: '#000',
                            border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <ClipboardCheck size={12} /> Continue 150-Point Check
                          </button>
                        )}
                        {t.status === 'paid' && (
                          <div style={{
                            padding: '8px 16px', borderRadius: 8, background: 'rgba(59,130,246,0.08)',
                            border: '1px solid rgba(59,130,246,0.15)', color: '#3b82f6',
                            fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                            <Clock size={11} /> Awaiting Admin Assignment
                          </div>
                        )}
                        {t.status === 'pending_payment' && (
                          <div style={{
                            padding: '8px 16px', borderRadius: 8, background: 'rgba(251,191,36,0.08)',
                            border: '1px solid rgba(251,191,36,0.15)', color: '#f59e0b',
                            fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                            <Smartphone size={11} /> Buyer Payment Pending
                          </div>
                        )}
                        {t.status === 'completed' && (
                          <div style={{
                            padding: '8px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.08)',
                            border: '1px solid rgba(34,197,94,0.15)', color: '#22c55e',
                            fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                          }}>
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
