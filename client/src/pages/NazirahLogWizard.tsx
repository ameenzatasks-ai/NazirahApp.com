/**
 * NazirahLogWizard — two-step flow for saving a Nazira log.
 *
 * Step 1: Student picks the log date.
 * Step 2: Student selects which pages to include from their current statuses.
 *         Save button (always visible in header) saves only the selected pages.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, BookmarkPlus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { hifzApi, type StatusPage } from '../api/hifz';
import { nazirahApi } from '../api/nazirah';
import { PALETTE } from '../hifz/palette';
import Spinner from '../components/Spinner';
import type { PageStatus } from '../../../shared/juz-map';

/* ── Date helpers ─────────────────────────────────────────── */
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
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${d} ${months[m - 1]} ${y}`;
}

/* ── Selectable page tile ─────────────────────────────────── */
function SelectablePageTile({
  page, selected, onToggle,
}: {
  page: StatusPage;
  selected: boolean;
  onToggle: () => void;
}) {
  const p = PALETTE[page.status as PageStatus];
  return (
    <button
      onClick={onToggle}
      className="relative aspect-square rounded-md text-sm font-bold transition-all active:scale-90 flex items-center justify-center"
      style={{
        background: p.fill,
        color: p.text,
        outline: selected ? '2.5px solid var(--c-gold)' : 'none',
        outlineOffset: 1,
      }}
      aria-label={`Page ${page.pageNumber} ${p.label}${selected ? ' selected' : ''}`}
    >
      {page.pageNumber}
      {selected && (
        <span
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--c-gold)' }}
        >
          <Check className="w-2.5 h-2.5" style={{ color: '#0d0d0d' }} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function NazirahLogWizard() {
  const navigate = useNavigate();

  const [step, setStep]     = useState<1 | 2>(1);
  const [date, setDate]     = useState(isoToday);
  const [pages, setPages]   = useState<StatusPage[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loadingPages, setLoadingPages] = useState(false);
  const [saving, setSaving] = useState(false);

  const minDate = isoDaysAgo(14);
  const maxDate = isoToday();

  /* Load all pages with a status when entering step 2 */
  const loadPages = useCallback(async () => {
    setLoadingPages(true);
    try {
      const { pages: p } = await hifzApi.allPages();
      setPages(p);
      setSelected(new Set(p.map(pg => pg.pageNumber))); // start with all selected
    } catch {
      toast.error('Failed to load pages');
    } finally {
      setLoadingPages(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2) loadPages();
  }, [step, loadPages]);

  function togglePage(n: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  }

  async function save() {
    if (selected.size === 0) { toast.error('Select at least one page'); return; }
    setSaving(true);
    try {
      const sorted = Array.from(selected).sort((a, b) => a - b);
      await nazirahApi.saveLog(date, sorted);
      toast.success(`${selected.size} pages logged for ${formatDisplay(date)}`);
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  /* ── Step 1: Date ─────────────────────────────────────────── */
  if (step === 1) {
    return (
      <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
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
            <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>
              Log Nazira Status
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
              Step 1 of 2 — Choose a date
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col px-5 py-6 max-w-md mx-auto w-full">
          {/* Date card */}
          <div
            className="rounded-2xl overflow-hidden mb-6"
            style={{ border: '1px solid var(--c-border)' }}
          >
            <div
              className="flex items-center gap-3 px-4 py-4"
              style={{ backgroundColor: 'var(--c-green-dark)' }}
            >
              <CalendarDays className="w-5 h-5 flex-shrink-0" style={{ color: '#00D4A0' }} />
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(0,212,160,0.7)' }}>
                  Logging for
                </p>
                <p className="text-base font-bold mt-0.5" style={{ color: '#00D4A0' }}>
                  {formatDisplay(date)}
                </p>
              </div>
            </div>

            <div className="px-4 py-4" style={{ backgroundColor: 'var(--c-bg-subtle)' }}>
              <p className="text-[10px] uppercase tracking-[0.15em] mb-2 font-semibold" style={{ color: 'var(--c-text-faint)' }}>
                Change date
              </p>
              <input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: 'var(--c-bg-card)',
                  color: 'var(--c-text)',
                  border: '1px solid var(--c-border-soft)',
                }}
              />
              <p className="text-[11px] mt-2" style={{ color: 'var(--c-text-faint)' }}>
                You can log up to 14 days back
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{ backgroundColor: 'var(--c-green-dark)', color: '#FAF7F0' }}
          >
            Next — Select pages →
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 2: Page selection ──────────────────────────────── */
  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header with always-visible Save */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <button
          onClick={() => setStep(1)}
          className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>
            Select pages
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
            {formatDisplay(date)}
          </p>
        </div>

        {/* Always-visible Save button */}
        <button
          onClick={save}
          disabled={saving || selected.size === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: 'var(--c-green-dark)', color: '#FAF7F0' }}
        >
          {saving
            ? <Spinner size={14} color="#FAF7F0" />
            : <><BookmarkPlus className="w-3.5 h-3.5" />Save{selected.size > 0 ? ` (${selected.size})` : ''}</>
          }
        </button>
      </div>

      {/* Controls bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-bg-subtle)' }}
      >
        <button
          onClick={() => setSelected(new Set(pages.map(p => p.pageNumber)))}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95"
          style={{ backgroundColor: 'var(--c-bg-card)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border-soft)' }}
        >
          Select all
        </button>
        <button
          onClick={() => setSelected(new Set())}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95"
          style={{ backgroundColor: 'var(--c-bg-card)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border-soft)' }}
        >
          Clear
        </button>
        <span className="text-[11px] ml-auto" style={{ color: 'var(--c-text-faint)' }}>
          {selected.size} of {pages.length} selected
        </span>
      </div>

      {/* Page grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scroll-container">
        {loadingPages ? (
          <div className="flex justify-center mt-12">
            <Spinner size={28} color="var(--c-gold)" />
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mt-16 px-6 text-center">
            <p className="text-sm" style={{ color: 'var(--c-text-faint)' }}>
              No pages tracked yet. Tap a page in the Juz grid and set its colour first.
            </p>
          </div>
        ) : (
          <div
            className="grid gap-2 max-w-2xl mx-auto"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))' }}
          >
            {pages.map(page => (
              <SelectablePageTile
                key={page.pageNumber}
                page={page}
                selected={selected.has(page.pageNumber)}
                onToggle={() => togglePage(page.pageNumber)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
