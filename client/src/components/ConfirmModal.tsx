import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Spinner from './Spinner';

interface Props {
  open: boolean;
  title?: string;
  /** The exact prompt text shown to the user. */
  message: string;
  /** Label for the confirm button (default "Confirm"). */
  confirmLabel?: string;
  /** Label for the cancel button (default "Cancel"). */
  cancelLabel?: string;
  /** Set true to style the confirm button as destructive (red). */
  destructive?: boolean;
  /** Disables both buttons while async work is in flight and spins the confirm. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered confirmation modal. Use for mandatory yes/no decisions
 * (e.g. adding or removing a Nazirah log).
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape key cancels
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmBg = destructive ? 'var(--c-red)' : 'var(--c-green-dark)';
  const confirmFg = destructive ? '#FFFFFF' : '#FAF7F0';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center px-5"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={() => { if (!busy) onCancel(); }}
        role="dialog"
        aria-modal="true"
      >
        {/* Card */}
        <div
          className="w-full rounded-2xl shadow-xl overflow-hidden animate-fade-in-up"
          style={{
            backgroundColor: 'var(--c-bg-card)',
            maxWidth: 360,
            border: '1px solid var(--c-border)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 flex flex-col items-center gap-3 text-center">
            {/* Warning icon */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: destructive ? 'var(--c-red-bg)' : 'var(--c-gold-bg)',
              }}
            >
              <AlertTriangle
                className="w-6 h-6"
                style={{ color: destructive ? 'var(--c-red)' : 'var(--c-gold)' }}
              />
            </div>

            {title && (
              <h3 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>
                {title}
              </h3>
            )}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
              {message}
            </p>
          </div>

          {/* Buttons */}
          <div
            className="flex border-t"
            style={{ borderColor: 'var(--c-border)' }}
          >
            <button
              onClick={onCancel}
              disabled={busy}
              className="flex-1 py-3.5 text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ color: 'var(--c-text-muted)' }}
            >
              {cancelLabel}
            </button>
            <div style={{ width: 1, backgroundColor: 'var(--c-border)' }} />
            <button
              onClick={onConfirm}
              disabled={busy}
              className="flex-1 py-3.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ color: confirmBg }}
            >
              {busy
                ? <Spinner size={14} color={confirmBg} />
                : <span style={{ color: confirmBg }}>{confirmLabel}</span>
              }
            </button>
          </div>

          {/* Hidden helper to surface the destructive accent visually behind the button */}
          <style>{`
            :where(.cm-confirm-bg) { background: ${confirmBg}; color: ${confirmFg}; }
          `}</style>
        </div>
      </div>
    </>
  );
}
