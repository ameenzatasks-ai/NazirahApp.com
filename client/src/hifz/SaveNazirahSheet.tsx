/**
 * SaveNazirahSheet — bottom sheet for saving a weekly Nazira status log.
 *
 * Flow:
 *   1. Student picks a date (default = today, min = 14 days ago).
 *   2. Taps "Log Nazira Status" → confirms with modal.
 *   3. On confirm → calls API → success toast → closes.
 */
import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../components/BottomSheet';
import ConfirmModal from '../components/ConfirmModal';
import { nazirahApi } from '../api/nazirah';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save so the parent can refresh logs if needed. */
  onSaved?: (logDate: string) => void;
}

/** ISO date string for today (local timezone). */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ISO date string for N days ago. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Human-readable date display (e.g. "20 May 2026"). */
function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

export default function SaveNazirahSheet({ open, onClose, onSaved }: Props) {
  const [date, setDate] = useState<string>(today);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const minDate = daysAgo(14);
  const maxDate = today();

  async function handleConfirm() {
    setSaving(true);
    try {
      await nazirahApi.saveLog(date);
      toast.success(`Nazira status logged for ${formatDisplay(date)}`);
      setConfirmOpen(false);
      onClose();
      onSaved?.(date);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save log');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Log Nazira Status">
        <div className="p-5 flex flex-col gap-5">
          {/* Explainer */}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
            This will save a snapshot of your current page statuses for the chosen date.
            You can log up to <strong style={{ color: 'var(--c-text)' }}>14 days back</strong> and
            re-log any date to overwrite it.
          </p>

          {/* Date picker */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[10px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: 'var(--c-text-muted)' }}
            >
              Date
            </label>
            <input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--c-bg-subtle)',
                color: 'var(--c-text)',
                border: '1px solid var(--c-border-soft)',
              }}
            />
          </div>

          {/* CTA */}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!date}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: 'var(--c-green-dark)', color: '#FAF7F0' }}
          >
            <BookmarkPlus className="w-4 h-4" />
            Log Nazira Status
          </button>
        </div>
      </BottomSheet>

      {/* Confirmation modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Log Nazira status?"
        message={`Are you sure you want to log this week's Nazira status for ${formatDisplay(date)}? If a log already exists for this date it will be replaced.`}
        confirmLabel="Yes, log it"
        cancelLabel="Cancel"
        busy={saving}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
