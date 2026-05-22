import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Check, Users, ChevronRight, GraduationCap, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { classesApi } from '../api/classes';
import type { ClassWithMeta } from '../types';
import BottomSheet from '../components/BottomSheet';
import Spinner from '../components/Spinner';

/* ── Avatar initials ─────────────────────────────────────── */
function Initials({ name, size = 40 }: { name: string; size?: number }) {
  const letters = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: 'var(--c-green-dark)', color: 'var(--c-gold)', fontSize: size * 0.38 }}
    >
      {letters}
    </div>
  );
}

/* ── Copy-join-code button ───────────────────────────────── */
function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all active:scale-95"
      style={{ backgroundColor: 'var(--c-gold-bg)', color: 'var(--c-gold)' }}
    >
      {code}
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────── */
type SheetMode = 'choose' | 'create' | 'join';

export default function ClassesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isUstadh = user?.role === 'ustadh';

  const [classes, setClasses] = useState<ClassWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet state
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [sheetMode, setSheetMode]   = useState<SheetMode>('choose');
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await classesApi.list();
      setClasses(data);
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openSheet() {
    setInputValue('');
    // Ustadh gets a choice; students go straight to join
    setSheetMode(isUstadh ? 'choose' : 'join');
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setInputValue('');
  }

  async function handleSubmit() {
    const value = inputValue.trim();
    if (!value) return;
    setSubmitting(true);
    try {
      if (sheetMode === 'create') {
        const created = await classesApi.create(value);
        setClasses(prev => [{ ...created, is_owner: true }, ...prev]);
        toast.success('Class created');
      } else {
        const joined = await classesApi.join(value.toUpperCase());
        setClasses(prev => [joined, ...prev]);
        toast.success('Joined class!');
      }
      closeSheet();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen scroll-container pb-layout pt-safe" style={{ backgroundColor: 'var(--c-bg)' }}>
      <div className="p-5 max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--c-text)' }}>Classes</h1>

        {loading ? (
          <div className="flex justify-center mt-20">
            <Spinner size={32} color="var(--c-gold)" />
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mt-24 text-center">
            <Users className="w-10 h-10" style={{ color: 'var(--c-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
              {isUstadh
                ? 'No classes yet. Create your first class or join one.'
                : "You haven't joined any classes yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {classes.map(cls => {
              // For Ustadh: is_owner=true → they own it; is_owner=false → enrolled
              const ownsClass = isUstadh && cls.is_owner !== false;
              return (
                <div
                  key={cls.id}
                  onClick={() => navigate(`/classes/${cls.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/classes/${cls.id}`)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
                >
                  <Initials name={cls.name} size={44} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--c-text)' }}>
                        {cls.name}
                      </p>
                      {/* For Ustadh: show whether they own or are enrolled */}
                      {isUstadh && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0"
                          style={{
                            backgroundColor: ownsClass ? 'var(--c-gold-bg)' : 'var(--c-bg-subtle)',
                            color: ownsClass ? 'var(--c-gold)' : 'var(--c-text-muted)',
                          }}
                        >
                          {ownsClass ? 'Owner' : 'Member'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
                      {ownsClass
                        ? `${cls.student_count ?? 0} student${cls.student_count === 1 ? '' : 's'}`
                        : `Ustadh: ${cls.ustadh_name ?? '—'}`}
                    </p>
                  </div>

                  {ownsClass ? (
                    <CopyCode code={cls.join_code} />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--c-text-faint)' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openSheet}
        className="fixed flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all active:scale-95 z-20"
        style={{
          bottom: `calc(56px + env(safe-area-inset-bottom) + 20px)`,
          right: 20,
          backgroundColor: 'var(--c-gold)',
        }}
        aria-label={isUstadh ? 'Create or join class' : 'Join class'}
      >
        <Plus className="w-6 h-6" style={{ color: '#0d0d0d' }} />
      </button>

      {/* Bottom sheet */}
      <BottomSheet open={sheetOpen} onClose={closeSheet}>
        <div className="p-5 flex flex-col gap-4">

          {/* ── Ustadh: choose mode ── */}
          {isUstadh && sheetMode === 'choose' && (
            <>
              <h2 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>
                What would you like to do?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    mode: 'create' as SheetMode,
                    icon: GraduationCap,
                    title: 'Create a class',
                    subtitle: 'Start a new class for your students',
                  },
                  {
                    mode: 'join' as SheetMode,
                    icon: BookOpen,
                    title: 'Join a class',
                    subtitle: 'Enrol with a join code',
                  },
                ].map(({ mode, icon: Icon, title, subtitle }) => (
                  <button
                    key={mode}
                    onClick={() => setSheetMode(mode)}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl text-center transition-all active:scale-95"
                    style={{
                      backgroundColor: 'var(--c-bg-subtle)',
                      border: '1px solid var(--c-border-soft)',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'var(--c-gold-bg)' }}
                    >
                      <Icon className="w-6 h-6" style={{ color: 'var(--c-gold)' }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>{title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-text-muted)' }}>{subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Create or Join form ── */}
          {(sheetMode === 'create' || sheetMode === 'join') && (
            <>
              <div className="flex items-center gap-2">
                {isUstadh && (
                  <button
                    onClick={() => { setSheetMode('choose'); setInputValue(''); }}
                    className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
                    style={{ color: 'var(--c-text-muted)' }}
                    aria-label="Back"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                )}
                <h2 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>
                  {sheetMode === 'create' ? 'Create a new class' : 'Join a class'}
                </h2>
              </div>

              <input
                autoFocus
                type="text"
                placeholder={sheetMode === 'create' ? 'Class name' : 'Enter join code (e.g. ABC123)'}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: 'var(--c-bg-subtle)',
                  color: 'var(--c-text)',
                  border: '1px solid var(--c-border-soft)',
                }}
              />

              <button
                onClick={handleSubmit}
                disabled={submitting || !inputValue.trim()}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: 'var(--c-gold)', color: '#0d0d0d' }}
              >
                {submitting
                  ? <Spinner size={18} color="#0d0d0d" />
                  : sheetMode === 'create' ? 'Create Class' : 'Join Class'}
              </button>
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
