/**
 * JuzGrid — one tile per page, solid color.
 *
 * All 604 pages live in a single continuous scroll, split by a sticky header
 * per Juz, like months in a calendar. The Juz selector scrolls to the start of
 * a Juz rather than swapping the view, so the pages either side stay reachable
 * — the boundary between two Juz is exactly where a student often works.
 *
 * The selector tracks whatever Juz is under the top of the viewport as you
 * scroll, so it always reads as a position indicator rather than a filter.
 *
 *   • Untouched pages = empty/white tile with just the page number.
 *   • Tap a tile → opens the PageEditor pop-up to set its colour.
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { History, BookmarkPlus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfetti } from '../components/Confetti';
import { hifzApi, type JuzGridPage } from '../api/hifz';
import type { PageStatus } from '../../../shared/juz-map';
import { juzForPage, JUZ_MAP } from '../../../shared/juz-map';
import { PALETTE } from './palette';
import PageEditor from './PageEditor';
import Spinner from '../components/Spinner';

const TOTAL_PAGES = 604;

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
      className="aspect-square rounded-xl text-base font-bold transition-all active:scale-90 flex items-center justify-center"
      style={{
        background: entry ? entry.fill : 'var(--c-bg-card)',
        color: entry ? entry.text : 'var(--c-text)',
        border: highlighted
          ? '2.5px solid var(--c-gold)'
          : untouched
            ? '1.5px solid var(--c-border-soft)'
            : 'none',
        boxShadow: highlighted
          ? '0 0 0 4px rgba(255,215,0,0.35)'
          : status === 'GOLD'
            // Keeps Memorised distinct from the neighbouring yellow/orange.
            ? `0 0 0 2px ${PALETTE.GOLD.accent} inset`
            : undefined,
        minHeight: 56,
      }}
      aria-label={`Page ${page.pageNumber}${entry ? `, ${entry.label}` : ', untouched'}`}
    >
      {page.pageNumber}
    </button>
  );
}

export default function JuzGrid({ studentId, initialJuz, onOpenAudit, onSaveNazira, readOnly = false }: Props) {
  const { burst } = useConfetti();

  /** The Juz the selector shows — driven by scroll position, not by filtering. */
  const [juzNumber, setJuzNumber] = useState<number>(() => {
    if (initialJuz) return initialJuz;
    try {
      const saved = localStorage.getItem('nazirah-last-juz');
      return saved ? Math.min(30, Math.max(1, parseInt(saved, 10))) : 1;
    } catch { return 1; }
  });
  const [pages, setPages] = useState<JuzGridPage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorPage, setEditorPage] = useState<JuzGridPage | null>(null);

  // ── Page finder ────────────────────────────────────────────
  const [finderInput, setFinderInput] = useState('');
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scrolling ──────────────────────────────────────────────
  const scrollRef   = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Map<number, HTMLElement>>(new Map());
  /** Set while a programmatic scroll runs, so the selector doesn't flicker
   *  through every Juz it passes on the way to the target. */
  const suppressSync = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialScroll = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // One request for the whole Mus'haf — the list is continuous now, so
      // fetching per Juz would mean 30 round trips.
      const data = studentId !== undefined
        ? await hifzApi.studentAllPages(studentId)
        : await hifzApi.allPages();
      const byPage = new Map(data.pages.map(p => [p.pageNumber, p.status]));
      setPages(
        Array.from({ length: TOTAL_PAGES }, (_, i) => ({
          pageNumber: i + 1,
          status: byPage.get(i + 1) ?? null,
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try { localStorage.setItem('nazirah-last-juz', String(juzNumber)); } catch {}
  }, [juzNumber]);

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
  }, []);

  /** Scroll the list so a Juz starts at the top. */
  const scrollToJuz = useCallback((juz: number, behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current;
    const section = sectionRefs.current.get(juz);
    if (!container || !section) return;
    suppressSync.current = true;
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
    suppressTimer.current = setTimeout(() => { suppressSync.current = false; }, 700);
    container.scrollTo({ top: section.offsetTop, behavior });
  }, []);

  // Open on the Juz the student was last looking at, without animating there.
  useEffect(() => {
    if (loading || !pages || didInitialScroll.current) return;
    didInitialScroll.current = true;
    // Wait a frame so the sections have been laid out and offsetTop is real.
    requestAnimationFrame(() => scrollToJuz(juzNumber, 'auto'));
  }, [loading, pages, juzNumber, scrollToJuz]);

  /** Keep the selector in step with whatever Juz is under the top edge. */
  const handleScroll = useCallback(() => {
    if (suppressSync.current) return;
    const container = scrollRef.current;
    if (!container) return;
    const y = container.scrollTop + 4;
    let current = 1;
    for (const [juz, el] of sectionRefs.current) {
      if (el.offsetTop <= y) current = juz;
      else break;
    }
    setJuzNumber(prev => (prev === current ? prev : current));
  }, []);

  function flashPage(n: number) {
    setHighlighted(n);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlighted(null), 2000);
  }

  function jumpToPage() {
    const n = parseInt(finderInput.trim(), 10);
    if (isNaN(n) || n < 1 || n > TOTAL_PAGES) {
      toast.error(`Enter a page number between 1 and ${TOTAL_PAGES}`);
      return;
    }
    setFinderInput('');
    // Every page is mounted, so the tile can be scrolled to directly.
    const el = document.getElementById(`page-${n}`);
    if (!el) { toast.error('Page not found'); return; }
    suppressSync.current = true;
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
    suppressTimer.current = setTimeout(() => {
      suppressSync.current = false;
      handleScroll();
    }, 700);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const juz = juzForPage(n);
    if (juz) setJuzNumber(juz.juz);
    flashPage(n);
  }

  /* ── Patch helpers ─────────────────────────────────────── */
  function patchPage(pageNumber: number, status: PageStatus | null) {
    setPages(prev => prev
      ? prev.map(p => p.pageNumber === pageNumber ? { ...p, status } : p)
      : prev);
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
        toast.success(`Page ${editorPage.pageNumber} memorised — Mashallah`);
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

  /* ── Colour counts for the Juz currently in view ─────────── */
  const activeJuz = useMemo(() => JUZ_MAP.find(j => j.juz === juzNumber), [juzNumber]);

  const summary = useMemo(() => {
    if (!pages || !activeJuz) return null;
    const counts: Record<PageStatus | 'UNTOUCHED', number> = {
      BLACK: 0, RED: 0, AMBER: 0, YELLOW: 0, GREEN: 0, GOLD: 0, UNTOUCHED: 0,
    };
    for (const p of pages) {
      if (p.pageNumber < activeJuz.startPage || p.pageNumber > activeJuz.endPage) continue;
      if (p.status === null) counts.UNTOUCHED++;
      else counts[p.status]++;
    }
    return counts;
  }, [pages, activeJuz]);

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
          onChange={e => {
            const j = parseInt(e.target.value, 10);
            setJuzNumber(j);
            scrollToJuz(j);
          }}
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
      {summary && activeJuz && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-[10px] flex-wrap border-b"
          style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}
        >
          {(['GOLD', 'GREEN', 'AMBER', 'RED', 'BLACK', 'YELLOW'] as PageStatus[]).map(s => (
            summary[s] > 0 ? (
              <span key={s} className="flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ background: PALETTE[s].fill }}
                />
                <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{summary[s]}</span>
              </span>
            ) : null
          ))}
          <span className="ml-auto" style={{ color: 'var(--c-text-faint)' }}>
            pp. {activeJuz.startPage}–{activeJuz.endPage}
          </span>
        </div>
      )}

      {/* ── Continuous page list, one section per Juz ──────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-container relative"
      >
        {loading ? (
          <div className="flex justify-center mt-12"><Spinner size={28} color="var(--c-gold)" /></div>
        ) : !pages ? (
          <p className="text-center text-sm mt-12" style={{ color: 'var(--c-text-faint)' }}>
            Failed to load pages.
          </p>
        ) : (
          <>
            {JUZ_MAP.map(juz => (
              <section
                key={juz.juz}
                id={`juz-${juz.juz}`}
                ref={el => {
                  if (el) sectionRefs.current.set(juz.juz, el);
                  else sectionRefs.current.delete(juz.juz);
                }}
              >
                {/* Sticky Juz header — the month bar of the calendar */}
                <div
                  className="sticky top-0 z-10 flex items-baseline gap-2 px-4 py-2 border-b backdrop-blur"
                  style={{
                    backgroundColor: 'var(--c-bg-nav)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: 'var(--c-text)' }}>
                    Juz {juz.juz}
                  </span>
                  <span className="font-amiri text-sm" style={{ color: 'var(--c-gold)' }} lang="ar" dir="rtl">
                    {JUZ_ARABIC[juz.juz]}
                  </span>
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--c-text-faint)' }}>
                    pp. {juz.startPage}–{juz.endPage}
                  </span>
                </div>

                <div
                  className="grid gap-3 mx-auto px-4 pt-4 pb-6"
                  style={{ gridTemplateColumns: 'repeat(5, 1fr)', maxWidth: 360 }}
                >
                  {pages.slice(juz.startPage - 1, juz.endPage).map(page => (
                    <PageTile
                      key={page.pageNumber}
                      page={page}
                      highlighted={highlighted === page.pageNumber}
                      onTap={() => !readOnly && setEditorPage(page)}
                    />
                  ))}
                </div>
              </section>
            ))}
            {/* Lets the final Juz scroll up to the top like every other one. */}
            <div aria-hidden style={{ height: '60vh' }} />
          </>
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
