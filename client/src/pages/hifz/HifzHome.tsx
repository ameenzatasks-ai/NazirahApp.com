/**
 * HifzHome — The Hifz tab with 3 sub-views via segmented control.
 *
 *   Today        — Daily task logging (Dawr, Sabaq, Sabaq Para)
 *   Dawr Log     — 30 Juz x 4 quarters grid
 *   SP & Sabaq Log — Daily score table (Sabaq Para, Sabaq, Tajwid, Adab)
 *
 * Design reference: The Hifz App prototype — Hifz tab with segmented control.
 */
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RotateCcw, Star, BookOpen, Plus, X, CheckCircle2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { hifzTasksApi, type DawrEntry, type TaskInput, type Quarter, type HifzTask } from '../../api/hifzTasks';
import Spinner from '../../components/Spinner';

/* ── Constants ────────────────────────────────────────────────── */
const QUARTERS: { value: Quarter; label: string }[] = [
  { value: '1/4',  label: '1/4' },
  { value: '1/2',  label: '2/4' },
  { value: '3/4',  label: '3/4' },
  { value: 'full', label: '4/4' },
];

const SURAHS = [
  'Al-Fatiha','Al-Baqarah','Ali \'Imran','An-Nisa','Al-Ma\'idah','Al-An\'am',
  'Al-A\'raf','Al-Anfal','At-Tawbah','Yunus','Hud','Yusuf','Ar-Ra\'d','Ibrahim',
  'Al-Hijr','An-Nahl','Al-Isra','Al-Kahf','Maryam','Ta-Ha','Al-Anbiya',
  'Al-Hajj','Al-Mu\'minun','An-Nur','Al-Furqan','Ash-Shu\'ara','An-Naml',
  'Al-Qasas','Al-\'Ankabut','Ar-Rum','Luqman','As-Sajdah','Al-Ahzab','Saba',
  'Fatir','Ya-Sin','As-Saffat','Sad','Az-Zumar','Ghafir','Fussilat','Ash-Shura',
  'Az-Zukhruf','Ad-Dukhan','Al-Jathiyah','Al-Ahqaf','Muhammad','Al-Fath',
  'Al-Hujurat','Qaf','Adh-Dhariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahman',
  'Al-Waqi\'ah','Al-Hadid','Al-Mujadila','Al-Hashr','Al-Mumtahanah','As-Saf',
  'Al-Jumu\'ah','Al-Munafiqun','At-Taghabun','At-Talaq','At-Tahrim','Al-Mulk',
  'Al-Qalam','Al-Haqqah','Al-Ma\'arij','Nuh','Al-Jinn','Al-Muzzammil',
  'Al-Muddaththir','Al-Qiyamah','Al-Insan','Al-Mursalat','An-Naba','An-Nazi\'at',
  'Abasa','At-Takwir','Al-Infitar','Al-Mutaffifin','Al-Inshiqaq','Al-Buruj',
  'At-Tariq','Al-A\'la','Al-Ghashiyah','Al-Fajr','Al-Balad','Ash-Shams',
  'Al-Layl','Ad-Duha','Ash-Sharh','At-Tin','Al-\'Alaq','Al-Qadr','Al-Bayyinah',
  'Az-Zalzalah','Al-\'Adiyat','Al-Qari\'ah','At-Takathur','Al-\'Asr','Al-Humazah',
  'Al-Fil','Quraysh','Al-Ma\'un','Al-Kawthar','Al-Kafirun','An-Nasr',
  'Al-Masad','Al-Ikhlas','Al-Falaq','An-Nas',
];

/* Score colours for SP & Sabaq Log */
const SCORE_COLOURS: Record<number, { bg: string; text: string; label: string }> = {
  7: { bg: '#00B050', text: '#FFF', label: 'Excellent' },
  6: { bg: '#92D050', text: '#1A3A00', label: 'Very Good' },
  5: { bg: '#00B0F0', text: '#FFF', label: 'Average' },
  4: { bg: '#FFD400', text: '#3A2E00', label: 'Below Avg' },
  3: { bg: '#FFC000', text: '#3A2E00', label: 'Fail' },
  2: { bg: '#EE0000', text: '#FFF', label: 'Bad Fail' },
  1: { bg: '#C00000', text: '#FFF', label: 'Abysmal' },
};

/* ── Date helpers ─────────────────────────────────────────────── */
function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatGreg(iso: string) {
  const [y,m,d] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dow    = new Date(iso+'T12:00:00').getDay();
  return `${days[dow]}, ${d} ${months[m-1]} ${y}`;
}
function shortDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[m-1]}`;
}

/* ── Sub-tab type ────────────────────────────────────────────── */
type SubTab = 'today' | 'dawr' | 'sp';

/* ── Task-card component ──────────────────────────────────────── */
interface CardProps {
  arabicTitle: string;
  englishTitle: string;
  accentColor: string;
  bgColor: string;
  iconBg: string;
  icon: React.ReactNode;
  expanded: boolean;
  done: boolean;
  onToggle: () => void;
  onMarkDone: () => void;
  children: React.ReactNode;
}

function TaskCard({ arabicTitle, englishTitle, accentColor, bgColor, iconBg,
  icon, expanded, done, onToggle, onMarkDone, children }: CardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-opacity"
      style={{ background: bgColor, boxShadow: '0 3px 14px rgba(0,0,0,.22)', opacity: done ? 0.75 : 1 }}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center text-left"
        style={{ borderLeft: `5px solid ${accentColor}` }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg, border: `1.5px solid ${accentColor}` }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-amiri text-xl leading-tight" style={{ color: '#FFF', direction: 'rtl' }}>
              {arabicTitle}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,.55)' }}>
              {englishTitle}
            </p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onMarkDone(); }}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold flex-shrink-0 transition-all active:scale-90"
            style={{ background: accentColor, color: done ? '#FFF' : '#1a0a00' }}
          >
            {done ? '✓ Added' : '✓ Done'}
          </button>
        </div>
      </button>

      {/* Expand/collapse */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? 600 : 0 }}
      >
        <div
          className="px-4 py-4 flex flex-col gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,.09)' }}
        >
          {children}
        </div>
      </div>

      {/* Done indicator */}
      {done && (
        <div className="flex items-center gap-2 px-4 pb-2.5" style={{ borderTop: expanded ? '1px solid rgba(255,255,255,.09)' : undefined }}>
          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
            <CheckCircle2 className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,.75)' }} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.45)' }}>
            Added
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Field components ─────────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[.2em] mb-1" style={{ color: 'rgba(255,255,255,.45)' }}>
      {children}
    </p>
  );
}

const fieldStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,.28)', border: '1px solid rgba(255,255,255,.11)',
  borderRadius: 8, color: '#FFF', fontSize: 13, fontWeight: 500,
  padding: '8px 10px', width: '100%', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  paddingRight: 28, appearance: 'none' as const, cursor: 'pointer',
};

/* ── Score cell for SP & Sabaq Log table ─────────────────────── */
// Defined at module scope (not inside SpSabaqLog) so React can reconcile it
// across renders without unmounting every cell on each parent re-render.
function ScoreCell({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <td className="text-center py-2.5 px-1" style={{ color: 'var(--c-text-faint)', fontSize: 11 }}>
        —
      </td>
    );
  }
  const col = SCORE_COLOURS[score];
  return (
    <td className="text-center py-2.5 px-1">
      <span
        className="inline-block w-8 h-8 rounded-lg text-sm font-extrabold leading-8"
        style={{ backgroundColor: col.bg, color: col.text }}
      >
        {score}
      </span>
    </td>
  );
}

/* ── Segmented Control ────────────────────────────────────────── */
function SegmentedControl({ active, onChange }: { active: SubTab; onChange: (t: SubTab) => void }) {
  const tabs: { id: SubTab; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'dawr', label: 'Dawr Log' },
    { id: 'sp', label: 'SP & Sabaq' },
  ];
  return (
    <div
      className="flex rounded-xl p-1 gap-1"
      style={{ backgroundColor: 'var(--c-bg-subtle)', border: '1px solid var(--c-border)' }}
    >
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="flex-1 py-2 px-2 rounded-lg text-[11px] font-bold transition-all"
          style={{
            backgroundColor: active === t.id ? 'var(--c-gold)' : 'transparent',
            color: active === t.id ? '#0d0d0d' : 'var(--c-text-muted)',
            boxShadow: active === t.id ? '0 2px 8px rgba(184,134,42,.25)' : undefined,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SP & Sabaq Log Sub-view
   Daily score table matching design's spLogView():
     Date | Sabaq Para | Sabaq | Tajwid | Adab
   Colored score cells, fetches actual scores from API.
═══════════════════════════════════════════════════════════════════ */
function SpSabaqLog({ classId }: { classId?: number }) {
  const [scores, setScores] = useState<{ taskDate: string; spScore: number | null; sabaqScore: number | null; tajwidScore: number | null; adabScore: number | null }[]>([]);
  const [tasks,  setTasks]  = useState<HifzTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      hifzTasksApi.history(classId),
      hifzTasksApi.myScores(classId),
    ])
      .then(([taskRes, scoreRes]) => {
        setTasks(taskRes.tasks);
        setScores(scoreRes.scores);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) {
    return (
      <div className="flex justify-center mt-12">
        <Spinner size={28} color="var(--c-gold)" />
      </div>
    );
  }

  // Build score lookup by date
  const scoreMap: Record<string, typeof scores[0]> = {};
  for (const s of scores) scoreMap[s.taskDate] = s;

  // Build sabaq lines lookup by date
  const linesMap: Record<string, number | null> = {};
  for (const t of tasks) {
    if (t.taskType === 'sabaq' && t.sabaqLines != null) linesMap[t.taskDate] = t.sabaqLines;
  }

  // Get unique dates from tasks (sorted desc)
  const dateSet = new Set<string>();
  for (const t of tasks) dateSet.add(t.taskDate);
  const dates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex-1 overflow-auto px-4 py-4">
      {/* Description */}
      <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
        A row is added each day a session is submitted. Ustadh grades Sabaq Para, Sabaq, Tajwīd & Adab out of 7.
      </p>

      {/* Score legend */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {Object.entries(SCORE_COLOURS).sort((a,b) => Number(b[0]) - Number(a[0])).map(([s, col]) => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: col.bg }} />
            <span className="text-[9px] font-semibold" style={{ color: 'var(--c-text-muted)' }}>{s} {col.label}</span>
          </div>
        ))}
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
            No tasks submitted yet. Log your first task in the "Today" tab.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th colSpan={6} className="text-center px-3 py-2.5 text-xs font-bold"
                  style={{ color: 'var(--c-text)', backgroundColor: 'var(--c-bg-subtle)', borderBottom: '1px solid var(--c-border)' }}>
                  Daily Log
                </th>
              </tr>
              <tr style={{ backgroundColor: 'var(--c-bg-subtle)' }}>
                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)', borderBottom: '1px solid var(--c-border)' }}>
                  Date
                </th>
                <th className="text-center px-1 py-2 text-[10px] font-bold" style={{ color: '#00D4A0', borderBottom: '1px solid var(--c-border)' }}>
                  Sabaq Para
                </th>
                <th className="text-center px-1 py-2 text-[10px] font-bold" style={{ color: '#FFD700', borderBottom: '1px solid var(--c-border)' }}>
                  Sabaq
                </th>
                <th className="text-center px-1 py-2 text-[10px] font-bold" style={{ color: '#FFD700', borderBottom: '1px solid var(--c-border)', opacity: 0.65 }}>
                  Lines
                </th>
                <th className="text-center px-1 py-2 text-[10px] font-bold" style={{ color: 'var(--c-text-muted)', borderBottom: '1px solid var(--c-border)' }}>
                  Tajwīd
                </th>
                <th className="text-center px-1 py-2 text-[10px] font-bold" style={{ color: 'var(--c-text-muted)', borderBottom: '1px solid var(--c-border)' }}>
                  Adab
                </th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date, idx) => {
                const s = scoreMap[date];
                return (
                  <tr key={date} style={{ borderBottom: idx < dates.length - 1 ? '1px solid var(--c-border)' : undefined }}>
                    <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: 'var(--c-text)' }}>
                      {shortDate(date)}
                    </td>
                    <ScoreCell score={s?.spScore ?? null} />
                    <ScoreCell score={s?.sabaqScore ?? null} />
                    <td className="text-center py-2.5 px-1 text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>
                      {linesMap[date] != null ? `${linesMap[date]}` : '—'}
                    </td>
                    <ScoreCell score={s?.tajwidScore ?? null} />
                    <ScoreCell score={s?.adabScore ?? null} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dates.length > 0 && (
        <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--c-text-faint)' }}>
          Scores are entered by your Ustadh after reviewing your submission.
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Ustadh "Today" sub-view — info card + submitted-today list
═══════════════════════════════════════════════════════════════════ */
function UstadhTodayView() {
  return (
    <div className="flex-1 overflow-auto px-4 py-4">
      {/* Info card */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl mb-6"
        style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--c-gold-bg)' }}>
          <Users className="w-5 h-5" style={{ color: 'var(--c-gold)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
            Students log here — you review in the Dawr Log
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
            Open the <strong>Dawr Log</strong> tab to enter scores & comments, or jump straight to a review from your Home dashboard.
          </p>
        </div>
      </div>

      {/* Placeholder for "Submitted today" list */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--c-text-muted)' }}>
          Submitted Today
        </p>
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
            Student submissions will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Main HifzHome Component
═══════════════════════════════════════════════════════════════════ */
export default function HifzHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { classId: classIdParam } = useParams<{ classId?: string }>();
  const classId = classIdParam ? parseInt(classIdParam, 10) : undefined;
  const isStudent = user?.role === 'student';
  const today = isoToday();

  // If student accesses /hifz without classId, redirect to classes so they pick one
  useEffect(() => {
    if (isStudent && !classId) {
      navigate('/classes', { replace: true });
    }
  }, [isStudent, classId, navigate]);

  // Sub-tab state — "dawr" navigates to dawr page
  const [subTab, setSubTab] = useState<SubTab>('today');

  function handleSubTab(tab: SubTab) {
    if (tab === 'dawr') {
      navigate(classId ? `/classes/${classId}/hifz/dawr` : '/hifz/dawr');
      return;
    }
    setSubTab(tab);
  }

  // Task states (for "Today" sub-tab)
  const [dawrEntries, setDawrEntries] = useState<DawrEntry[]>([{ juz: 1, quarter: '1/4' }]);
  const [sabaqSurah,  setSabaqSurah]  = useState(1);
  const [sabaqVerse,  setSabaqVerse]  = useState('');
  const [sabaqLines,  setSabaqLines]  = useState('');
  const [spStart,     setSpStart]     = useState('');

  // Date selection — students submit the night before
  const [taskDate,      setTaskDate]      = useState(isoToday());
  const [dateConfirmed, setDateConfirmed] = useState(false);

  // UI state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [done,     setDone]     = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const markDone = (id: string) => setDone(p => ({ ...p, [id]: !p[id] }));

  const doneCount = Object.values(done).filter(Boolean).length;

  function addDawrEntry() {
    setDawrEntries(p => [...p, { juz: 1, quarter: '1/4' }]);
  }
  function removeDawrEntry(i: number) {
    setDawrEntries(p => p.filter((_, idx) => idx !== i));
  }
  function updateDawrEntry(i: number, field: keyof DawrEntry, val: string | number) {
    setDawrEntries(p => p.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  }

  const spEnd = spStart ? Math.min(parseInt(spStart, 10) + 9, 604) : null;

  const submit = useCallback(async () => {
    const tasks: TaskInput[] = [];
    if (done.dawr)       tasks.push({ taskType: 'dawr',      dawrEntries });
    if (done.sabaq)      tasks.push({ taskType: 'sabaq',     sabaqSurah, sabaqVerse: sabaqVerse ? parseInt(sabaqVerse,10) : undefined, sabaqLines: sabaqLines ? parseInt(sabaqLines,10) : undefined });
    if (done['sabaq-para']) tasks.push({ taskType: 'sabaq_para', spStart: spStart ? parseInt(spStart,10) : undefined });
    if (tasks.length === 0) return;

    setSubmitting(true);
    try {
      await hifzTasksApi.submit(taskDate, tasks, classId);
      setSubmitted(true);
      toast.success(`${tasks.length} task${tasks.length > 1 ? 's' : ''} submitted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }, [done, dawrEntries, sabaqSurah, sabaqVerse, spStart, taskDate, classId]);

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col pb-layout" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header with calligraphy */}
      <div className="px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>Hifz</h1>
          <span className="ml-auto text-[10px]" style={{ color: 'var(--c-text-muted)' }}>{formatGreg(today)}</span>
        </div>

        {/* Segmented control */}
        <SegmentedControl active={subTab} onChange={handleSubTab} />
      </div>

      {/* ─── Today sub-tab ─── */}
      {subTab === 'today' && (
        <>
          {!isStudent ? (
            <UstadhTodayView />
          ) : !dateConfirmed ? (
            /* ── Step 1: pick the date ────────────────────────── */
            <div className="flex-1 flex items-center justify-center px-4 py-8">
              <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
                <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--c-text)' }}>What date are these tasks for?</h2>
                <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
                  Tasks are usually submitted the night before.
                </p>
                <input
                  type="date"
                  value={taskDate}
                  onChange={e => setTaskDate(e.target.value)}
                  style={{ ...fieldStyle, marginBottom: 16 }}
                />
                <button
                  onClick={() => setDateConfirmed(true)}
                  disabled={!taskDate}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-98 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--c-gold)', color: '#1A1200' }}
                >
                  Continue — {taskDate ? formatGreg(taskDate) : ''}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4 scroll-container">
              {/* Date banner */}
              <div className="max-w-md mx-auto mb-3 flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                style={{ backgroundColor: 'var(--c-gold-bg)', border: '1px solid var(--c-border)' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Submitting for</span>
                <span className="font-semibold" style={{ color: 'var(--c-gold)' }}>{formatGreg(taskDate)}</span>
                <button onClick={() => setDateConfirmed(false)} className="underline text-[10px]" style={{ color: 'var(--c-text-muted)' }}>Change</button>
              </div>
              <div className="flex flex-col gap-3 max-w-md mx-auto">

                {/* ── Dawr card ─────────────────────────────────────── */}
                <TaskCard
                  arabicTitle="دَور" englishTitle="Dawr — Full Juz Revision"
                  accentColor="#FF7A1A" bgColor="#9B4800" iconBg="#BE5A00"
                  icon={<RotateCcw className="w-5 h-5" style={{ color: '#FFB87A' }} />}
                  expanded={!!expanded.dawr} done={!!done.dawr}
                  onToggle={() => toggle('dawr')} onMarkDone={() => markDone('dawr')}
                >
                  <div>
                    <FieldLabel>Juz &amp; Quarter</FieldLabel>
                    <div className="flex flex-col gap-2">
                      {dawrEntries.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <select style={selectStyle} value={entry.juz}
                              onChange={e => updateDawrEntry(i, 'juz', parseInt(e.target.value, 10))}>
                              {Array.from({ length: 30 }, (_, j) => j+1).map(j => (
                                <option key={j} value={j}>Juz {j}</option>
                              ))}
                            </select>
                            <select style={selectStyle} value={entry.quarter}
                              onChange={e => updateDawrEntry(i, 'quarter', e.target.value)}>
                              {QUARTERS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                            </select>
                          </div>
                          {dawrEntries.length > 1 && (
                            <button onClick={() => removeDawrEntry(i)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-all active:scale-90"
                              style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.55)' }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={addDawrEntry}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-98"
                      style={{ border: '1.5px dashed rgba(255,255,255,.18)', color: 'rgba(255,255,255,.55)', background: 'transparent' }}>
                      <Plus className="w-3.5 h-3.5" /> Add Another Dawr
                    </button>
                  </div>
                </TaskCard>

                {/* ── Sabaq card ────────────────────────────────────── */}
                <TaskCard
                  arabicTitle="سَبَق" englishTitle="Sabaq — New Memorisation"
                  accentColor="#FFD700" bgColor="#7A5A00" iconBg="#9A7200"
                  icon={<Star className="w-5 h-5" style={{ color: '#FFE880' }} />}
                  expanded={!!expanded.sabaq} done={!!done.sabaq}
                  onToggle={() => toggle('sabaq')} onMarkDone={() => markDone('sabaq')}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Surah</FieldLabel>
                      <select style={selectStyle} value={sabaqSurah}
                        onChange={e => setSabaqSurah(parseInt(e.target.value, 10))}>
                        {SURAHS.map((s, i) => (
                          <option key={i+1} value={i+1}>{i+1}. {s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>From Verse</FieldLabel>
                      <input type="number" min={1} max={286} placeholder="e.g. 255"
                        style={fieldStyle} value={sabaqVerse}
                        onChange={e => setSabaqVerse(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Lines</FieldLabel>
                    <input type="number" min={1} max={500} placeholder="e.g. 15"
                      style={fieldStyle} value={sabaqLines}
                      onChange={e => setSabaqLines(e.target.value)} />
                  </div>
                </TaskCard>

                {/* ── Sabaq Para card ───────────────────────────────── */}
                <TaskCard
                  arabicTitle="سَبَق باره" englishTitle="Sabaq Para — 10-Page Review"
                  accentColor="#00D4A0" bgColor="#0F6650" iconBg="#157A62"
                  icon={<BookOpen className="w-5 h-5" style={{ color: '#5DFFD8' }} />}
                  expanded={!!expanded['sabaq-para']} done={!!done['sabaq-para']}
                  onToggle={() => toggle('sabaq-para')} onMarkDone={() => markDone('sabaq-para')}
                >
                  <div>
                    <FieldLabel>Starting Page</FieldLabel>
                    <input type="number" min={1} max={595} placeholder="e.g. 45"
                      style={fieldStyle} value={spStart}
                      onChange={e => setSpStart(e.target.value)} />
                    {spEnd && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{ background: 'rgba(255,255,255,.10)', color: 'rgba(255,255,255,.85)' }}>
                        <BookOpen className="w-3 h-3" />
                        Pages {spStart} – {spEnd}
                      </div>
                    )}
                  </div>
                </TaskCard>

                {/* ── Submit ───────────────────────────────────────── */}
                <div className="pt-2 pb-6">
                  {submitted ? (
                    <div className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold"
                      style={{ backgroundColor: 'var(--c-gold)', color: '#0d0d0d' }}>
                      <CheckCircle2 className="w-4 h-4" />
                      Tasks submitted for {shortDate(taskDate)}
                    </div>
                  ) : (
                    <button
                      onClick={submit}
                      disabled={doneCount === 0 || submitting}
                      className="w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-98 disabled:opacity-35"
                      style={{ backgroundColor: 'var(--c-green-dark)', color: '#FAF7F0' }}
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <Spinner size={16} color="#FAF7F0" /> Submitting…
                        </div>
                      ) : doneCount === 0 ? 'Complete a task to submit' : `Submit ${doneCount} task${doneCount > 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* ─── SP & Sabaq Log sub-tab ─── */}
      {subTab === 'sp' && (
        <SpSabaqLog classId={classId} />
      )}
    </div>
  );
}
