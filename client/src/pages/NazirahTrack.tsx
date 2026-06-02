/**
 * NazirahTrack — full JuzGrid view.
 *
 * Accessible two ways:
 *   1. Via /nazirah?date=YYYY-MM-DD  — came from NazirahDatePicker; date is
 *      pre-loaded into SaveNazirahSheet so the student doesn't pick it twice.
 *   2. Via /nazirah (no param)        — direct access from the bottom nav;
 *      SaveNazirahSheet defaults to today.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import JuzGrid from '../hifz/JuzGrid';
import SaveNazirahSheet from '../hifz/SaveNazirahSheet';

export default function NazirahTrack() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  // Date pre-selected in the date picker (may be undefined for direct access)
  const preselectedDate = searchParams.get('date') ?? undefined;

  const [saveOpen, setSaveOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>
            Track your Nazirah
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--c-text-muted)' }}>
            ناظره
          </p>
        </div>
      </div>

      {/* JuzGrid fills remaining height */}
      <div className="flex-1 min-h-0">
        <JuzGrid
          onOpenAudit={() => navigate('/nazirah/audit')}
          onSaveNazira={isStudent ? () => setSaveOpen(true) : undefined}
        />
      </div>

      {isStudent && (
        <SaveNazirahSheet
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          initialDate={preselectedDate}
        />
      )}
    </div>
  );
}
