/**
 * AuditTimeline — the "Bank Statement" view (TSD §4.3).
 *
 * Reverse-chronological list of every quarter-status transition for one student.
 * Each row shows: timestamp, page+quarter, from→to color chips, actor name.
 * Cursor-paginated by status_history.id (DESC).
 */
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { hifzApi, type AuditEntry } from '../api/hifz';
import { PALETTE } from './palette';
import type { PageStatus } from '../../../shared/juz-map';
import Spinner from '../components/Spinner';

interface Props {
  /** If provided, viewing this student as an Ustadh; otherwise viewing self. */
  studentId?: number;
  /** Optional title override (e.g. student name). */
  title?: string;
}

function StatusChip({ status, dim = false }: { status: PageStatus | null; dim?: boolean }) {
  if (status === null) {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
        style={{
          background: 'var(--c-bg-subtle)',
          color: 'var(--c-text-muted)',
          opacity: dim ? 0.6 : 1,
          border: '1px solid var(--c-border-soft)',
        }}
      >
        Untouched
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{
        background: PALETTE[status].fill,
        color: PALETTE[status].text,
        opacity: dim ? 0.6 : 1,
        border: status === 'BLACK' ? '1px solid var(--c-border-soft)' : 'none',
      }}
    >
      {PALETTE[status].label}
    </span>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AuditTimeline({ studentId, title }: Props) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 50;

  const fetchPage = useCallback(async (before?: number) => {
    const res = studentId !== undefined
      ? await hifzApi.studentAudit(studentId, PAGE_SIZE, before)
      : await hifzApi.audit(PAGE_SIZE, before);
    return res.entries;
  }, [studentId]);

  useEffect(() => {
    let mounted = true;
    fetchPage()
      .then(rows => {
        if (!mounted) return;
        setEntries(rows);
        setHasMore(rows.length === PAGE_SIZE);
      })
      .catch(err => toast.error(err instanceof Error ? err.message : 'Failed to load audit'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [fetchPage]);

  async function loadMore() {
    if (!entries.length || loadingMore) return;
    setLoadingMore(true);
    try {
      const last = entries[entries.length - 1];
      const more = await fetchPage(last.id);
      setEntries(prev => [...prev, ...more]);
      setHasMore(more.length === PAGE_SIZE);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="min-h-screen pb-layout" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b sticky top-0 z-10"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base truncate" style={{ color: 'var(--c-text)' }}>
            {title ?? 'Audit log'}
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
            Bank statement
          </p>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {loading ? (
          <div className="flex justify-center mt-12"><Spinner size={28} color="var(--c-gold)" /></div>
        ) : entries.length === 0 ? (
          <p className="text-center text-sm mt-12" style={{ color: 'var(--c-text-faint)' }}>
            No status changes recorded yet.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {entries.map(e => (
                <li
                  key={e.id}
                  className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
                >
                  {/* Row 1: page + transition */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold" style={{ color: 'var(--c-text)' }}>
                      Page {e.pageNumber}
                    </span>
                    <StatusChip status={e.fromStatus} dim />
                    <ArrowRight className="w-3 h-3" style={{ color: 'var(--c-text-faint)' }} />
                    <StatusChip status={e.toStatus} />
                  </div>

                  {/* Row 2: actor + timestamp */}
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--c-text-muted)' }}>
                    <UserIcon className="w-3 h-3" />
                    <span>{e.changedByName}</span>
                    {e.changedByRole === 'ustadh' && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                        style={{ background: 'var(--c-gold-bg)', color: 'var(--c-gold)' }}
                      >
                        Ustadh
                      </span>
                    )}
                    <span className="ml-auto">{formatTimestamp(e.changedAt)}</span>
                  </div>

                  {e.note && (
                    <p className="text-[11px] italic mt-1" style={{ color: 'var(--c-text-muted)' }}>
                      "{e.note}"
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full mt-3 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: 'var(--c-bg-subtle)', color: 'var(--c-text-muted)' }}
              >
                {loadingMore ? <Spinner size={14} color="var(--c-text-muted)" /> : 'Load older entries'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
