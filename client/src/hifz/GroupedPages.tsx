/**
 * GroupedPages — displays page numbers grouped by their color status.
 *
 * Layout: one card per status (only non-empty ones), showing the status
 * name + icon at the top and a wrapping chip row of page numbers below.
 *
 * Used in:
 *   • StudentDetail → "Overview" tab (current live status)
 *   • NazirahLogDetail → saved snapshot
 */
import type { PageStatus } from '../../../shared/juz-map';
import { PALETTE, ALL_STATUSES } from './palette';

interface Props {
  /** Pages grouped by status. Only statuses with ≥1 page are shown. */
  grouped: Partial<Record<PageStatus, number[]>>;
  /** Optional total tracked page count shown in the header. */
  totalTracked?: number;
}

export default function GroupedPages({ grouped, totalTracked }: Props) {
  const nonEmpty = ALL_STATUSES.filter(s => (grouped[s]?.length ?? 0) > 0);

  if (nonEmpty.length === 0) {
    return (
      <p className="text-center text-sm py-12" style={{ color: 'var(--c-text-faint)' }}>
        No pages have a status set yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {totalTracked !== undefined && (
        <p className="text-[11px]" style={{ color: 'var(--c-text-faint)' }}>
          {totalTracked} of 604 pages tracked
        </p>
      )}

      {nonEmpty.map(status => {
        const p = PALETTE[status];
        const Icon = p.icon;
        const pages = grouped[status]!;

        return (
          <div
            key={status}
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--c-bg-card)', border: '1px solid var(--c-border)' }}
          >
            {/* Status header */}
            <div
              className="flex items-center gap-2.5 px-4 py-2.5"
              style={{ backgroundColor: p.fill }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: p.iconBg }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: p.iconColor }} strokeWidth={2.25} />
              </div>
              <span className="font-bold text-sm flex-1" style={{ color: p.text }}>
                {p.label}
              </span>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: p.iconBg, color: p.iconColor }}
              >
                {pages.length}
              </span>
            </div>

            {/* Page chips */}
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
              {pages.map(pg => (
                <span
                  key={pg}
                  className="text-xs font-semibold px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: p.fill + '22',  // 13% opacity fill tint
                    color: 'var(--c-text)',
                    border: `1px solid ${p.accent}44`,
                  }}
                >
                  {pg}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
