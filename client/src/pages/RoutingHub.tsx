/**
 * RoutingHub — post-login landing screen.
 *
 * Presents two primary tracking pathways:
 *   • نظيرة  Nazira  → existing class-based Nazira tracking system
 *   • حفظ    Hifz    → new Hifz memorisation module
 */
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Map, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTour } from '../contexts/TourContext';

/* ── Track card ──────────────────────────────────────────── */
interface TrackCardProps {
  arabicLabel: string;
  englishLabel: string;
  description: string;
  ctaText: string;
  accentColor: string;
  iconBg: string;
  ctaBg: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function TrackCard({
  arabicLabel,
  englishLabel,
  description,
  ctaText,
  accentColor,
  iconBg,
  ctaBg,
  icon,
  onClick,
}: TrackCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative w-full rounded-3xl overflow-hidden text-left transition-all duration-150 active:scale-[0.97]"
      style={{
        backgroundColor: 'var(--c-bg-card)',
        border: '1px solid var(--c-border)',
        minHeight: 168,
      }}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: accentColor }}
      />

      <div className="pl-6 pr-4 py-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              lang="ar"
              className="text-[32px] font-bold leading-none"
              style={{ color: accentColor, fontFamily: "'Amiri', serif" }}
            >
              {arabicLabel}
            </p>
            <p className="text-[15px] font-bold mt-1" style={{ color: 'var(--c-text)' }}>
              {englishLabel}
            </p>
          </div>

          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: iconBg }}
          >
            {icon}
          </div>
        </div>

        {/* Description */}
        <p className="text-[13px] mt-3 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
          {description}
        </p>

        {/* CTA chip */}
        <div
          className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-xl"
          style={{ backgroundColor: ctaBg, color: accentColor }}
        >
          {ctaText}
          <ChevronRight className="w-3 h-3" strokeWidth={3} />
        </div>
      </div>
    </button>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function RoutingHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open: openTour } = useTour();

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div
      className="min-h-screen flex flex-col pb-layout"
      style={{ backgroundColor: 'var(--c-bg)' }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-5 pt-safe pb-1">
        <div className="pt-5" />

        <p
          className="text-[10px] uppercase tracking-[0.28em]"
          style={{ color: 'var(--c-text-muted)' }}
        >
          Assalamu Alaykum
        </p>

        <h1
          className="text-[28px] font-bold mt-0.5 leading-tight"
          style={{ color: 'var(--c-text)' }}
        >
          {firstName}
        </h1>

        <p className="text-sm mt-1.5" style={{ color: 'var(--c-text-muted)' }}>
          What are you tracking today?
        </p>
      </div>

      {/* ── Divider ────────────────────────────────────────── */}
      <div
        className="mx-5 mt-4 mb-5 h-px"
        style={{ backgroundColor: 'var(--c-border)' }}
      />

      {/* ── Cards ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 px-4">
        {/* Nazira */}
        <TrackCard
          arabicLabel="نظيرة"
          englishLabel="Nazira"
          description="Log daily recitation status · Track each page by colour · View Juz progress and history logs"
          ctaText="Track Nazira"
          accentColor="#00D4A0"
          iconBg="#0F6650"
          ctaBg="rgba(0,212,160,0.12)"
          icon={<BookOpen className="w-5 h-5" style={{ color: '#00D4A0' }} />}
          onClick={() => navigate('/classes')}
        />

        {/* Hifz */}
        <TrackCard
          arabicLabel="حفظ"
          englishLabel="Hifz"
          description="Log Sabaq · Sabaq Para · Dawr by Juz quarter · Ustadh scoring and performance grading"
          ctaText="Track Hifz"
          accentColor="var(--c-gold)"
          iconBg="var(--c-gold-bg)"
          ctaBg="var(--c-gold-bg)"
          icon={<GraduationCap className="w-5 h-5" style={{ color: 'var(--c-gold)' }} />}
          onClick={() => navigate('/hifz')}
        />
      </div>

      {/* ── Guide Me link ──────────────────────────────────── */}
      <div className="px-4 pt-5 pb-2 flex justify-center">
        <button
          onClick={openTour}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
          style={{
            backgroundColor: 'var(--c-bg-subtle)',
            color: 'var(--c-text-muted)',
            border: '1px solid var(--c-border-soft)',
          }}
        >
          <Map className="w-3.5 h-3.5" />
          Guide Me
        </button>
      </div>
    </div>
  );
}
