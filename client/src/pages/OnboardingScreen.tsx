import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';

export default function OnboardingScreen() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<'student' | 'ustadh' | null>(null);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  async function pickRole(role: 'student' | 'ustadh') {
    setLoading(role);
    try {
      const { user: updated } = await authApi.setRole(role);
      setUser(updated);
      navigate('/classes', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set role');
      setLoading(null);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 pt-safe pb-safe"
      style={{ backgroundColor: '#FAF7F0' }}
    >
      <div className="text-center mb-10 animate-fade-in-up">
        {/* Gold Arabic نَظِيرَة */}
        <p
          className="font-amiri leading-none mb-3"
          style={{ color: '#B8862A', fontSize: 56 }}
          lang="ar"
        >
          نَظِيرَة
        </p>

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
          How are you using The Nazirah App?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full animate-fade-in-up-delay" style={{ maxWidth: 360 }}>
        {[
          {
            role: 'student' as const,
            icon: BookOpen,
            title: 'Student',
            subtitle: 'I am learning Nazirah',
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
