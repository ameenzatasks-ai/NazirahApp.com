/* ── Arch illustration ───────────────────────────────────────────
   A minimal Islamic pointed-arch SVG with a Quran on a rahl
   (book stand) inside — inspired by the Nazirah logo.
   ─────────────────────────────────────────────────────────────── */
function ArchIllustration() {
  return (
    <svg
      viewBox="0 0 220 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
    >
      {/* Arch outline */}
      <path
        d="M30 260 L30 120 Q30 20 110 10 Q190 20 190 120 L190 260 Z"
        stroke="#0F4C3A"
        strokeWidth="3"
        fill="#FAF7F0"
      />
      {/* Inner arch decorative inset */}
      <path
        d="M44 252 L44 124 Q44 36 110 26 Q176 36 176 124 L176 252 Z"
        stroke="#B8862A"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 4"
      />

      {/* Rahl (book stand) legs */}
      <line x1="80" y1="210" x2="68" y2="240" stroke="#0F4C3A" strokeWidth="3" strokeLinecap="round" />
      <line x1="140" y1="210" x2="152" y2="240" stroke="#0F4C3A" strokeWidth="3" strokeLinecap="round" />
      {/* Rahl crossbar */}
      <line x1="70" y1="230" x2="150" y2="230" stroke="#0F4C3A" strokeWidth="2.5" strokeLinecap="round" />

      {/* Rahl top rest */}
      <path
        d="M72 210 Q110 202 148 210"
        stroke="#0F4C3A"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Quran book — left page */}
      <path
        d="M72 210 Q90 170 110 168"
        stroke="#0F4C3A"
        strokeWidth="2.5"
        fill="rgba(184,134,42,0.15)"
        strokeLinejoin="round"
      />
      <path
        d="M72 210 L80 175 Q95 162 110 168 Z"
        fill="rgba(184,134,42,0.18)"
        stroke="#0F4C3A"
        strokeWidth="1.5"
      />
      {/* Quran book — right page */}
      <path
        d="M148 210 L140 175 Q125 162 110 168 Z"
        fill="rgba(184,134,42,0.18)"
        stroke="#0F4C3A"
        strokeWidth="1.5"
      />
      {/* Book spine */}
      <line x1="110" y1="168" x2="110" y2="210" stroke="#0F4C3A" strokeWidth="2" strokeLinecap="round" />

      {/* Text lines on left page */}
      <line x1="84" y1="186" x2="106" y2="183" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="86" y1="193" x2="107" y2="190" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="88" y1="200" x2="107" y2="197" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Text lines on right page */}
      <line x1="114" y1="183" x2="136" y2="186" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="114" y1="190" x2="135" y2="193" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="114" y1="197" x2="133" y2="200" stroke="#0F4C3A" strokeWidth="1" strokeLinecap="round" opacity="0.5" />

      {/* Gold diamond top accent */}
      <polygon points="110,2 116,10 110,18 104,10" fill="#B8862A" />
      {/* Small side accent dots */}
      <circle cx="30" cy="260" r="4" fill="#B8862A" />
      <circle cx="190" cy="260" r="4" fill="#B8862A" />
    </svg>
  );
}

/* ── Gold diamond divider ────────────────────────────────────── */
function GoldDivider() {
  return (
    <div className="flex items-center gap-2 justify-center">
      <div style={{ width: 40, height: 1, backgroundColor: '#B8862A', opacity: 0.4 }} />
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <polygon points="4,0 8,4 4,8 0,4" fill="#B8862A" />
      </svg>
      <div style={{ width: 40, height: 1, backgroundColor: '#B8862A', opacity: 0.4 }} />
    </div>
  );
}

export default function WelcomeScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center pt-safe pb-safe"
      style={{ backgroundColor: '#FAF7F0' }}
    >
      {/* Top branding */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4">
        {/* Gold Arabic نَظِيرَة calligraphy */}
        <p
          className="font-amiri leading-none animate-fade-in-up"
          style={{
            color: '#B8862A',
            fontSize: 76,
            textShadow: '0 1px 0 rgba(184,134,42,0.15)',
          }}
          lang="ar"
        >
          ناظره
        </p>

        {/* Arch illustration */}
        <div className="animate-fade-in-up-delay" style={{ width: 160, height: 188 }}>
          <ArchIllustration />
        </div>

        {/* App name */}
        <div className="animate-fade-in-up-delay2 flex flex-col items-center gap-3">
          <h1
            className="font-inter font-bold tracking-[0.18em] uppercase text-sm"
            style={{ color: '#0F4C3A' }}
          >
            The Nazirah App
          </h1>
          <GoldDivider />
          <p
            className="font-inter text-xs tracking-[0.22em] uppercase"
            style={{ color: '#B8862A' }}
          >
            Read · Recite · Reflect
          </p>
        </div>
      </div>

      {/* Auth button */}
      <div
        className="animate-fade-in-up-delay2 w-full px-8 pb-12 flex flex-col items-center gap-3"
        style={{ maxWidth: 380 }}
      >
        <a
          href="/api/auth/google"
          className="w-full flex items-center justify-center gap-3 rounded-[28px] py-3.5 px-6 font-inter font-semibold text-sm transition-all active:scale-95"
          style={{
            backgroundColor: '#0F4C3A',
            color: '#FAF7F0',
            maxWidth: 320,
            boxShadow: '0 2px 12px rgba(15,76,58,0.25)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </a>

        <p className="text-center text-xs mt-1" style={{ color: 'rgba(15,76,58,0.35)' }}>
          By continuing you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
