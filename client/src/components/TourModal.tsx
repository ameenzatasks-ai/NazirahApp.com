/**
 * TourModal — "How it Works" walkthrough shown on first login and from Profile.
 *
 * 6 steps:
 *   1. Welcome
 *   2. What is Nazirah?
 *   3. The Color System
 *   4. For Students
 *   5. For Ustadh
 *   6. You're all set
 */
import { useState, useEffect } from 'react';
import {
  BookOpen, Pencil, CheckCircle2, Star, RotateCw,
  Users, GraduationCap, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { PALETTE } from '../hifz/palette';
import type { PageStatus } from '../../../shared/juz-map';

interface Props {
  open: boolean;
  onClose: () => void;
}

const COLOR_ORDER: PageStatus[] = ['BLACK', 'RED', 'AMBER', 'GREEN', 'GOLD', 'YELLOW'];

/* ── Individual slides ───────────────────────────────────────── */
function Slide1() {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
        style={{ backgroundColor: 'rgba(184,134,42,0.15)', color: '#C49A2A' }}
      >
        📿
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--c-text)' }}>
          Welcome to The Nazirah App
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
          Your personal Quran Hifz tracker. Track every page of your memorisation
          journey — and let your Ustadh follow your progress in real time.
        </p>
      </div>
    </div>
  );
}

function Slide2() {
  const terms = [
    { term: 'Nazirah (ناظره)', def: 'Reciting from looking at the Mushaf — reading with sight.' },
    { term: 'Hifz (حفظ)',      def: 'Complete memorisation — knowing the Quran by heart.' },
    { term: 'Sabaq (سبق)',     def: 'Your daily new lesson — pages you memorise fresh today.' },
    { term: 'Dhor (دور)',      def: 'Revision of recently memorised pages.' },
    { term: 'Ustadh (أستاذ)', def: 'Your teacher who monitors and guides your memorisation.' },
  ];
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--c-text)' }}>Key Terms</h2>
        <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
          Understand the language of Hifz
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {terms.map(({ term, def }) => (
          <div
            key={term}
            className="px-3.5 py-3 rounded-xl"
            style={{ backgroundColor: 'var(--c-bg-subtle)', border: '1px solid var(--c-border-soft)' }}
          >
            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--c-text)' }}>{term}</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--c-text-muted)' }}>{def}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide3() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--c-text)' }}>The Color System</h2>
        <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
          Each page tile is colored to show its status
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {COLOR_ORDER.map(status => {
          const p = PALETTE[status];
          const Icon = p.icon;
          return (
            <div
              key={status}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden relative"
              style={{ background: p.fill }}
            >
              {/* accent stripe */}
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: p.accent }} />
              {/* icon */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-1"
                style={{ background: p.iconBg, border: `1.5px solid ${p.accent}` }}
              >
                <Icon className="w-4 h-4" style={{ color: p.iconColor }} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>{p.label}</p>
                <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {p.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Slide4() {
  const steps = [
    { icon: BookOpen,     text: 'Ask your Ustadh for the join code and enter it to enroll in their class.' },
    { icon: Pencil,       text: 'Tap any page tile in the Juz grid and select its current status.' },
    { icon: CheckCircle2, text: 'Save your Nazirah Status weekly to keep a history of your progress.' },
    { icon: Star,         text: 'Work towards Gold (Memorized) on every page of the Quran!' },
  ];
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2"
          style={{ backgroundColor: 'rgba(0,212,160,0.15)' }}>
          <BookOpen className="w-6 h-6" style={{ color: '#00D4A0' }} />
        </div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--c-text)' }}>For Students</h2>
        <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>How to use the app day-to-day</p>
      </div>
      <div className="flex flex-col gap-3">
        {steps.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: 'var(--c-bg-subtle)', border: '1px solid var(--c-border-soft)' }}
            >
              <Icon className="w-4 h-4" style={{ color: 'var(--c-gold)' }} strokeWidth={2} />
            </div>
            <p className="text-sm leading-snug flex-1" style={{ color: 'var(--c-text)' }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide5() {
  const steps = [
    { icon: GraduationCap, text: 'Create a class and share the join code with your students.' },
    { icon: Users,          text: 'Tap any student in your roster to see their full Juz grid.' },
    { icon: RotateCw,       text: 'Browse their Nazirah logs to track week-by-week progress.' },
    { icon: Pencil,         text: 'You can also update a student\'s page status directly during a session.' },
  ];
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2"
          style={{ backgroundColor: 'rgba(184,134,42,0.15)' }}>
          <GraduationCap className="w-6 h-6" style={{ color: 'var(--c-gold)' }} />
        </div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--c-text)' }}>For Ustadh</h2>
        <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>Managing your class</p>
      </div>
      <div className="flex flex-col gap-3">
        {steps.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: 'var(--c-bg-subtle)', border: '1px solid var(--c-border-soft)' }}
            >
              <Icon className="w-4 h-4" style={{ color: 'var(--c-gold)' }} strokeWidth={2} />
            </div>
            <p className="text-sm leading-snug flex-1" style={{ color: 'var(--c-text)' }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide6({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
        style={{ backgroundColor: 'rgba(0,212,160,0.12)', color: '#00D4A0' }}
      >
        ✅
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--c-text)' }}>
          You're all set!
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
          You can re-read this guide at any time from{' '}
          <span style={{ color: 'var(--c-gold)', fontWeight: 600 }}>Profile → Take a Tour</span>.
          <br /><br />
          May Allah bless your Hifz journey. 🤲
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
        style={{ backgroundColor: 'var(--c-gold)', color: '#0d0d0d' }}
      >
        Start Using The App
      </button>
    </div>
  );
}

/* ── Main modal ──────────────────────────────────────────────── */
const TOTAL_STEPS = 6;

export default function TourModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  // Reset to first step whenever modal re-opens
  useEffect(() => { if (open) setStep(0); }, [open]);

  // Block body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const canPrev = step > 0;
  const canNext = step < TOTAL_STEPS - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full rounded-t-3xl sm:rounded-3xl overflow-hidden animate-fade-in-up"
        style={{
          backgroundColor: 'var(--c-bg-card)',
          border: '1px solid var(--c-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          maxWidth: 440,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--c-border)' }}
        >
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 7,
                  height: 7,
                  backgroundColor: i === step ? 'var(--c-gold)' : 'var(--c-border)',
                }}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all active:scale-90"
            style={{ color: 'var(--c-text-muted)' }}
            aria-label="Close guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 0 && <Slide1 />}
          {step === 1 && <Slide2 />}
          {step === 2 && <Slide3 />}
          {step === 3 && <Slide4 />}
          {step === 4 && <Slide5 />}
          {step === 5 && <Slide6 onClose={onClose} />}
        </div>

        {/* Navigation (hidden on last step — Slide6 has its own button) */}
        {step < TOTAL_STEPS - 1 && (
          <div
            className="flex items-center justify-between px-5 py-4 border-t flex-shrink-0"
            style={{ borderColor: 'var(--c-border)' }}
          >
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={!canPrev}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-30"
              style={{ color: 'var(--c-text-muted)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <span className="text-xs" style={{ color: 'var(--c-text-faint)' }}>
              {step + 1} / {TOTAL_STEPS}
            </span>

            <button
              onClick={() => canNext ? setStep(s => s + 1) : onClose()}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ backgroundColor: 'var(--c-gold)', color: '#0d0d0d' }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
