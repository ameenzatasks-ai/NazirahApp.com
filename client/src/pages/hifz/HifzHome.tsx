/**
 * HifzHome — entry screen for the حفظ (Hifz) tracking module.
 *
 * Student view:  shows active task queue + "Track your task" CTA.
 * Ustadh view:   shows pending grading queue.
 *
 * Phase 1 (current): shell + layout with "coming soon" placeholders
 * for task logging and grading — wired up in subsequent phases.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookMarked, GraduationCap, Plus, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/* ── Empty-state card ────────────────────────────────────── */
function EmptyQueue({ isUstadh }: { isUstadh: boolean }) {
  return (
    <div
      className="rounded-2xl flex flex-col items-center gap-3 py-10 px-6 text-center"
      style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
    >
      {isUstadh ? (
        <ClipboardList className="w-9 h-9" style={{ color: 'var(--c-text-faint)' }} />
      ) : (
        <BookMarked className="w-9 h-9" style={{ color: 'var(--c-text-faint)' }} />
      )}
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--c-text-muted)' }}>
          {isUstadh ? 'No pending submissions' : 'No active tasks'}
        </p>
        <p className="text-[12px] mt-1" style={{ color: 'var(--c-text-faint)' }}>
          {isUstadh
            ? 'Student submissions awaiting your grade will appear here.'
            : 'Tap "Track your task" below to log today\'s Sabaq, Sabaq Para, or Dawr.'}
        </p>
      </div>
    </div>
  );
}

/* ── Phase badge ─────────────────────────────────────────── */
function ComingSoonBadge() {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: 'var(--c-gold-bg)', color: 'var(--c-gold)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      Building now
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function HifzHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isUstadh = user?.role === 'ustadh';

  return (
    <div
      className="min-h-screen flex flex-col pb-layout"
      style={{ backgroundColor: 'var(--c-bg)' }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <button
          onClick={() => navigate('/hub')}
          className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p lang="ar" className="font-bold text-xl leading-none" style={{ color: 'var(--c-gold)', fontFamily: "'Amiri', serif" }}>
              حفظ
            </p>
            <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>
              Hifz
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
            {isUstadh ? 'Grading queue' : 'Your task queue'}
          </p>
        </div>

        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--c-gold-bg)' }}
        >
          <GraduationCap className="w-4 h-4" style={{ color: 'var(--c-gold)' }} />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 scroll-container">
        <div className="max-w-md mx-auto flex flex-col gap-5">

          {/* Status banner */}
          <div
            className="rounded-2xl px-4 py-4 flex items-start gap-3"
            style={{ backgroundColor: 'var(--c-gold-bg)', border: '1px solid rgba(184,134,42,0.2)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(184,134,42,0.15)' }}
            >
              <GraduationCap className="w-4.5 h-4.5" style={{ color: 'var(--c-gold)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: 'var(--c-gold)' }}>
                  Hifz Module
                </p>
                <ComingSoonBadge />
              </div>
              <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
                Task logging, Juz quarter selection, Loospar scoring, and the master history dashboard are being built. Check back soon!
              </p>
            </div>
          </div>

          {/* What's coming section */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--c-text-muted)' }}>
              {isUstadh ? 'Pending grading' : 'Active tasks'}
            </p>
            <EmptyQueue isUstadh={isUstadh} />
          </div>

          {/* Feature preview */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--c-text-muted)' }}>
              What's being built
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Task logging', detail: 'Sabaq · Sabaq Para · Dawr with date picker' },
                { label: 'Quarter scope matrix', detail: '¼ · ½ · ¾ · Full Juz selection' },
                { label: 'Loospar grading', detail: 'Ustadh scores each quarter 0–10' },
                { label: 'Master history grid', detail: 'Date-aligned dashboard with score colours' },
              ].map(f => (
                <div
                  key={f.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: 'var(--c-gold)' }}
                  />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--c-text)' }}>
                      {f.label}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--c-text-faint)' }}>
                      {f.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Student CTA ─────────────────────────────────────── */}
      {!isUstadh && (
        <div
          className="px-4 py-3 border-t"
          style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
        >
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold opacity-40"
            style={{ backgroundColor: 'var(--c-gold)', color: '#0d0d0d' }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            Track your task
          </button>
          <p className="text-center text-[10px] mt-1.5" style={{ color: 'var(--c-text-faint)' }}>
            Task logging coming soon
          </p>
        </div>
      )}
    </div>
  );
}
