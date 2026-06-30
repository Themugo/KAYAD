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

// 150-point inspection checklist items - 10 items per category
const CHECKLIST_ITEMS = {
  'Engine': [
    'Oil level and condition', 'Coolant level and condition', 'Engine mounts condition',
    'Timing belt/chain condition', 'Serpentine belt condition', 'Oil leaks inspection',
    'Engine noise at idle', 'Engine noise under load', 'Check engine light status',
    'Air filter condition'
  ],
  'Transmission': [
    'Transmission fluid level', 'Transmission fluid condition', 'Gear shifting smoothness',
    'Clutch operation (manual)', 'Transmission mounts', 'Drive shaft condition',
    'CV joint condition', 'Differential fluid level', 'Transmission leaks',
    'Transmission noise'
  ],
  'Brakes': [
    'Brake pad thickness front', 'Brake pad thickness rear', 'Brake disc condition front',
    'Brake disc condition rear', 'Brake fluid level', 'Brake fluid condition',
    'Brake line condition', 'ABS warning light', 'Parking brake operation',
    'Brake pedal feel'
  ],
  'Suspension': [
    'Shock absorber condition front', 'Shock absorber condition rear', 'Strut mounts condition',
    'Control arm bushings', 'Ball joint condition', 'Tie rod ends condition',
    'Sway bar links', 'Spring condition', 'Suspension noise',
    'Wheel alignment'
  ],
  'Steering': [
    'Power steering fluid level', 'Power steering fluid condition', 'Steering rack condition',
    'Steering wheel play', 'Power steering pump noise', 'Steering column condition',
    'Universal joint condition', 'Steering alignment', 'Power steering belt',
    'Steering effort'
  ],
  'Electrical': [
    'Battery condition', 'Battery terminals condition', 'Alternator output',
    'Starter motor operation', 'Lighting system operation', 'Dashboard warning lights',
    'Wiring harness condition', 'Fuse box condition', 'Ground connections',
    'ECU error codes'
  ],
  'Body & Paint': [
    'Body panel alignment', 'Paint condition overall', 'Rust inspection',
    'Dent inspection', 'Scratch inspection', 'Panel gaps',
    'Door operation', 'Hood operation', 'Trunk operation',
    'Window operation'
  ],
  'Interior': [
    'Seat condition', 'Dashboard condition', 'Upholstery condition',
    'Carpet condition', 'Headliner condition', 'Instrument cluster operation',
    'Climate control operation', 'Audio system operation', 'Seat belt condition',
    'Interior trim condition'
  ],
  'Tyres & Wheels': [
    'Tire tread depth front', 'Tire tread depth rear', 'Tire pressure',
    'Tire age', 'Wheel condition', 'Wheel bearing condition',
    'Tire wear pattern', 'Spare tire condition', 'Tire size matching',
    'Wheel alignment'
  ],
  'Air Conditioning': [
    'AC compressor operation', 'AC refrigerant level', 'AC cooling performance',
    'Heater operation', 'Blower motor operation', 'AC vents condition',
    'Cabin air filter', 'AC belt condition', 'AC leaks inspection',
    'Temperature control operation'
  ],
  'Cooling System': [
    'Radiator condition', 'Radiator cap condition', 'Coolant hoses condition',
    'Thermostat operation', 'Water pump condition', 'Cooling fan operation',
    'Heater core condition', 'Temperature gauge operation', 'Overheating history',
    'Coolant reservoir condition'
  ],
  'Exhaust': [
    'Exhaust manifold condition', 'Catalytic converter condition', 'Muffler condition',
    'Exhaust pipes condition', 'O2 sensor operation', 'Exhaust leaks',
    'Emission system', 'Tailpipe condition', 'Exhaust hangers',
    'Smoke emission'
  ],
  'Fuel System': [
    'Fuel tank condition', 'Fuel pump operation', 'Fuel filter condition',
    'Fuel injectors condition', 'Fuel lines condition', 'Fuel pressure',
    'Fuel gauge operation', 'Fuel cap condition', 'Fuel leaks',
    'Fuel smell'
  ],
  'Lighting': [
    'Headlights operation', 'Taillights operation', 'Brake lights operation',
    'Turn signals operation', 'Parking lights operation', 'Fog lights operation',
    'Interior lights operation', 'License plate lights', 'Headlight alignment',
    'Light bulb condition'
  ],
  'Safety Equipment': [
    'Airbag system operation', 'Seat belt pretensioners', 'ABS system operation',
    'Traction control operation', 'Stability control operation', 'Horn operation',
    'Wiper condition', 'Washer operation', 'Rearview mirror condition',
    'Side mirror condition'
  ],
};

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
      const items = CHECKLIST_ITEMS[cat] || [];
      for (let i = 0; i < ITEMS_PER_CATEGORY; i++) {
        const itemText = i < items.length ? items[i] : `Check ${cat.toLowerCase()} item ${i + 1}`;
        initial.push({ category: cat, item: itemText, passed: null, notes: '' });
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

      // Verify the inspection is assigned to this inspector
      if (activeTask.inspector !== user._id && activeTask.inspector?._id !== user._id) {
        toast('You are not authorized to submit this inspection', 'error');
        return;
      }

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
    } catch (error) {
      console.error('Failed to submit inspection:', error);
      toast(error?.response?.data?.message || 'Failed to submit', 'error');
    }
  };

  if (!user || user.role !== 'ghost_checker') {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}><Shield size={32} style={{ color: '#ef4444' }} /></div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.6rem', color: '#fff', marginBottom: 10 }}>Access Denied</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>This area is restricted to certified Inspectors. If you believe this is an error, contact support.</p>
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
