/**
 * WelcomeScreen — matches The Hifz App design prototype.
 *
 * Layout (top → bottom, evenly spaced, no overlapping):
 *   1. Arch illustration with Quran rahl
 *   2. حفظ calligraphy in gold
 *   3. Gold divider line
 *   4. "THE HIFZ APP" title
 *   5. Description paragraph
 *   6. "Continue with Google" button
 *   7. "or" divider
 *   8. "Log in with email" button (outline)
 *   9. Terms text
 *  10. "READ · RECITE · REFLECT" tagline
 */

/* ── Arch illustration ───────────────────────────────────────────
   A minimal Islamic pointed-arch SVG with a Quran on a rahl
   (book stand) inside.
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

/* ── Gold line divider ───────────────────────────────────────── */
function GoldDivider() {
  return (
    <div className="flex items-center gap-2.5 justify-center">
      <div style={{ width: 50, height: 1, backgroundColor: '#B8862A', opacity: 0.35 }} />
      <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true">
        <polygon points="3,0 6,3 3,6 0,3" fill="#B8862A" opacity="0.5" />
      </svg>
      <div style={{ width: 50, height: 1, backgroundColor: '#B8862A', opacity: 0.35 }} />
    </div>
  );
}

export default function WelcomeScreen() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto pt-safe pb-safe"
      style={{ backgroundColor: '#FAF7F0' }}
    >
      {/* Top: Arch + Calligraphy + Title + Description — centered vertically */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8" style={{ gap: 20 }}>
        {/* Arch illustration */}
        <div className="animate-fade-in-up" style={{ width: 140, height: 165 }}>
          <ArchIllustration />
        </div>

        {/* حفظ calligraphy */}
        <p
          className="font-amiri leading-none animate-fade-in-up"
          style={{
            color: '#B8862A',
            fontSize: 72,
            textShadow: '0 1px 0 rgba(184,134,42,0.15)',
            marginTop: -4,
          }}
          lang="ar"
        >
          حفظ
        </p>

        {/* Gold divider */}
        <div className="animate-fade-in-up-delay">
          <GoldDivider />
        </div>

        {/* App name */}
        <h1
          className="font-inter font-bold tracking-[0.22em] uppercase text-sm animate-fade-in-up-delay"
          style={{ color: '#0F4C3A' }}
        >
          The Hifz App
        </h1>

        {/* Description */}
        <p
          className="text-sm leading-relaxed animate-fade-in-up-delay2 max-w-xs"
          style={{ color: 'rgba(15,76,58,0.55)' }}
        >
          Track your daily Sabaq, Sabaq Para & Dawr — memorise the Qur'an together with your Ustadh.
        </p>
      </div>

      {/* Bottom: Auth buttons */}
      <div
        className="animate-fade-in-up-delay2 w-full px-8 pb-8 flex flex-col items-center"
        style={{ maxWidth: 400, gap: 12 }}
      >
        {/* Continue with Google */}
        <a
          href="/api/auth/google"
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 px-6 font-inter font-semibold text-sm transition-all active:scale-95"
          style={{
            backgroundColor: '#0F4C3A',
            color: '#FAF7F0',
            boxShadow: '0 2px 16px rgba(15,76,58,0.25)',
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

        {/* "or" divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(15,76,58,0.12)' }} />
          <span className="text-xs" style={{ color: 'rgba(15,76,58,0.35)' }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(15,76,58,0.12)' }} />
        </div>

        {/* Log in with email — placeholder, Google-only for now */}
        <button
          className="w-full flex items-center justify-center rounded-2xl py-4 px-6 font-inter font-semibold text-sm transition-all active:scale-95 opacity-40 cursor-not-allowed"
          style={{
            backgroundColor: 'transparent',
            color: '#0F4C3A',
            border: '1.5px solid rgba(15,76,58,0.18)',
          }}
          disabled
          title="Only Google sign-in is available right now"
        >
          Log in with email
        </button>

        <p className="text-center text-[11px]" style={{ color: 'rgba(15,76,58,0.4)', marginTop: -4 }}>
          Google sign-in only for now
        </p>

        {/* Terms text */}
        <p className="text-center text-[11px] mt-1" style={{ color: 'rgba(15,76,58,0.35)' }}>
          By continuing you agree to our Terms of Service & Privacy Policy
        </p>

        {/* Tagline */}
        <p
          className="font-inter text-xs tracking-[0.22em] uppercase font-bold mt-2"
          style={{ color: '#B8862A' }}
        >
          Read · Recite · Reflect
        </p>
      </div>
    </div>
  );
}
