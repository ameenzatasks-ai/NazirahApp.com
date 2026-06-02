/**
 * SaveNazirahSheet — log this week's Nazira status.
 *
 * Flow:
 *   1. Sheet opens showing the log date (default = today).
 *   2. Live preview fetches pages changed in the 7-day window for that date.
 *   3. Student sees a color breakdown of exactly what will be saved.
 *   4. Taps "Log Nazira Status" → saves → closes.
 */
import { useState, useEffect, useCallback } from 'react';
import { BookmarkPlus, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../components/BottomSheet';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { nazirahApi, type NazirahLogPreview } from '../api/nazirah';
import { PALETTE, ALL_STATUSES } from './palette';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (logDate: string) => void;
  /** Pre-select a date (passed from NazirahDatePicker via URL param). */
  initialDate?: string;
}

/* ── Date helpers ────────────────────────────────────────── */
function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

function weekRange(logDate: string): string {
  const end = new Date(logDate + 'T00:00:00');
  const start = new Date(logDate + 'T00:00:00');
  start.setDate(start.getDate() - 6);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const s = `${start.getDate()} ${months[start.getMonth()]}`;
  const e = `${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
  return `${s} – ${e}`;
}

/* ── Color swatch preview ────────────────────────────────── */
function PreviewSwatches({ colorCounts }: { colorCounts: NazirahLogPreview['colorCounts'] }) {
  const nonEmpty = ALL_STATUSES.filter(s => (colorCounts[s as keyof typeof colorCounts] ?? 0) > 0);
  if (nonEmpty.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {nonEmpty.map(s => {
        const p = PALETTE[s];
        return (
          <span
            key={s}
            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: p.fill, color: p.iconColor }}
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.accent }} />
            {p.label} · {colorCounts[s as keyof typeof colorCounts]}
          </span>
        );
      })}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function SaveNazirahSheet({ open, onClose, onSaved, initialDate }: Props) {
  const [date, setDate]               = useState<string>(initialDate ?? isoToday);
  const [preview, setPreview]         = useState<NazirahLogPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving]           = useState(false);

  const minDate = isoDaysAgo(14);
  const maxDate = isoToday();

  /* Fetch preview whenever the date changes or the sheet opens */
  const fetchPreview = useCallback(async (d: string) => {
    setLoadingPreview(true);
    setPreview(null);
    try {
      const data = await nazirahApi.previewLog(d);
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchPreview(date);
  }, [open, date, fetchPreview]);

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDate(e.target.value);
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      await nazirahApi.saveLog(date);
      toast.success(`Nazira logged for ${formatDisplay(date)}`);
      setConfirmOpen(false);
      onClose();
      onSaved?.(date);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save log');
    } finally {
      setSaving(false);
    }
  }

  const nothingToLog = !loadingPreview && preview !== null && preview.pageCount === 0;

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Log Nazira Status">
        <div className="p-5 flex flex-col gap-5">

          {/* ── Date block ─────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--c-border)' }}
          >
            {/* Date header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ backgroundColor: 'var(--c-green-dark)' }}
            >
              <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: '#00D4A0' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(0,212,160,0.7)' }}>
                  Logging for
                </p>
                <p className="text-sm font-bold" style={{ color: '#00D4A0' }}>
                  {formatDisplay(date)}
                </p>
              </div>
            </div>

            {/* Date picker */}
            <div className="px-4 py-3" style={{ backgroundColor: 'var(--c-bg-subtle)' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--c-text-faint)' }}>
                Change date
              </p>
              <input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={handleDateChange}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: 'var(--c-bg-card)',
                  color: 'var(--c-text)',
                  border: '1px solid var(--c-border-soft)',
                }}
              />
              <p className="text-[10px] mt-2" style={{ color: 'var(--c-text-faint)' }}>
                You can log up to 14 days back
              </p>
            </div>
          </div>

          {/* ── Weekly preview ──────────────────────────────── */}
          <div
            className="rounded-2xl px-4 py-4"
            style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--c-text-muted)' }}>
              Pages this week
            </p>
            <p className="text-[11px]" style={{ color: 'var(--c-text-faint)' }}>
              {weekRange(date)}
            </p>

            {loadingPreview ? (
              <div className="flex justify-center py-4">
                <Spinner size={20} color="var(--c-gold)" />
              </div>
            ) : preview === null ? (
              <p className="text-sm mt-3" style={{ color: 'var(--c-text-faint)' }}>
                Could not load preview
              </p>
            ) : preview.pageCount === 0 ? (
              <p className="text-sm font-medium mt-3" style={{ color: 'var(--c-text-muted)' }}>
                No pages tracked this week — log some pages in the Juz grid first.
              </p>
            ) : (
              <>
                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--c-text)' }}>
                  {preview.pageCount}
                  <span className="text-sm font-normal ml-1" style={{ color: 'var(--c-text-muted)' }}>pages</span>
                </p>
                <PreviewSwatches colorCounts={preview.colorCounts} />
              </>
            )}
          </div>

          {/* ── CTA ─────────────────────────────────────────── */}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!date || nothingToLog || loadingPreview}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: 'var(--c-green-dark)', color: '#FAF7F0' }}
          >
            <BookmarkPlus className="w-4 h-4" />
            Log Nazira Status
          </button>

        </div>
      </BottomSheet>

      <ConfirmModal
        open={confirmOpen}
        title="Log Nazira status?"
        message={`Save ${preview?.pageCount ?? 0} pages tracked between ${weekRange(date)} under ${formatDisplay(date)}? Any existing log for this date will be replaced.`}
        confirmLabel="Yes, log it"
        cancelLabel="Cancel"
        busy={saving}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
