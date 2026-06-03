/**
 * HifzHome — Daily task logging for the حفظ (Hifz) module.
 *
 * Students see three task cards (Dawr, Sabaq, Sabaq Para).
 * Each card expands to a form; tapping "Done" marks it ready.
 * "Submit" saves all marked tasks for today and updates the Dawr Log.
 *
 * Ustadh see a brief redirect notice — they operate via the Dawr Log.
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Star, BookOpen, Plus, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { hifzTasksApi, type DawrEntry, type TaskInput, type Quarter } from '../../api/hifzTasks';
import Spinner from '../../components/Spinner';

/* ── Constants ────────────────────────────────────────────────── */
const QUARTERS: { value: Quarter; label: string }[] = [
  { value: '1/4',  label: '¼ — First Quarter' },
  { value: '1/2',  label: '½ — First Half'    },
  { value: '3/4',  label: '¾ — Three Quarters' },
  { value: 'full', label: 'Full Juz'           },
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

/* ── Main component ──────────────────────────────────────────── */
export default function HifzHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const today = isoToday();

  // Task states
  const [dawrEntries, setDawrEntries] = useState<DawrEntry[]>([{ juz: 1, quarter: '1/4' }]);
  const [sabaqSurah,  setSabaqSurah]  = useState(1);
  const [sabaqVerse,  setSabaqVerse]  = useState('');
  const [spStart,     setSpStart]     = useState('');

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
    if (done.sabaq)      tasks.push({ taskType: 'sabaq',     sabaqSurah, sabaqVerse: sabaqVerse ? parseInt(sabaqVerse,10) : undefined });
    if (done['sabaq-para']) tasks.push({ taskType: 'sabaq_para', spStart: spStart ? parseInt(spStart,10) : undefined });
    if (tasks.length === 0) return;

    setSubmitting(true);
    try {
      await hifzTasksApi.submit(today, tasks);
      setSubmitted(true);
      toast.success(`${tasks.length} task${tasks.length > 1 ? 's' : ''} submitted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }, [done, dawrEntries, sabaqSurah, sabaqVerse, spStart, today]);

  /* ── Ustadh view ─────────────────────────────────────────────── */
  if (!isStudent) {
    return (
      <div className="min-h-screen flex flex-col pb-layout" style={{ backgroundColor: 'var(--c-bg)' }}>
        <div className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
          style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}>
          <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90" style={{ color: 'var(--c-text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>Hifz</h1>
            <p className="text-[10px] uppercase tracking-[.2em]" style={{ color: 'var(--c-text-muted)' }}>Ustadh view</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 mt-16 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--c-gold-bg)' }}>
            <Star className="w-7 h-7" style={{ color: 'var(--c-gold)' }} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--c-text)' }}>Dawr Log</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
            Open a class → tap a student → view their Dawr Log to enter scores and comments.
          </p>
        </div>
      </div>
    );
  }

  /* ── Student view ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90" style={{ color: 'var(--c-text-muted)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p lang="ar" className="font-bold text-xl leading-none" style={{ color: 'var(--c-gold)', fontFamily: "'Amiri', serif" }}>حِفْظ</p>
            <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>Daily Tasks</h1>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-text-muted)' }}>{formatGreg(today)}</p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--c-gold-bg)', color: 'var(--c-gold)' }}>
          {doneCount > 0 ? `${doneCount} ready` : 'Today'}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-layout scroll-container">
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
            arabicTitle="صَبَق" englishTitle="Sabaq — New Memorisation"
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
          </TaskCard>

          {/* ── Sabaq Para card ───────────────────────────────── */}
          <TaskCard
            arabicTitle="صَبَق پاره" englishTitle="Sabaq Para — 10-Page Review"
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
                Tasks submitted for today
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
    </div>
  );
}
