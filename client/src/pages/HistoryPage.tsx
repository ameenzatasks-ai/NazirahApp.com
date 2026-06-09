/**
 * HistoryPage — History tab split into Nazira and Hifz sub-tabs.
 *
 * Nazira tab  — Nazira status logs (pages by date with colour swatches).
 * Hifz tab    — Hifz tasks by date with scores, Dawr scored quarter-by-quarter.
 *
 * Students see their own data; Ustadh are prompted to view per-student history.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Calendar, FileText,
  ChevronDown, ChevronUp, Clock, Grid3x3, Star, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { nazirahApi, type NazirahLogSummary, type NazirahLogDetail } from '../api/nazirah';
import { hifzTasksApi, type HifzTask, type TaskScore } from '../api/hifzTasks';
import { dawrApi, type DawrCell } from '../api/dawr';
import { PALETTE, ALL_STATUSES } from '../hifz/palette';
import Spinner from '../components/Spinner';

/* ── Score colors (1-7) ── */
const SCORE_COLOURS: Record<number, { bg: string; text: string; label: string }> = {
  7: { bg: '#00B050', text: '#FFF', label: 'Excellent' },
  6: { bg: '#92D050', text: '#1A3A00', label: 'Very Good' },
  5: { bg: '#00B0F0', text: '#FFF', label: 'Average' },
  4: { bg: '#FFD400', text: '#3A2E00', label: 'Below Avg' },
  3: { bg: '#FFC000', text: '#3A2E00', label: 'Fail' },
  2: { bg: '#EE0000', text: '#FFF', label: 'Bad Fail' },
  1: { bg: '#C00000', text: '#FFF', label: 'Abysmal' },
};

const TASK_DOTS: Record<string, string> = { dawr: '#FF7A1A', sabaq: '#FFD700', sabaq_para: '#00D4A0' };
const TASK_LABELS: Record<string, string> = { dawr: 'Dawr', sabaq: 'Sabaq', sabaq_para: 'Sabaq Para' };

const SURAHS: Record<number, string> = {
  1:'Al-Fatiha',2:'Al-Baqarah',3:"Ali 'Imran",4:'An-Nisa',5:"Al-Ma'idah",6:"Al-An'am",
  7:"Al-A'raf",8:'Al-Anfal',9:'At-Tawbah',10:'Yunus',11:'Hud',12:'Yusuf',13:"Ar-Ra'd",
  14:'Ibrahim',15:'Al-Hijr',16:'An-Nahl',17:'Al-Isra',18:'Al-Kahf',19:'Maryam',20:'Ta-Ha',
  21:'Al-Anbiya',22:'Al-Hajj',23:"Al-Mu'minun",24:'An-Nur',25:'Al-Furqan',26:"Ash-Shu'ara",
  27:'An-Naml',28:'Al-Qasas',29:"Al-'Ankabut",30:'Ar-Rum',31:'Luqman',32:'As-Sajdah',
  33:'Al-Ahzab',34:'Saba',35:'Fatir',36:'Ya-Sin',37:'As-Saffat',38:'Sad',39:'Az-Zumar',
  40:'Ghafir',41:'Fussilat',42:'Ash-Shura',43:'Az-Zukhruf',44:'Ad-Dukhan',45:'Al-Jathiyah',
  46:'Al-Ahqaf',47:'Muhammad',48:'Al-Fath',49:'Al-Hujurat',50:'Qaf',51:'Adh-Dhariyat',
  52:'At-Tur',53:'An-Najm',54:'Al-Qamar',55:'Ar-Rahman',56:"Al-Waqi'ah",57:'Al-Hadid',
  58:'Al-Mujadila',59:'Al-Hashr',60:'Al-Mumtahanah',61:'As-Saf',62:"Al-Jumu'ah",
  63:'Al-Munafiqun',64:'At-Taghabun',65:'At-Talaq',66:'At-Tahrim',67:'Al-Mulk',68:'Al-Qalam',
  69:'Al-Haqqah',70:"Al-Ma'arij",71:'Nuh',72:'Al-Jinn',73:'Al-Muzzammil',74:'Al-Muddaththir',
  75:'Al-Qiyamah',76:'Al-Insan',77:'Al-Mursalat',78:"An-Naba'",79:"An-Nazi'at",80:"'Abasa",
  81:'At-Takwir',82:'Al-Infitar',83:'Al-Mutaffifin',84:'Al-Inshiqaq',85:'Al-Buruj',86:'At-Tariq',
  87:"Al-A'la",88:'Al-Ghashiyah',89:'Al-Fajr',90:'Al-Balad',91:'Ash-Shams',92:'Al-Layl',
  93:'Ad-Duha',94:'Ash-Sharh',95:'At-Tin',96:"Al-'Alaq",97:'Al-Qadr',98:'Al-Bayyinah',
  99:'Az-Zalzalah',100:"Al-'Adiyat",101:"Al-Qari'ah",102:'At-Takathur',103:"Al-'Asr",
  104:'Al-Humazah',105:'Al-Fil',106:'Quraysh',107:"Al-Ma'un",108:'Al-Kawthar',109:'Al-Kafirun',
  110:'An-Nasr',111:'Al-Masad',112:'Al-Ikhlas',113:'Al-Falaq',114:'An-Nas',
};

/* ── Helpers ──────────────────────────────────────────────── */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${d} ${months[m - 1]} ${y}`;
}

function daysAgo(iso: string): string {
  const diff = Math.round(
    (Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86_400_000,
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

/* ══════════════════════════════════════════════════════════════
   NAZIRA HISTORY SUB-COMPONENTS
═══════════════════════════════════════════════════════════════ */

function ColorSwatches({ counts }: { counts: NazirahLogSummary['colorCounts'] }) {
  const nonEmpty = ALL_STATUSES.filter(s => (counts[s as keyof typeof counts] ?? 0) > 0);
  if (nonEmpty.length === 0)
    return <span className="text-[10px]" style={{ color: 'var(--c-text-faint)' }}>No pages logged</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {nonEmpty.map(s => {
        const p = PALETTE[s];
        return (
          <span
            key={s}
            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: p.fill, color: p.iconColor }}
          >
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.accent }} />
            {p.label} · {counts[s as keyof typeof counts]}
          </span>
        );
      })}
    </div>
  );
}

function InlinePreview({ detail }: { detail: NazirahLogDetail }) {
  const nonEmpty = ALL_STATUSES.filter(s => (detail.grouped[s]?.length ?? 0) > 0);
  return (
    <div className="mt-3 flex flex-col gap-2">
      {nonEmpty.map(s => {
        const p     = PALETTE[s];
        const pages = detail.grouped[s] ?? [];
        return (
          <div key={s} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${p.accent}55` }}>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: p.fill }}>
              <span className="text-xs font-bold flex-1" style={{ color: '#FFFFFF' }}>{p.label}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: p.iconBg, color: p.iconColor }}>{pages.length}</span>
            </div>
            <div className="px-3 py-2 flex flex-wrap gap-1" style={{ backgroundColor: 'var(--c-bg-subtle)' }}>
              {pages.map(pg => (
                <span key={pg} className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: p.fill + '30', color: 'var(--c-text)', border: `1px solid ${p.accent}44` }}>
                  {pg}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NaziraLogCard({
  log, onViewFull, isExpanded, onTogglePreview, detail, loadingDetail,
}: {
  log: NazirahLogSummary;
  onViewFull: () => void;
  isExpanded: boolean;
  onTogglePreview: () => void;
  detail: NazirahLogDetail | null;
  loadingDetail: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
    >
      <button
        onClick={onViewFull}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--c-gold-bg)' }}>
          <Calendar className="w-5 h-5" style={{ color: 'var(--c-gold)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>
            {formatDate(log.logDate)}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
            {log.pageCount} pages · {daysAgo(log.logDate)}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--c-text-faint)' }} />
      </button>

      <div className="px-4 pb-3 flex items-center justify-between gap-3"
        style={{ borderTop: '1px solid var(--c-border)' }}>
        <div className="flex-1 min-w-0 pt-2.5">
          <ColorSwatches counts={log.colorCounts} />
        </div>
        <button
          onClick={onTogglePreview}
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-all active:scale-95 flex-shrink-0 mt-2"
          style={{ backgroundColor: 'var(--c-bg-subtle)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border-soft)' }}
        >
          {isExpanded
            ? <><ChevronUp className="w-3 h-3" />Hide</>
            : <><ChevronDown className="w-3 h-3" />Preview</>}
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--c-border)' }}>
          {loadingDetail ? (
            <div className="flex justify-center py-4"><Spinner size={20} color="var(--c-gold)" /></div>
          ) : detail ? (
            <div className="pt-3">
              <InlinePreview detail={detail} />
              <button
                onClick={onViewFull}
                className="w-full mt-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{ backgroundColor: 'var(--c-gold)', color: '#0d0d0d' }}
              >
                View Full Detail
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HIFZ HISTORY SUB-COMPONENTS
═══════════════════════════════════════════════════════════════ */

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-[10px] font-semibold" style={{ color: 'var(--c-text-faint)' }}>--</span>;
  const col = SCORE_COLOURS[score];
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-extrabold"
      style={{ backgroundColor: col?.bg ?? 'var(--c-bg-subtle)', color: col?.text ?? 'var(--c-text)' }}
    >
      {score}
    </span>
  );
}

function taskDetail(task: HifzTask): string {
  if (task.taskType === 'sabaq' && task.sabaqSurah) {
    const name = SURAHS[task.sabaqSurah] ?? `Surah ${task.sabaqSurah}`;
    return task.sabaqVerse ? `${name}, Ayah ${task.sabaqVerse}` : name;
  }
  if (task.taskType === 'sabaq_para' && task.spStart != null) return `Starting page ${task.spStart}`;
  if (task.taskType === 'dawr' && task.dawrEntries?.length) {
    return task.dawrEntries.map(e => `Juz ${e.juz} (${e.quarter === 'full' ? 'Full' : e.quarter})`).join(', ');
  }
  return '';
}

interface GroupedDate {
  date: string;
  tasks: HifzTask[];
  score: TaskScore | null;
}

function HifzDateCard({ group, dawrCells, expanded, onToggle }: {
  group: GroupedDate;
  dawrCells: Record<string, DawrCell>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { date, tasks, score } = group;
  const taskTypes = [...new Set(tasks.map(t => t.taskType))];

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#FF7A1A1f' }}>
          <Calendar className="w-5 h-5" style={{ color: '#FF7A1A' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>{formatDate(date)}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {daysAgo(date)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mr-1">
          {taskTypes.map(t => (
            <div key={t} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TASK_DOTS[t] ?? 'var(--c-text-faint)' }} />
          ))}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--c-text-faint)' }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--c-text-faint)' }} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--c-border)' }}>
          {/* Tasks list */}
          <div className="flex flex-col gap-2.5 pt-3">
            {tasks.map(task => (
              <div key={task.id} className="rounded-xl p-3" style={{ backgroundColor: 'var(--c-bg-subtle)', border: '1px solid var(--c-border)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TASK_DOTS[task.taskType] ?? 'var(--c-text-faint)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--c-text)' }}>
                    {TASK_LABELS[task.taskType] ?? task.taskType}
                  </span>
                </div>
                <p className="text-[11px] ml-4" style={{ color: 'var(--c-text-muted)' }}>
                  {taskDetail(task)}
                </p>

                {/* Dawr: show per-quarter scores */}
                {task.taskType === 'dawr' && task.dawrEntries && task.dawrEntries.length > 0 && (
                  <div className="mt-2 ml-4 flex flex-col gap-1">
                    {task.dawrEntries.map((entry, idx) => {
                      const cell = dawrCells[`${entry.juz}:${entry.quarter}`];
                      const cycle = cell?.cycles.find(cy => cy.loggedDate === task.taskDate) ?? cell?.cycles[0];
                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-[10px]" style={{ color: 'var(--c-text-muted)' }}>
                            Juz {entry.juz} — {entry.quarter === 'full' ? 'Full' : entry.quarter}
                          </span>
                          <ScoreBadge score={cycle?.score ?? null} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Scores summary row */}
          {score && (
            <div className="mt-3 rounded-xl p-3 flex flex-wrap items-center gap-3"
              style={{ backgroundColor: 'var(--c-bg-subtle)', border: '1px solid var(--c-border)' }}>
              {score.sabaqScore != null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--c-text-muted)' }}>Sabaq</span>
                  <ScoreBadge score={score.sabaqScore} />
                </div>
              )}
              {score.spScore != null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--c-text-muted)' }}>SP</span>
                  <ScoreBadge score={score.spScore} />
                </div>
              )}
              {score.tajwidScore != null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--c-text-muted)' }}>Tajweed</span>
                  <ScoreBadge score={score.tajwidScore} />
                </div>
              )}
              {score.adabScore != null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--c-text-muted)' }}>Adab</span>
                  <ScoreBadge score={score.adabScore} />
                </div>
              )}
              {score.comment && (
                <p className="w-full text-[11px] italic mt-1" style={{ color: 'var(--c-text-muted)' }}>
                  "{score.comment}"
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN HISTORY PAGE
═══════════════════════════════════════════════════════════════ */
type SubTab = 'nazira' | 'hifz';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const [subTab, setSubTab] = useState<SubTab>('nazira');

  /* ── Nazira state ── */
  const [logs, setLogs]           = useState<NazirahLogSummary[]>([]);
  const [nazLoading, setNazLoading] = useState(true);
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, NazirahLogDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* ── Hifz state ── */
  const [hifzTasks, setHifzTasks]     = useState<HifzTask[]>([]);
  const [hifzScores, setHifzScores]   = useState<TaskScore[]>([]);
  const [dawrGrid, setDawrGrid]       = useState<DawrCell[]>([]);
  const [hifzLoading, setHifzLoading] = useState(true);
  const [hifzExpanded, setHifzExpanded] = useState<string | null>(null);

  /* ── Load Nazira ── */
  const loadNazira = useCallback(async () => {
    if (!isStudent) { setNazLoading(false); return; }
    try {
      const data = await nazirahApi.getLogs();
      setLogs(data.logs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setNazLoading(false);
    }
  }, [isStudent]);

  /* ── Load Hifz ── */
  const loadHifz = useCallback(async () => {
    if (!isStudent) { setHifzLoading(false); return; }
    try {
      // allHistory() fetches across all classes (no classId filter) so the
      // History tab shows every session regardless of which class it was for.
      const [taskData, scoreData, dawrData] = await Promise.all([
        hifzTasksApi.allHistory(),
        hifzTasksApi.allMyScores(),
        dawrApi.myGrid(),
      ]);
      setHifzTasks(taskData.tasks);
      setHifzScores(scoreData.scores);
      setDawrGrid(dawrData.grid);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load Hifz history');
    } finally {
      setHifzLoading(false);
    }
  }, [isStudent]);

  useEffect(() => { loadNazira(); }, [loadNazira]);
  useEffect(() => { loadHifz(); }, [loadHifz]);

  /* ── Nazira preview toggle ── */
  async function togglePreview(logId: number) {
    if (expandedId === logId) { setExpandedId(null); return; }
    setExpandedId(logId);
    if (detailCache[logId]) return;
    setLoadingDetail(true);
    try {
      const detail = await nazirahApi.getLog(logId);
      setDetailCache(prev => ({ ...prev, [logId]: detail }));
    } catch {
      toast.error('Failed to load preview');
      setExpandedId(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  /* ── Hifz grouped by date ── */
  const hifzByDate: GroupedDate[] = (() => {
    const dateMap = new Map<string, HifzTask[]>();
    for (const t of hifzTasks) {
      const arr = dateMap.get(t.taskDate) ?? [];
      arr.push(t);
      dateMap.set(t.taskDate, arr);
    }
    const scoreMap = new Map<string, TaskScore>();
    for (const s of hifzScores) scoreMap.set(s.taskDate, s);

    return [...dateMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, tasks]) => ({ date, tasks, score: scoreMap.get(date) ?? null }));
  })();

  /* Dawr cell lookup */
  const dawrCellMap: Record<string, DawrCell> = {};
  for (const c of dawrGrid) dawrCellMap[`${c.juz}:${c.quarter}`] = c;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--c-gold-bg)' }}>
          <Clock className="w-4 h-4" style={{ color: 'var(--c-gold)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>History</h1>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
            {subTab === 'nazira' ? 'Nazira status logs' : 'Hifz task history'}
          </p>
        </div>
      </div>

      {/* Sub-tab toggle */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--c-bg-subtle)', border: '1px solid var(--c-border)' }}>
          {([
            { key: 'nazira' as SubTab, label: 'Nazira', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { key: 'hifz' as SubTab, label: 'Hifz', icon: <Star className="w-3.5 h-3.5" /> },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all"
              style={{
                backgroundColor: subTab === t.key ? 'var(--c-green-dark)' : 'transparent',
                color: subTab === t.key ? '#FAF7F0' : 'var(--c-text-muted)',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-layout scroll-container">
        {!isStudent ? (
          /* Ustadh — no own logs */
          <div className="flex flex-col items-center gap-3 mt-16 px-6 text-center">
            <FileText className="w-10 h-10" style={{ color: 'var(--c-text-faint)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--c-text-muted)' }}>
              Student history
            </p>
            <p className="text-[13px]" style={{ color: 'var(--c-text-faint)' }}>
              Open a class, tap a student, then view their history.
            </p>
          </div>
        ) : subTab === 'nazira' ? (
          /* ── Nazira history ── */
          nazLoading ? (
            <div className="flex justify-center mt-12"><Spinner size={28} color="var(--c-gold)" /></div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 mt-16 px-6 text-center">
              <FileText className="w-10 h-10" style={{ color: 'var(--c-text-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--c-text-faint)' }}>
                No Nazira logs yet. Track your Nazirah to create your first entry.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              {logs.map(log => (
                <NaziraLogCard
                  key={log.id}
                  log={log}
                  onViewFull={() => navigate(`/history/${log.id}`)}
                  isExpanded={expandedId === log.id}
                  onTogglePreview={() => togglePreview(log.id)}
                  detail={detailCache[log.id] ?? null}
                  loadingDetail={loadingDetail && expandedId === log.id}
                />
              ))}
            </div>
          )
        ) : (
          /* ── Hifz history ── */
          hifzLoading ? (
            <div className="flex justify-center mt-12"><Spinner size={28} color="var(--c-gold)" /></div>
          ) : hifzByDate.length === 0 ? (
            <div className="flex flex-col items-center gap-3 mt-16 px-6 text-center">
              <Grid3x3 className="w-10 h-10" style={{ color: 'var(--c-text-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--c-text-faint)' }}>
                No Hifz tasks yet. Submit your first Sabaq, Sabaq Para, or Dawr.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              {hifzByDate.map(group => (
                <HifzDateCard
                  key={group.date}
                  group={group}
                  dawrCells={dawrCellMap}
                  expanded={hifzExpanded === group.date}
                  onToggle={() => setHifzExpanded(prev => prev === group.date ? null : group.date)}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
