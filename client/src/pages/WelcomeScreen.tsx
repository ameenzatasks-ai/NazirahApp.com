import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import Spinner from '../components/Spinner';

type View = 'home' | 'username-choose' | 'create' | 'signin';

function ArchIllustration() {
  return (
    <svg viewBox="0 0 220 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
      <path d="M30 260 L30 120 Q30 20 110 10 Q190 20 190 120 L190 260 Z" stroke="#0F4C3A" strokeWidth="3" fill="#FAF7F0" />
      <path d="M44 252 L44 124 Q44 36 110 26 Q176 36 176 124 L176 252 Z" stroke="#B8862A" strokeWidth="1.5" fill="none" strokeDasharray="4 4" />
      <line x1="80" y1="210" x2="68" y2="240" stroke="#0F4C3A" strokeWidth="3" strokeLinecap="round" />
      <line x1="140" y1="210" x2="152" y2="240" stroke="#0F4C3A" strokeWidth="3" strokeLinecap="round" />
      <line x1="70" y1="230" x2="150" y2="230" stroke="#0F4C3A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M72 210 Q110 202 148 210" stroke="#0F4C3A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M72 210 L80 175 Q95 162 110 168 Z" fill="rgba(184,134,42,0.18)" stroke="#0F4C3A" strokeWidth="1.5" />
      <path d="M148 210 L140 175 Q125 162 110 168 Z" fill="rgba(184,134,42,0.18)" stroke="#0F4C3A" strokeWidth="1.5" />
      <line x1="110" y1="168" x2="110" y2="210" stroke="#0F4C3A" strokeWidth="2" strokeLinecap="round" />
      <line x1="84" y1="186" x2="106" y2="183" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="86" y1="193" x2="107" y2="190" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="88" y1="200" x2="107" y2="197" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="114" y1="183" x2="136" y2="186" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="114" y1="190" x2="135" y2="193" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="114" y1="197" x2="133" y2="200" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <polygon points="110,2 116,10 110,18 104,10" fill="#B8862A" />
      <circle cx="30" cy="260" r="4" fill="#B8862A" />
      <circle cx="190" cy="260" r="4" fill="#B8862A" />
    </svg>
  );
}

function GoldDivider() {
  return (
    <div className="flex items-center gap-2.5 justify-center">
      <div style={{ width: 50, height: 1, backgroundColor: '#B8862A', opacity: 0.35 }} />
      <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true"><polygon points="3,0 6,3 3,6 0,3" fill="#B8862A" opacity="0.5" /></svg>
      <div style={{ width: 50, height: 1, backgroundColor: '#B8862A', opacity: 0.35 }} />
    </div>
  );
}

function InputField({
  label, type = 'text', value, onChange, placeholder, hint, showToggle, onToggle,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  hint?: string; showToggle?: boolean; onToggle?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(15,76,58,0.6)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'rgba(15,76,58,0.05)',
            border: '1.5px solid rgba(15,76,58,0.15)',
            color: '#1A1208',
          }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgba(15,76,58,0.4)' }}
          >
            {type === 'password' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px]" style={{ color: 'rgba(15,76,58,0.45)' }}>{hint}</p>}
    </div>
  );
}

export default function WelcomeScreen() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('home');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function reset(next: View) {
    setError('');
    setName('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setView(next);
  }

  async function handleRegister() {
    setError('');
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (username.length < 3) { setError('Username must be at least 3 characters.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const { user } = await authApi.register(name.trim(), username.trim(), password);
      try { localStorage.setItem('hifz-username', username.trim().toLowerCase()); } catch {}
      setUser(user);
      navigate(user.role ? (user.role === 'student' ? '/classes' : '/home') : '/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setError('');
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setLoading(true);
    try {
      const { user } = await authApi.login(username.trim(), password);
      setUser(user);
      navigate(user.role ? (user.role === 'student' ? '/classes' : '/home') : '/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-y-auto pt-safe pb-safe" style={{ backgroundColor: '#FAF7F0' }}>

      {/* ── Home view ─────────────────────────────────────── */}
      {view === 'home' && (
        <>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8" style={{ gap: 20 }}>
            <div className="animate-fade-in-up" style={{ width: 140, height: 165 }}>
              <ArchIllustration />
            </div>
            <p className="font-amiri leading-none animate-fade-in-up" style={{ color: '#B8862A', fontSize: 72, textShadow: '0 1px 0 rgba(184,134,42,0.15)', marginTop: -4 }} lang="ar">حفظ</p>
            <div className="animate-fade-in-up-delay"><GoldDivider /></div>
            <h1 className="font-inter font-bold tracking-[0.22em] uppercase text-sm animate-fade-in-up-delay" style={{ color: '#0F4C3A' }}>The Hifz App</h1>
            <p className="text-sm leading-relaxed animate-fade-in-up-delay2 max-w-xs" style={{ color: 'rgba(15,76,58,0.55)' }}>
              Track your daily Sabaq, Sabaq Para & Dawr — memorise the Qur'an together with your Ustadh.
            </p>
          </div>

          <div className="animate-fade-in-up-delay2 w-full px-8 pb-8 flex flex-col items-center" style={{ maxWidth: 400, gap: 12 }}>
            {/* Google */}
            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 px-6 font-inter font-semibold text-sm transition-all active:scale-95"
              style={{ backgroundColor: '#0F4C3A', color: '#FAF7F0', boxShadow: '0 2px 16px rgba(15,76,58,0.25)' }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </a>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(15,76,58,0.12)' }} />
              <span className="text-xs" style={{ color: 'rgba(15,76,58,0.35)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(15,76,58,0.12)' }} />
            </div>

            {/* Username */}
            <button
              onClick={() => reset('username-choose')}
              className="w-full flex items-center justify-center rounded-2xl py-4 px-6 font-inter font-semibold text-sm transition-all active:scale-95"
              style={{ backgroundColor: 'transparent', color: '#0F4C3A', border: '1.5px solid rgba(15,76,58,0.25)' }}
            >
              Continue with Username
            </button>

            <p className="text-center text-[11px] mt-1" style={{ color: 'rgba(15,76,58,0.35)' }}>
              By continuing you agree to our Terms of Service & Privacy Policy
            </p>
            <p className="font-inter text-xs tracking-[0.22em] uppercase font-bold mt-2" style={{ color: '#B8862A' }}>
              Read · Recite · Reflect
            </p>
          </div>
        </>
      )}

      {/* ── Choose: create or sign in ─────────────────────── */}
      {view === 'username-choose' && (
        <div className="flex-1 flex flex-col w-full px-8 pt-14 pb-8" style={{ maxWidth: 400, margin: '0 auto', gap: 0 }}>
          <button onClick={() => reset('home')} className="flex items-center gap-1 mb-8 self-start" style={{ color: 'rgba(15,76,58,0.5)' }}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <p className="font-amiri text-4xl mb-1" style={{ color: '#B8862A' }} lang="ar">حفظ</p>
          <h2 className="font-inter font-bold text-xl mb-1" style={{ color: '#0F4C3A' }}>The Hifz App</h2>
          <p className="text-sm mb-10" style={{ color: 'rgba(15,76,58,0.55)' }}>Sign in or create a new account.</p>

          <div className="flex flex-col" style={{ gap: 12 }}>
            <button
              onClick={() => reset('create')}
              className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95"
              style={{ backgroundColor: '#0F4C3A', color: '#FAF7F0' }}
            >
              Create an account
            </button>
            <button
              onClick={() => reset('signin')}
              className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95"
              style={{ backgroundColor: 'transparent', color: '#0F4C3A', border: '1.5px solid rgba(15,76,58,0.25)' }}
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {/* ── Create account ────────────────────────────────── */}
      {view === 'create' && (
        <div className="flex-1 flex flex-col w-full px-8 pt-14 pb-8" style={{ maxWidth: 400, margin: '0 auto' }}>
          <button onClick={() => reset('username-choose')} className="flex items-center gap-1 mb-8 self-start" style={{ color: 'rgba(15,76,58,0.5)' }}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <h2 className="font-inter font-bold text-xl mb-1" style={{ color: '#0F4C3A' }}>Create account</h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(15,76,58,0.55)' }}>Choose a username and password.</p>

          <div className="flex flex-col" style={{ gap: 16 }}>
            <InputField label="Your name" value={name} onChange={setName} placeholder="e.g. Abdullah" />
            <InputField
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="e.g. abdullah123"
              hint="Letters, numbers and underscores only. Min 3 characters."
            />
            <InputField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="Min 6 characters"
              hint="At least 6 characters."
              showToggle
              onToggle={() => setShowPassword(p => !p)}
            />

            {error && (
              <p className="text-sm text-center" style={{ color: '#C0392B' }}>{error}</p>
            )}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 mt-2"
              style={{ backgroundColor: '#0F4C3A', color: '#FAF7F0' }}
            >
              {loading ? <Spinner size={18} color="#FAF7F0" /> : 'Create Account'}
            </button>

            <p className="text-center text-xs" style={{ color: 'rgba(15,76,58,0.5)' }}>
              Already have an account?{' '}
              <button onClick={() => reset('signin')} className="font-semibold underline" style={{ color: '#0F4C3A' }}>
                Sign in
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Sign in ───────────────────────────────────────── */}
      {view === 'signin' && (
        <div className="flex-1 flex flex-col w-full px-8 pt-14 pb-8" style={{ maxWidth: 400, margin: '0 auto' }}>
          <button onClick={() => reset('username-choose')} className="flex items-center gap-1 mb-8 self-start" style={{ color: 'rgba(15,76,58,0.5)' }}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <h2 className="font-inter font-bold text-xl mb-1" style={{ color: '#0F4C3A' }}>Sign in</h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(15,76,58,0.55)' }}>Enter your username and password.</p>

          <div className="flex flex-col" style={{ gap: 16 }}>
            <InputField label="Username" value={username} onChange={setUsername} placeholder="Your username" />
            <InputField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="Your password"
              showToggle
              onToggle={() => setShowPassword(p => !p)}
            />

            {error && (
              <p className="text-sm text-center" style={{ color: '#C0392B' }}>{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 mt-2"
              style={{ backgroundColor: '#0F4C3A', color: '#FAF7F0' }}
            >
              {loading ? <Spinner size={18} color="#FAF7F0" /> : 'Sign In'}
            </button>

            <p className="text-center text-xs" style={{ color: 'rgba(15,76,58,0.5)' }}>
              No account yet?{' '}
              <button onClick={() => reset('create')} className="font-semibold underline" style={{ color: '#0F4C3A' }}>
                Create one
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
