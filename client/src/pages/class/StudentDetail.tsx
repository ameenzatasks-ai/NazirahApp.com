/**
 * StudentDetail — Ustadh's view of one student.
 *
 * Two tabs:
 *   • Overview  — current page statuses grouped by color + "See previous" button
 *   • Grid      — editable JuzGrid (Ustadh can set pages on behalf of student)
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, TableProperties, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { hifzApi, type StatusPage } from '../../api/hifz';
import { classesApi } from '../../api/classes';
import type { PageStatus } from '../../../../shared/juz-map';
import GroupedPages from '../../hifz/GroupedPages';
import JuzGrid from '../../hifz/JuzGrid';
import Spinner from '../../components/Spinner';

interface StudentInfo { id: number; name: string; avatar_url: string | null }
type Tab = 'overview' | 'grid';

function StudentAvatar({ student }: { student: { name: string; avatar_url: string | null } }) {
  if (student.avatar_url) {
    return (
      <img
        src={student.avatar_url}
        alt={student.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{ backgroundColor: 'var(--c-green-dark)', color: 'var(--c-gold)' }}
    >
      {student.name[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

/** Group a flat pages array by status. */
function groupPages(pages: StatusPage[]): Record<PageStatus, number[]> {
  const out: Record<PageStatus, number[]> = {
    GOLD: [], GREEN: [], AMBER: [], RED: [], BLACK: [], YELLOW: [],
  };
  for (const p of pages) out[p.status].push(p.pageNumber);
  return out;
}

export default function StudentDetail() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  const navigate = useNavigate();
  const cId = Number(classId);
  const sId = Number(studentId);

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [pages, setPages] = useState<StatusPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  const load = useCallback(async () => {
    try {
      // Load student info + all current pages in parallel
      const [pagesRes, infoRes] = await Promise.all([
        hifzApi.studentAllPages(sId),
        classesApi.getStudentPages(cId, sId),
      ]);
      setPages(pagesRes.pages);
      setStudent(infoRes.student as StudentInfo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load student');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [cId, sId, navigate]);

  useEffect(() => { load(); }, [load]);

  const grouped = groupPages(pages);
  const totalTracked = pages.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--c-bg)' }}>
        <Spinner size={32} color="var(--c-gold)" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {student && <StudentAvatar student={student} />}

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base truncate" style={{ color: 'var(--c-text)' }}>
            {student?.name ?? 'Student'}
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
            Nazirah tracking
          </p>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div
        className="flex border-b flex-shrink-0"
        style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-bg-nav)' }}
      >
        {([
          { key: 'overview', label: 'Overview', Icon: TableProperties },
          { key: 'grid',     label: 'Juz Grid', Icon: LayoutGrid },
        ] as { key: Tab; label: string; Icon: typeof ArrowLeft }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors"
            style={{
              color: tab === key ? 'var(--c-gold)' : 'var(--c-text-muted)',
              borderBottom: tab === key ? '2px solid var(--c-gold)' : '2px solid transparent',
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {tab === 'overview' ? (
          <div className="h-full overflow-y-auto px-4 py-4 pb-layout scroll-container">
            <GroupedPages grouped={grouped} totalTracked={totalTracked} />

            {/* See previous logs */}
            <button
              onClick={() => navigate(`/classes/${cId}/student/${sId}/nazirah-logs`)}
              className="mt-4 w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
            >
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>
                  See previous Nazira statuses
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
                  View saved weekly snapshots
                </p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--c-text-faint)' }} />
            </button>
          </div>
        ) : (
          /* Grid tab — Ustadh edits student's pages */
          <JuzGrid studentId={sId} />
        )}
      </div>
    </div>
  );
}
