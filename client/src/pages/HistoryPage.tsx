/**
 * HistoryPage — standalone Nazira log history accessible from the bottom nav.
 *
 * Students see their own logs (newest first).
 * Ustadh see a prompt to view per-student history from within a class.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Calendar, FileText,
  ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { nazirahApi, type NazirahLogSummary, type NazirahLogDetail } from '../api/nazirah';
import { PALETTE, ALL_STATUSES } from '../hifz/palette';
import Spinner from '../components/Spinner';

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

/* ── Color swatches ───────────────────────────────────────── */
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

/* ── Inline preview ───────────────────────────────────────── */
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

/* ── Log card ─────────────────────────────────────────────── */
function LogCard({
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
                View Full Detail →
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const [logs, setLogs]           = useState<NazirahLogSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, NazirahLogDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    if (!isStudent) { setLoading(false); return; }
    try {
      const data = await nazirahApi.getLogs();
      setLogs(data.logs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--c-gold-bg)' }}
        >
          <Clock className="w-4 h-4" style={{ color: 'var(--c-gold)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>History</h1>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
            Nazira status logs
          </p>
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
              Open a class, tap a student, then view their Nazira logs.
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center mt-12">
            <Spinner size={28} color="var(--c-gold)" />
          </div>
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
              <LogCard
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
        )}
      </div>
    </div>
  );
}
