import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Check, X, Headphones } from 'lucide-react';
import toast from 'react-hot-toast';
import { pagesApi, type ListenedPage } from '../../api/pages';
import Spinner from '../../components/Spinner';

const TOTAL_PAGES = 604;
const ALL_PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

/* ── Searchable page picker ─────────────────────────────────── */
function PagePicker({
  listenedSet,
  onMark,
  onUnmark,
}: {
  listenedSet: Set<number>;
  onMark: (n: number) => Promise<void>;
  onUnmark: (n: number) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return ALL_PAGES;
    return ALL_PAGES.filter(p => String(p).startsWith(q));
  }, [query]);

  function pick(n: number) {
    setSelected(n);
    setQuery(String(n));
    setOpen(false);
    inputRef.current?.blur();
  }

  async function handleToggle() {
    if (!selected) return;
    setBusy(true);
    try {
      if (listenedSet.has(selected)) {
        await onUnmark(selected);
      } else {
        await onMark(selected);
      }
    } finally {
      setBusy(false);
    }
  }

  const isListened = selected !== null && listenedSet.has(selected);
  const isValid = selected !== null && selected >= 1 && selected <= TOTAL_PAGES;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="space-y-3">
      <div ref={dropdownRef} className="relative">
        <div
          className="flex items-center gap-2 px-3 py-3 rounded-2xl"
          style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border-soft)' }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--c-text-faint)' }} />
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={TOTAL_PAGES}
            placeholder="Type or search a page number (1–604)…"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--c-text)' }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setSelected(null); setOpen(false); }}>
              <X className="w-4 h-4" style={{ color: 'var(--c-text-muted)' }} />
            </button>
          )}
        </div>

        {open && filtered.length > 0 && (
          <div
            className="absolute left-0 right-0 mt-1 rounded-2xl overflow-hidden z-20 shadow-xl"
            style={{
              backgroundColor: 'var(--c-bg-card)',
              border: '1px solid var(--c-border-soft)',
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {filtered.slice(0, 60).map(n => (
              <button
                key={n}
                onMouseDown={() => pick(n)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors"
                style={{
                  color: 'var(--c-text)',
                  backgroundColor: listenedSet.has(n) ? 'rgba(15,76,58,0.25)' : 'transparent',
                }}
              >
                <span>Page {n}</span>
                {listenedSet.has(n) && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#22C55E' }}>
                    <Headphones className="w-3 h-3" /> Listened
                  </span>
                )}
              </button>
            ))}
            {filtered.length > 60 && (
              <p className="px-4 py-2 text-xs text-center" style={{ color: 'var(--c-text-faint)' }}>
                Type more to narrow down…
              </p>
            )}
          </div>
        )}
      </div>

      {isValid && (
        <button
          onClick={handleToggle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            backgroundColor: isListened ? 'var(--c-red-bg)' : 'var(--c-green-dark)',
            color: isListened ? 'var(--c-red)' : 'var(--c-gold)',
            border: isListened ? '1px solid var(--c-red-bg)' : 'none',
          }}
        >
          {busy ? (
            <Spinner size={16} color={isListened ? 'var(--c-red)' : 'var(--c-gold)'} />
          ) : isListened ? (
            <><X className="w-4 h-4" /> Unmark page {selected}</>
          ) : (
            <><Headphones className="w-4 h-4" /> I've listened to page {selected}</>
          )}
        </button>
      )}
    </div>
  );
}

/* ── Listened pages list ────────────────────────────────────── */
function ListenedList({ pages, onUnmark }: { pages: ListenedPage[]; onUnmark: (n: number) => Promise<void> }) {
  const [removing, setRemoving] = useState<number | null>(null);

  async function handleUnmark(n: number) {
    setRemoving(n);
    try { await onUnmark(n); } finally { setRemoving(null); }
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 mt-8 text-center">
        <Headphones className="w-8 h-8" style={{ color: 'var(--c-text-faint)' }} />
        <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
          No pages listened to yet.
        </p>
        <p className="text-xs" style={{ color: 'var(--c-text-faint)' }}>
          Search for a page above and mark it as listened.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {pages.map(p => (
        <div
          key={p.pageNumber}
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
            >
              <Check className="w-4 h-4" style={{ color: '#22C55E' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>Page {p.pageNumber}</p>
              <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
                {new Date(p.listenedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleUnmark(p.pageNumber)}
            disabled={removing === p.pageNumber}
            className="p-1.5 rounded-lg transition-all active:scale-90 disabled:opacity-40"
            style={{ color: 'var(--c-text-muted)' }}
            aria-label="Unmark"
          >
            {removing === p.pageNumber
              ? <Spinner size={14} color="var(--c-text-muted)" />
              : <X className="w-4 h-4" />
            }
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Main screen ────────────────────────────────────────────── */
export default function PagesGrid() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<ListenedPage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { listenedPages } = await pagesApi.list();
      setPages(listenedPages);
    } catch {
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const listenedSet = useMemo(() => new Set(pages.map(p => p.pageNumber)), [pages]);

  async function handleMark(pageNumber: number) {
    try {
      const res = await pagesApi.markListened(pageNumber);
      setPages(prev => {
        if (prev.find(p => p.pageNumber === pageNumber)) return prev;
        return [...prev, { pageNumber, listenedAt: res.listenedAt }].sort((a, b) => a.pageNumber - b.pageNumber);
      });
      toast.success(`Page ${pageNumber} marked as listened ✓`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleUnmark(pageNumber: number) {
    try {
      await pagesApi.unmark(pageNumber);
      setPages(prev => prev.filter(p => p.pageNumber !== pageNumber));
      toast.success(`Page ${pageNumber} unmarked`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="min-h-screen pb-layout" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 sticky top-0 z-10 border-b"
        style={{ backgroundColor: 'var(--c-bg)', borderColor: 'var(--c-border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>My Pages</h1>
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--c-gold)' }}>
          {loading ? '—' : `${pages.length} / ${TOTAL_PAGES}`}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20"><Spinner size={32} color="var(--c-gold)" /></div>
      ) : (
        <div className="p-4 max-w-md mx-auto space-y-6">
          <PagePicker listenedSet={listenedSet} onMark={handleMark} onUnmark={handleUnmark} />
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--c-text-muted)' }}>
              Listened pages ({pages.length})
            </h2>
            <ListenedList pages={pages} onUnmark={handleUnmark} />
          </div>
        </div>
      )}
    </div>
  );
}
