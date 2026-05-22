import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';
import { authApi } from '../api/auth';

export default function AuthCallback() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode double-invoke in dev
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const { user } = await authApi.me();
        setUser(user);
        // Navigate IMMEDIATELY based on the freshly fetched user —
        // don't wait for a layout re-render to catch up.
        if (!user.role) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/classes', { replace: true });
        }
      } catch {
        navigate('/welcome', { replace: true });
      }
    })();
  }, [setUser, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#FAF7F0' }}
    >
      <div className="flex flex-col items-center gap-4">
        <p
          className="font-amiri leading-none mb-2"
          style={{ color: '#B8862A', fontSize: 48 }}
          lang="ar"
        >
          نَظِيرَة
        </p>
        <Spinner size={28} color="#B8862A" />
        <p
          className="font-inter text-xs tracking-[0.20em] uppercase"
          style={{ color: 'rgba(15,76,58,0.6)' }}
        >
          Signing you in…
        </p>
      </div>
    </div>
  );
}
