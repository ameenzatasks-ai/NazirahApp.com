/**
 * NazirahDatePicker — step 1 of the Track your Nazirah flow.
 *
 * Student selects a date, then presses "Track your Nazira" to open
 * the full JuzGrid with that date pre-loaded for saving.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronRight } from 'lucide-react';

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${d} ${months[m - 1]} ${y}`;
}

export default function NazirahDatePicker() {
  const navigate = useNavigate();
  const [date, setDate] = useState(isoToday);

  const minDate = isoDaysAgo(14);
  const maxDate = isoToday();

  function proceed() {
    navigate(`/nazirah?date=${date}`);
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--c-bg)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}
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

      {/* Body */}
      <div className="flex-1 flex flex-col px-5 py-8 max-w-md mx-auto w-full">

        {/* Section heading */}
        <p
          className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-4"
          style={{ color: 'var(--c-text-muted)' }}
        >
          Select the date
        </p>

        {/* Date card */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ border: '1px solid var(--c-border)' }}
        >
          {/* Green header showing selected date */}
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{ backgroundColor: 'var(--c-green-dark)' }}
          >
            <CalendarDays className="w-5 h-5 flex-shrink-0" style={{ color: '#00D4A0' }} />
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ color: 'rgba(0,212,160,0.65)' }}
              >
                Selected date
              </p>
              <p className="text-base font-bold mt-0.5" style={{ color: '#00D4A0' }}>
                {formatDisplay(date)}
              </p>
            </div>
          </div>

          {/* Picker */}
          <div className="px-4 py-4" style={{ backgroundColor: 'var(--c-bg-subtle)' }}>
            <input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-3 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--c-bg-card)',
                color: 'var(--c-text)',
                border: '1px solid var(--c-border-soft)',
              }}
            />
            <p className="text-[11px] mt-2" style={{ color: 'var(--c-text-faint)' }}>
              You can log up to 14 days back
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={proceed}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
          style={{ backgroundColor: 'var(--c-green-dark)', color: '#FAF7F0' }}
        >
          Track your Nazira
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <p
          className="text-center text-[11px] mt-4"
          style={{ color: 'var(--c-text-faint)' }}
        >
          You'll see the full Quran grid on the next screen
        </p>
      </div>
    </div>
  );
}
