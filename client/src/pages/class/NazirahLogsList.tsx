/**
 * NazirahLogsList — list of Nazira status logs.
 *
 * Each card shows:
 *   • Date + days-ago label
 *   • Color-swatch bar (counts per status, from list response)
 *   • "Preview" button → expands inline to show page numbers per color
 *   • Tapping the card title area navigates to the full detail page
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { nazirahApi, type NazirahLogSummary, type NazirahLogDetail } from '../../api/nazirah';
import { PALETTE, ALL_STATUSES } from '../../hifz/palette';
import Spinner from '../../components/Spinner';

/* ── Helpers ─────────────────────────────────────────────── */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${d} ${months[m - 1]} ${y}`;
}

function daysAgo(iso: string): string {
  const then = new Date(iso + 'T00:00:00');
  const diff = Math.round((Date.now() - then.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

/* ── Color swatch strip ──────────────────────────────────── */
function ColorSwatches({ counts }: { counts: NazirahLogSummary['colorCounts'] }) {
  const nonEmpty = ALL_STATUSES.filter(s => (counts[s as keyof typeof counts] ?? 0) > 0);
  if (nonEmpty.length === 0) return <span className="text-[10px]" style={{ color: 'var(--c-text-faint)' }}>No pages logged</span>;
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
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: p.accent }}
            />
            {p.label} · {counts[s as keyof typeof counts]}
          </span>
        );
      })}
    </div>
  );
}

/* ── Inline preview (fetched on demand) ──────────────────── */
function InlinePreview({ detail }: { detail: NazirahLogDetail }) {
  const nonEmpty = ALL_STATUSES.filter(s => (detail.grouped[s]?.length ?? 0) > 0);
  return (
    <div className="mt-3 flex flex-col gap-2">
      {nonEmpty.map(s => {
        const p = PALETTE[s];
        const pages = detail.grouped[s] ?? [];
        return (
          <div key={s} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${p.accent}55` }}>
            {/* color header */}
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: p.fill }}>
              <span className="text-xs font-bold flex-1" style={{ color: '#FFFFFF' }}>{p.label}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: p.iconBg, color: p.iconColor }}>
                {pages.length}
              </span>
            </div>
            {/* page chips */}
            <div className="px-3 py-2 flex flex-wrap gap-1" style={{ backgroundColor: 'var(--c-bg-subtle)' }}>
              {pages.map(pg => (
                <span
                  key={pg}
                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: p.fill + '30', color: 'var(--c-text)', border: `1px solid ${p.accent}44` }}
                >
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

/* ── Log card ────────────────────────────────────────────── */
function LogCard({
  log,
  onViewFull,
  isExpanded,
  onTogglePreview,
  detail,
  loadingDetail,
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
      {/* ── Top row: tap to go to full detail ── */}
      <button
        onClick={onViewFull}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all active:scale-[0.98]"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--c-gold-bg)' }}
        >
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

      {/* ── Color swatch summary ── */}
      <div
        className="px-4 pb-3 flex items-center justify-between gap-3"
        style={{ borderTop: '1px solid var(--c-border)' }}
      >
        <div className="flex-1 min-w-0 pt-2.5">
          <ColorSwatches counts={log.colorCounts} />
        </div>
        {/* Preview toggle */}
        <button
          onClick={onTogglePreview}
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-all active:scale-95 flex-shrink-0 mt-2"
          style={{ backgroundColor: 'var(--c-bg-subtle)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border-soft)' }}
        >
          {isExpanded ? (
            <><ChevronUp className="w-3 h-3" />Hide</>
          ) : (
            <><ChevronDown className="w-3 h-3" />Preview</>
          )}
        </button>
      </div>

      {/* ── Expanded inline preview ── */}
      {isExpanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--c-border)' }}>
          {loadingDetail ? (
            <div className="flex justify-center py-4">
              <Spinner size={20} color="var(--c-gold)" />
            </div>
          ) : detail ? (
            <div className="pt-3">
              <InlinePreview detail={detail} />
              <button
                onClick={onViewFull}
                className="w-full mt-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{ backgroundColor: 'var(--c-gold)', color: '#0d0d0d' }}
              >
                View Full Detail →
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function NazirahLogsList() {
  const { classId, studentId } = useParams<{ classId: string; studentId?: string }>();
  const navigate = useNavigate();
  const sId = studentId ? Number(studentId) : undefined;

  const [logs, setLogs] = useState<NazirahLogSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded preview state
  const [expandedId, setExpandedId]  = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, NazirahLogDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = sId !== undefined
        ? await nazirahApi.getStudentLogs(sId)
        : await nazirahApi.getLogs();
      setLogs(data.logs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [sId]);

  useEffect(() => { load(); }, [load]);

  async function togglePreview(logId: number) {
    if (expandedId === logId) { setExpandedId(null); return; }
    setExpandedId(logId);
    if (detailCache[logId]) return; // already fetched
    setLoadingDetail(true);
    try {
      const detail = sId !== undefined
        ? await nazirahApi.getStudentLog(logId, sId)
        : await nazirahApi.getLog(logId);
      setDetailCache(prev => ({ ...prev, [logId]: detail }));
    } catch {
      toast.error('Failed to load preview');
      setExpandedId(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  function openLog(logId: number) {
    if (sId !== undefined) {
      navigate(`/classes/${classId}/student/${sId}/nazirah-logs/${logId}`);
    } else {
      navigate(`/classes/${classId}/nazirah-logs/${logId}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
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
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>Nazira History</h1>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
            {sId !== undefined ? 'Student status logs' : 'My status logs'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-layout scroll-container">
        {loading ? (
          <div className="flex justify-center mt-12">
            <Spinner size={28} color="var(--c-gold)" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mt-16 px-6 text-center">
            <FileText className="w-10 h-10" style={{ color: 'var(--c-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--c-text-faint)' }}>
              No Nazira logs yet.
              {sId === undefined && ' Tap "Save" in the Juz grid to log your first status.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            {logs.map(log => (
              <LogCard
                key={log.id}
                log={log}
                onViewFull={() => openLog(log.id)}
                isExpanded={expandedId === log.id}
                onTogglePreview={() => togglePreview(log.id)}
                detail={detailCache[log.id] ?? null}
                loadingDetail={loadingDetail && expandedId === log.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
