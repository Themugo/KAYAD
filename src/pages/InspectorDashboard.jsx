import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ClipboardCheck, Shield } from 'lucide-react';
import InspectorTasksView from './inspector/components/InspectorTasksView';
import InspectorChecklistView from './inspector/components/InspectorChecklistView';

const CATEGORIES = [
  'Engine', 'Transmission', 'Brakes', 'Suspension', 'Steering',
  'Electrical', 'Body & Paint', 'Interior', 'Tyres & Wheels',
  'Air Conditioning', 'Cooling System', 'Exhaust', 'Fuel System',
  'Lighting', 'Safety Equipment',
];

const ITEMS_PER_CATEGORY = 10;

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

  const handleSubmit = async () => {
    if (!activeTask) return;
    try {
      const passedCount = checklist.filter(c => c.passed === true).length;
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

  if (activeTask) {
    return (
      <InspectorChecklistView
        activeTask={activeTask} setActiveTask={setActiveTask}
        checklist={checklist} setChecklist={setChecklist}
        notes={notes} setNotes={setNotes}
        condition={condition} setCondition={setCondition}
        score={score} collapsedCats={collapsedCats}
        setCollapsedCats={setCollapsedCats}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        handleSubmit={handleSubmit} CATEGORIES={CATEGORIES}
      />
    );
  }

  const totalAssigned = tasks.filter(t => t.status === 'assigned').length;
  const totalInProgress = tasks.filter(t => t.status === 'in_progress').length;
  const totalCompleted = tasks.filter(t => t.status === 'completed').length;
  const totalPayment = tasks.filter(t => t.status === 'paid' || t.status === 'pending_payment').length;

  return (
    <InspectorTasksView
      tasks={tasks} loading={loading} tab={tab} setTab={setTab}
      totalPayment={totalPayment} totalAssigned={totalAssigned}
      totalInProgress={totalInProgress} totalCompleted={totalCompleted}
      handleStart={handleStart} handleBeginChecklist={handleBeginChecklist}
      loadTasks={loadTasks} user={user} logout={logout}
    />
  );
}
