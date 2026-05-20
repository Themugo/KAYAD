import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionAPI, formatKES } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ClipboardCheck, CheckCircle, Play, MapPin, Car } from 'lucide-react';

const CATEGORIES = [
  'Engine', 'Transmission', 'Brakes', 'Suspension', 'Steering',
  'Electrical', 'Body & Paint', 'Interior', 'Tyres & Wheels',
  'Air Conditioning', 'Cooling System', 'Exhaust', 'Fuel System',
  'Lighting', 'Safety Equipment',
];

const ITEMS_PER_CATEGORY = 10;

export default function InspectorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [score, setScore] = useState(70);
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');

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
      console.warn('Unable to start inspection', error);
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
  };

  const toggleCheck = (idx) => {
    setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, passed: !c.passed } : c));
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

      toast(`Inspection submitted! Score: ${calcScore}/100`, 'success');
      setActiveTask(null);
      loadTasks();
    } catch { toast('Failed to submit', 'error'); }
  };

  if (!user || user.role !== 'ghost_checker') {
    return <div className="page"><div className="container"><p>Access denied. Inspector role required.</p></div></div>;
  }

  if (activeTask) {
    const total = checklist.length;
    const passed = checklist.filter(c => c.passed === true).length;
    const failed = checklist.filter(c => c.passed === false).length;

    return (
      <div className="page" style={{ padding: '24px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div className="section-eyebrow">150-Point Inspection</div>
              <h2 style={{ fontSize: '1.3rem' }}>{activeTask.car?.title || 'Vehicle Inspection'}</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Passed: {passed}/{total}</span>
              <span style={{ fontSize: 11, color: failed > 0 ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>Failed: {failed}/{total}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--gold)' }}>{Math.round((passed / total) * 100)}%</span>
            </div>
          </div>

          {/* Condition Rating */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['excellent', 'good', 'fair', 'poor'].map(c => (
              <button key={c} onClick={() => setCondition(c)} style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid',
                background: condition === c ? 'rgba(212,196,168,0.15)' : 'transparent',
                borderColor: condition === c ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.1)',
                color: condition === c ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
              }}>
                {condition === c ? '✓ ' : ''}{c}
              </button>
            ))}
          </div>

          {/* Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {CATEGORIES.map(cat => {
              const items = checklist.filter(c => c.category === cat);
              const catPassed = items.filter(c => c.passed === true).length;
              const catFailed = items.filter(c => c.passed === false).length;
              return (
                <div key={cat} style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{cat}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      {catPassed}✓ {catFailed > 0 ? `${catFailed}✗ ` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                    {items.map((item, i) => {
                      const globalIdx = checklist.indexOf(item);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                          <button onClick={() => toggleCheck(globalIdx)}
                            style={{
                              width: 16, height: 16, borderRadius: 4, border: '1px solid',
                              flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: item.passed === true ? '#22c55e' : item.passed === false ? '#ef4444' : 'transparent',
                              borderColor: item.passed === true ? '#22c55e' : item.passed === false ? '#ef4444' : 'rgba(255,255,255,0.15)',
                              color: item.passed !== null ? '#fff' : 'transparent',
                              fontSize: 9, fontWeight: 700,
                            }}>
                            {item.passed === true ? '✓' : item.passed === false ? '✗' : ''}
                          </button>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', flex: 1 }}>{item.item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inspector Notes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Overall Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              style={{
                width: '100%', background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: 10, color: '#fff', fontSize: 12, resize: 'vertical',
                fontFamily: 'inherit',
              }}
              placeholder="Summarize overall condition, notable findings..."
            />
          </div>

          <button onClick={handleSubmit} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
            <CheckCircle size={16} /> Submit Inspection Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '24px 0' }}>
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Inspector Dashboard</div>
          <h2>My Inspection Tasks</h2>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <ClipboardCheck size={40} style={{ opacity: 0.2 }} />
            <h3>No assignments yet</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Awaiting inspection orders from dispatch</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map(t => {
              const car = t.car || {};
              return (
                <div key={t._id} style={{
                  background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Car size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{car.title || t._id}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 8, marginTop: 2 }}>
                          {t.location && <span><MapPin size={10} /> {t.location}</span>}
                          {car.year && <span>{car.year}</span>}
                        </div>
                      </div>
                    </div>
                    {t.status === 'assigned' && (
                      <button onClick={() => handleStart(t._id)} className="btn btn-sm"
                        style={{ background: 'var(--gold)', color: '#000', fontWeight: 800, fontSize: 10, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                        <Play size={12} style={{ marginRight: 4 }} /> Start
                      </button>
                    )}
                    {t.status === 'in_progress' && (
                      <button onClick={() => handleBeginChecklist(t)} className="btn btn-sm"
                        style={{ background: '#22c55e', color: '#000', fontWeight: 800, fontSize: 10, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                        <ClipboardCheck size={12} style={{ marginRight: 4 }} /> Continue
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                    Status: <span style={{ color: '#fff', fontWeight: 700 }}>{t.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
