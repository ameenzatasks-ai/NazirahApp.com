import { useRef, useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const deltaY = useRef(0);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e: React.TouchEvent) => {
    deltaY.current = e.touches[0].clientY - startY.current;
    if (deltaY.current > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY.current}px)`;
    }
  };
  const onTouchEnd = () => {
    if (deltaY.current > 80) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    deltaY.current = 0;
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl animate-slide-up"
        style={{
          backgroundColor: 'var(--c-bg-card)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--c-border-soft)' }} />
        </div>

        {title && (
          <div className="px-5 pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--c-border)' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--c-text)' }}>{title}</h2>
          </div>
        )}

        <div className="overflow-y-auto flex-1 scroll-container">
          {children}
        </div>
      </div>
    </>
  );
}
