/**
 * JuzGrid — one tile per page, solid color.
 *
 *   • Dropdown selector for Juz (1..30) at the top.
 *   • Below: a clean grid of square tiles, one per page in that Juz.
 *   • Untouched pages = empty/white tile with just the page number.
 *   • Tap a tile → opens the PageEditor pop-up to set its colour.
 *   • The grid is responsive: 5 columns on phone, 8 on tablet, 10 on desktop.
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { History, BookmarkPlus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfetti } from '../components/Confetti';
import { hifzApi, type JuzGridData, type JuzGridPage } from '../api/hifz';
import type { PageStatus } from '../../../shared/juz-map';
import { juzForPage } from '../../../shared/juz-map';
import { PALETTE } from './palette';
import PageEditor from './PageEditor';
import Spinner from '../components/Spinner';

interface Props {
  /** If set, viewing this student as an Ustadh; otherwise viewing self. */
  studentId?: number;
  /** Initial Juz (defaults to last accessed or 1). */
  initialJuz?: number;
  onOpenAudit?: () => void;
  /** Called when student taps the Save (Nazira log) button. */
  onSaveNazira?: () => void;
  readOnly?: boolean;
}

/** Opening words of each Juz in Arabic script. */
const JUZ_ARABIC: Record<number, string> = {
  1:  'الم',
  2:  'سيقول',
  3:  'تلك الرسل',
  4:  'لن تنالوا',
  5:  'والمحصنات',
  6:  'لا يحب الله',
  7:  'وإذا سمعوا',
  8:  'ولو أننا',
  9:  'قال الملأ',
  10: 'واعلموا',
  11: 'يعتذرون',
  12: 'وما من دابة',
  13: 'وما أبرئ',
  14: 'ربما',
  15: 'سبحان الذي',
  16: 'قال ألم',
  17: 'اقتربت',
  18: 'قد أفلح',
  19: 'وقال الذين',
  20: 'أمن خلق',
  21: 'اتل ما أوحي',
  22: 'ومن يقنت',
  23: 'ومالي',
  24: 'فمن أظلم',
  25: 'إليه يرد',
  26: 'حم',
  27: 'قال فما خطبكم',
  28: 'قد سمع الله',
  29: 'تبارك الذي',
  30: 'عم',
};

/** Solid-color page tile. Untouched = white card with just the number. */
function PageTile({ page, onTap, highlighted }: { page: JuzGridPage; onTap: () => void; highlighted?: boolean }) {
  const status = page.status;
  const untouched = status === null;
  const entry = status ? PALETTE[status] : null;

  return (
    <button
      id={`page-${page.pageNumber}`}
      onClick={onTap}
      className="aspect-square rounded-md text-sm font-bold transition-all active:scale-90 flex items-center justify-center"
      style={{
        background: entry ? entry.fill : 'var(--c-bg-card)',
        color: entry ? entry.text : 'var(--c-text)',
        border: highlighted
          ? '2px solid var(--c-gold)'
          : untouched
            ? '1px solid var(--c-border-soft)'
            : status === 'BLACK'
              ? '1px solid var(--c-border-soft)'
              : 'none',
        boxShadow: highlighted
          ? '0 0 0 3px rgba(255,215,0,0.35)'
          : status === 'GOLD'
            ? '0 0 0 1.5px #FFD700 inset, 0 1px 3px rgba(255,215,0,0.25)'
            : undefined,
      }}
      aria-label={`Page ${page.pageNumber}${entry ? `, ${entry.label}` : ', untouched'}`}
    >
      {page.pageNumber}
    </button>
  );
}

export default function JuzGrid({ studentId, initialJuz, onOpenAudit, onSaveNazira, readOnly = false }: Props) {
  const { burst } = useConfetti();
  const [juzNumber, setJuzNumber] = useState<number>(() => {
    if (initialJuz) return initialJuz;
    try {
      const saved = localStorage.getItem('nazirah-last-juz');
      return saved ? Math.min(30, Math.max(1, parseInt(saved, 10))) : 1;
    } catch { return 1; }
  });
  const [grid, setGrid] = useState<JuzGridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorPage, setEditorPage] = useState<JuzGridPage | null>(null);

  // ── Page finder ────────────────────────────────────────────
  const [finderInput, setFinderInput] = useState('');
  const [targetPage,  setTargetPage]  = useState<number | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = studentId !== undefined
        ? await hifzApi.getStudentJuz(juzNumber, studentId)
        : await hifzApi.getJuz(juzNumber);
      setGrid(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load Juz');
    } finally {
      setLoading(false);
    }
  }, [juzNumber, studentId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try { localStorage.setItem('nazirah-last-juz', String(juzNumber)); } catch {}
  }, [juzNumber]);

  // After grid loads, scroll to the targeted page (if any) and flash it
  useEffect(() => {
    if (loading || !targetPage) return;
    const el = document.getElementById(`page-${targetPage}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlighted(targetPage);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlighted(null), 2000);
    }
    setTargetPage(null);
  }, [loading, targetPage]);

  function jumpToPage() {
    const n = parseInt(finderInput.trim(), 10);
    if (isNaN(n) || n < 1 || n > 604) {
      toast.error('Enter a page number between 1 and 604');
      return;
    }
    const juz = juzForPage(n);
    if (!juz) { toast.error('Page not found'); return; }
    setFinderInput('');
    setTargetPage(n);
    if (juz.juz === juzNumber) {
      // Already on the right Juz — scroll immediately after short delay for render
      setTimeout(() => {
        const el = document.getElementById(`page-${n}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlighted(n);
          if (highlightTimer.current) clearTimeout(highlightTimer.current);
          highlightTimer.current = setTimeout(() => setHighlighted(null), 2000);
        }
        setTargetPage(null);
      }, 80);
    } else {
      setJuzNumber(juz.juz); // triggers load → scroll effect above fires
    }
  }

  /* ── Patch helpers ─────────────────────────────────────── */
  function patchPage(pageNumber: number, status: PageStatus | null) {
    setGrid(prev => prev ? {
      ...prev,
      pages: prev.pages.map(p => p.pageNumber === pageNumber ? { ...p, status } : p),
    } : prev);
    setEditorPage(prev => prev && prev.pageNumber === pageNumber ? { ...prev, status } : prev);
  }

  async function handleSetStatus(status: PageStatus) {
    if (!editorPage || readOnly) return;
    const previous = editorPage.status;
    patchPage(editorPage.pageNumber, status);
    try {
      if (studentId !== undefined) {
        await hifzApi.setStudentPage(editorPage.pageNumber, studentId, status);
      } else {
        await hifzApi.setPage(editorPage.pageNumber, status);
      }
      if (status === 'GOLD') {
        toast.success(`Page ${editorPage.pageNumber} memorized — Mashallah`);
      }
    } catch (err) {
      patchPage(editorPage.pageNumber, previous);
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function handleUntouch() {
    if (!editorPage || readOnly) return;
    const previous = editorPage.status;
    if (previous === null) return;
    patchPage(editorPage.pageNumber, null);
    try {
      if (studentId !== undefined) {
        await hifzApi.untouchStudentPage(editorPage.pageNumber, studentId);
      } else {
        await hifzApi.untouchPage(editorPage.pageNumber);
      }
    } catch (err) {
      patchPage(editorPage.pageNumber, previous);
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  /* ── Per-Juz colour counts (for the strip above the grid) ── */
  const summary = useMemo(() => {
    if (!grid) return null;
    const counts: Record<PageStatus | 'UNTOUCHED', number> = {
      BLACK: 0, RED: 0, AMBER: 0, YELLOW: 0, GREEN: 0, GOLD: 0, UNTOUCHED: 0,
    };
    for (const p of grid.pages) {
      if (p.status === null) counts.UNTOUCHED++;
      else counts[p.status]++;
    }
    return counts;
  }, [grid]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Juz dropdown selector ─────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--c-border)' }}
      >
        <label className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
          Juz
        </label>
        <select
          value={juzNumber}
          onChange={e => setJuzNumber(parseInt(e.target.value, 10))}
          className="flex-1 bg-transparent font-semibold text-sm outline-none cursor-pointer rounded-lg px-2 py-1.5"
          style={{
            color: 'var(--c-text)',
            border: '1px solid var(--c-border-soft)',
            backgroundColor: 'var(--c-bg-card)',
          }}
        >
          {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
            <option key={j} value={j} dir="rtl">جزء {j} — {JUZ_ARABIC[j]}</option>
          ))}
        </select>

        {onOpenAudit && (
          <button
            onClick={onOpenAudit}
            className="p-1.5 rounded-lg transition-all active:scale-90"
            style={{ color: 'var(--c-gold)' }}
            aria-label="Audit log"
          >
            <History className="w-5 h-5" />
          </button>
        )}

        {/* Save Nazira log — only for student's own view */}
        {onSaveNazira && !readOnly && studentId === undefined && (
          <button
            onClick={onSaveNazira}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{ backgroundColor: 'var(--c-gold-bg)', color: 'var(--c-gold)' }}
            aria-label="Save Nazira status"
          >
            <BookmarkPlus className="w-4 h-4" />
            Save
          </button>
        )}
      </div>

      {/* ── Page finder ───────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: 'var(--c-border)' }}
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--c-text-faint)' }} />
        <input
          type="number"
          min={1}
          max={604}
          placeholder="Go to page… (1–604)"
          value={finderInput}
          onChange={e => setFinderInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && jumpToPage()}
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: 'var(--c-text)', minWidth: 0 }}
        />
        {finderInput.trim() !== '' && (
          <button
            onClick={jumpToPage}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all active:scale-95 flex-shrink-0"
            style={{ backgroundColor: 'var(--c-gold-bg)', color: 'var(--c-gold)' }}
          >
            Go
          </button>
        )}
      </div>

      {/* ── Summary strip ─────────────────────────────────── */}
      {summary && grid && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-[10px] flex-wrap border-b"
          style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}
        >
          {(['GOLD', 'GREEN', 'AMBER', 'RED', 'BLACK', 'YELLOW'] as PageStatus[]).map(s => (
            summary[s] > 0 ? (
              <span key={s} className="flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{
                    background: PALETTE[s].fill,
                    border: s === 'BLACK' ? '1px solid var(--c-border-soft)' : 'none',
                  }}
                />
                <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{summary[s]}</span>
              </span>
            ) : null
          ))}
          <span className="ml-auto" style={{ color: 'var(--c-text-faint)' }}>
            pp. {grid.startPage}–{grid.endPage}
          </span>
        </div>
      )}

      {/* ── Page grid ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scroll-container">
        {loading ? (
          <div className="flex justify-center mt-12"><Spinner size={28} color="var(--c-gold)" /></div>
        ) : !grid ? (
          <p className="text-center text-sm mt-12" style={{ color: 'var(--c-text-faint)' }}>
            Failed to load Juz {juzNumber}.
          </p>
        ) : (
          <div
            className="grid gap-2 max-w-2xl mx-auto"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
              maxWidth: '100%',
            }}
          >
            {grid.pages.map(page => (
              <PageTile
                key={page.pageNumber}
                page={page}
                highlighted={highlighted === page.pageNumber}
                onTap={() => !readOnly && setEditorPage(page)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Page editor pop-up ────────────────────────────── */}
      {editorPage && (
        <PageEditor
          open
          pageNumber={editorPage.pageNumber}
          currentStatus={editorPage.status}
          onSelect={async (s) => {
            await handleSetStatus(s);
            setEditorPage(null);
            if (s === 'GOLD') burst();
          }}
          onUntouch={async () => {
            await handleUntouch();
            setEditorPage(null);
          }}
          onClose={() => setEditorPage(null)}
        />
      )}
    </div>
  );
}
