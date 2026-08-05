import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { hifzApi } from '../api/hifz';
import { saveRole, homeFor } from '../lib/savedRole';
import { juzForPage, memorisedPages, type MemorisationOrder } from '../../../shared/juz-map';
import type { User } from '../types';
import Spinner from '../components/Spinner';

const ORDER_OPTIONS: Array<{ value: MemorisationOrder; title: string; subtitle: string }> = [
  {
    value: 'FORWARD',
    title: 'Front to back',
    subtitle: 'Starting at page 1 and moving forward',
  },
  {
    value: 'BACKWARD',
    title: 'Back to front',
    subtitle: 'Starting at the last page and moving backward',
  },
  {
    value: 'LAST_JUZ_FIRST',
    title: 'Last Juz first',
    subtitle: 'Juz 30 first, then 29, 28 … reading each Juz from its own first page',
  },
];

export default function OnboardingScreen() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<'student' | 'ustadh' | null>(null);

  // Students answer two more questions before entering the app, so their
  // existing memorisation can be filled in rather than tapped out by hand.
  const [step, setStep] = useState<'role' | 'memorisation'>('role');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [pageInput, setPageInput] = useState('');
  const [order, setOrder] = useState<MemorisationOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const initial   = user?.name?.[0]?.toUpperCase() ?? '?';

  const pageNum = parseInt(pageInput, 10);
  const pageValid = Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= 604;
  const juz = pageValid ? juzForPage(pageNum) : undefined;
  // Previewed with the same function the server uses, so the number shown
  // here is the number of pages that will actually be marked.
  const willMark = pageValid && order ? memorisedPages(pageNum, order).length : 0;

  async function pickRole(role: 'student' | 'ustadh') {
    setLoading(role);
    try {
      const { user: updated } = await authApi.setRole(role);
      // Persist role locally so redeployments don't force re-onboarding
      saveRole(updated, role);
      // Guarantee the tour shows immediately on first entry for both roles
      try { localStorage.removeItem('nazirah-tour-seen'); } catch {}

      if (role === 'student') {
        // Hold the updated user back rather than publishing it now: the
        // public layout redirects away from /onboarding the moment a role
        // exists, which would skip the memorisation questions entirely.
        // It is published in finish(), together with the navigation.
        setPendingUser(updated);
        setStep('memorisation');
        setLoading(null);
        return;
      }
      setUser(updated);
      navigate(homeFor(role), { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set role');
      setLoading(null);
    }
  }

  function finish() {
    if (pendingUser) setUser(pendingUser);
    navigate(homeFor('student'), { replace: true });
  }

  async function saveMemorisation() {
    if (!pageValid || !order) return;
    setSaving(true);
    try {
      const { marked } = await hifzApi.backfill(pageNum, order);
      toast.success(marked > 0 ? `${marked} pages marked as Memorized` : 'Saved');
      finish();
    } catch (err) {
      // The role is already set, so a failure here must not trap the student
      // on this screen — let them in and they can mark pages themselves.
      toast.error(err instanceof Error ? err.message : 'Could not save your progress');
      finish();
    }
  }

  if (step === 'memorisation') {
    return (
      <div
        className="min-h-screen flex flex-col px-6 pt-safe pb-safe"
        style={{ backgroundColor: '#FAF7F0' }}
      >
        <div className="w-full mx-auto flex-1 flex flex-col justify-center py-10" style={{ maxWidth: 420 }}>
          <div className="animate-fade-in-up">
            <p className="font-amiri text-4xl mb-2" style={{ color: '#B8862A' }} lang="ar">حفظ</p>
            <h1 className="font-inter font-bold text-xl mb-1" style={{ color: '#0F4C3A' }}>
              Your memorisation
            </h1>
            <p className="text-sm mb-8" style={{ color: 'rgba(15,76,58,0.6)' }}>
              Tell us where you are and we'll fill in what you've already memorised.
            </p>
          </div>

          {/* Q1 — current page */}
          <div className="animate-fade-in-up mb-7">
            <label
              htmlFor="current-page"
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'rgba(15,76,58,0.6)' }}
            >
              Which page are you currently memorising?
            </label>
            <input
              id="current-page"
              type="number"
              inputMode="numeric"
              min={1}
              max={604}
              value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              placeholder="1 – 604"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'rgba(15,76,58,0.05)',
                border: '1.5px solid rgba(15,76,58,0.15)',
                color: '#1A1208',
              }}
            />
            <p className="text-[11px] mt-1.5" style={{ color: 'rgba(15,76,58,0.45)' }}>
              {pageInput === ''
                ? 'The page you are working on right now.'
                : pageValid
                  ? `Page ${pageNum} is in Juz ${juz?.juz}.`
                  : 'Enter a page between 1 and 604.'}
            </p>
          </div>

          {/* Q2 — order */}
          <div className="animate-fade-in-up-delay mb-7">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(15,76,58,0.6)' }}>
              Are you memorising…
            </p>
            <div className="flex flex-col" style={{ gap: 10 }}>
              {ORDER_OPTIONS.map(({ value, title, subtitle }) => {
                const selected = order === value;
                return (
                  <button
                    key={value}
                    onClick={() => setOrder(value)}
                    className="w-full text-left px-4 py-3 rounded-2xl transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: selected ? 'rgba(184,134,42,0.10)' : '#FFFFFF',
                      border: `2px solid ${selected ? '#B8862A' : 'rgba(15,76,58,0.12)'}`,
                    }}
                  >
                    <p className="font-semibold text-sm" style={{ color: '#0F4C3A' }}>{title}</p>
                    <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'rgba(15,76,58,0.55)' }}>
                      {subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview + actions */}
          {pageValid && order && (
            <p
              className="text-xs text-center mb-3 px-3 py-2 rounded-xl"
              style={{ color: '#0F4C3A', backgroundColor: 'rgba(184,134,42,0.12)' }}
            >
              {willMark > 0
                ? <>This will mark <strong>{willMark}</strong> page{willMark === 1 ? '' : 's'} as Memorized.</>
                : <>Nothing to fill in yet — page {pageNum} is your starting point.</>}
            </p>
          )}

          <button
            onClick={saveMemorisation}
            disabled={!pageValid || !order || saving}
            className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: '#0F4C3A', color: '#FAF7F0' }}
          >
            {saving ? <Spinner size={18} color="#FAF7F0" /> : 'Continue'}
          </button>

          <button
            onClick={finish}
            disabled={saving}
            className="w-full py-3 mt-2 text-xs font-semibold disabled:opacity-40"
            style={{ color: 'rgba(15,76,58,0.55)' }}
          >
            I haven't started memorising yet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 pt-safe pb-safe"
      style={{ backgroundColor: '#FAF7F0' }}
    >
      <div className="text-center mb-10 animate-fade-in-up">
        {/* Gold Arabic — same as splash screen */}
        <p
          className="font-amiri leading-none mb-4"
          style={{ color: '#B8862A', fontSize: 56 }}
          lang="ar"
        >
          حفظ
        </p>

        {/* Google profile picture */}
        <div className="flex justify-center mb-4">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user?.name ?? 'Profile'}
              className="w-16 h-16 rounded-full object-cover"
              style={{ border: '2px solid rgba(184,134,42,0.35)' }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: 'rgba(184,134,42,0.12)', color: '#B8862A', border: '2px solid rgba(184,134,42,0.35)' }}
            >
              {initial}
            </div>
          )}
        </div>

        {/* Gold divider */}
        <div className="flex items-center gap-2 justify-center mb-4">
          <div style={{ width: 30, height: 1, backgroundColor: '#B8862A', opacity: 0.5 }} />
          <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true">
            <polygon points="3,0 6,3 3,6 0,3" fill="#B8862A" />
          </svg>
          <div style={{ width: 30, height: 1, backgroundColor: '#B8862A', opacity: 0.5 }} />
        </div>

        <h1
          className="font-inter text-lg font-semibold mb-1.5"
          style={{ color: '#0F4C3A' }}
        >
          Welcome, {firstName}
        </h1>
        <p
          className="font-inter text-sm"
          style={{ color: 'rgba(15,76,58,0.6)' }}
        >
          How are you using The Hifz App?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full animate-fade-in-up-delay" style={{ maxWidth: 360 }}>
        {[
          {
            role: 'student' as const,
            icon: BookOpen,
            title: 'Student',
            subtitle: 'I am learning Hifz',
          },
          {
            role: 'ustadh' as const,
            icon: GraduationCap,
            title: 'Ustadh',
            subtitle: 'I am teaching a class',
          },
        ].map(({ role, icon: Icon, title, subtitle }) => {
          const isSelected = loading === role;
          return (
            <button
              key={role}
              onClick={() => pickRole(role)}
              disabled={loading !== null}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: '#FFFFFF',
                border: `2px solid ${isSelected ? '#B8862A' : 'rgba(15,76,58,0.12)'}`,
                boxShadow: '0 1px 3px rgba(15,76,58,0.06)',
              }}
            >
              <Icon className="w-9 h-9" style={{ color: '#B8862A' }} strokeWidth={1.5} />
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: '#0F4C3A' }}>{title}</p>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(15,76,58,0.55)' }}>{subtitle}</p>
              </div>
              {isSelected && (
                <div
                  className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                  style={{ borderColor: '#B8862A', borderTopColor: 'transparent' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tagline at bottom */}
      <p
        className="absolute bottom-12 font-inter text-[10px] tracking-[0.24em] uppercase"
        style={{ color: '#B8862A' }}
      >
        Read · Recite · Reflect
      </p>
    </div>
  );
}
