/**
 * DawrLog — 30 Juz × 4 quarters progress grid.
 *
 * Student view: read-only — cells show date logged + Ustadh score.
 * Ustadh view: tapping a cell opens a score panel (1–7 scale).
 *
 * Can be accessed standalone (/hifz/dawr) or as a sub-view when Ustadh
 * taps a student (pass studentId + studentName props).
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Grid3x3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { dawrApi, type DawrCell, type DawrGrid } from '../../api/dawr';
import type { Quarter } from '../../api/hifzTasks';
import Spinner from '../../components/Spinner';

/* ── Score color palette (matches server) ─────────────────────── */
const SCORE_COLOURS: Record<number, string> = {
  1: '#C53030', 2: '#E05C00', 3: '#D97706',
  4: '#B8862A', 5: '#0D7264', 6: '#166534', 7: '#0F4C3A',
};
const SCORE_LABELS: Record<number, string> = {
  1: 'Repeat', 2: 'Weak', 3: 'Needs Work',
  4: 'Average', 5: 'Good', 6: 'Very Good', 7: 'Excellent',
};
const QUARTERS: Quarter[] = ['1/4', '1/2', '3/4', 'full'];
const QUARTER_DISPLAY: Record<Quarter, string> = {
  '1/4': '¼', '1/2': '½', '3/4': '¾', 'full': '●',
};

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[m-1]}`;
}

interface Props {
  studentId?:   number;
  studentName?: string;
}

export default function DawrLog({ studentId, studentName }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isUstadh = user?.role === 'ustadh';

  const [grid,    setGrid]    = useState<DawrCell[]>([]);
  const [loading, setLoading] = useState(true);

  // Score panel state (Ustadh)
  const [scoreCell,   setScoreCell]   = useState<DawrCell | null>(null);
  const [scoreValue,  setScoreValue]  = useState<number | null>(null);
  const [scoreComment,setScoreComment]= useState('');
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data: DawrGrid = studentId != null
        ? await dawrApi.studentGrid(studentId)
        : await dawrApi.myGrid();
      setGrid(data.grid);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load Dawr Log');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  /* Build lookup */
  const cellMap: Record<string, DawrCell> = {};
  for (const c of grid) cellMap[`${c.juz}:${c.quarter}`] = c;

  function openScore(cell: DawrCell) {
    if (!isUstadh) return;
    setScoreCell(cell);
    setScoreValue(cell.score);
    setScoreComment(cell.comment ?? '');
  }

  async function saveScore() {
    if (!scoreCell || scoreValue == null || studentId == null) return;
    setSaving(true);
    try {
      await dawrApi.score(scoreCell.juz, scoreCell.quarter as Quarter, studentId, scoreValue, scoreComment || undefined);
      toast.success('Score saved');
      setScoreCell(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>
            Dawr Log{studentName ? ` — ${studentName}` : ''}
          </h1>
          <p className="text-[10px] uppercase tracking-[.2em]" style={{ color: 'var(--c-text-muted)' }}>
            30 Juz · 4 Quarters each
          </p>
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--c-gold-bg)' }}>
          <Grid3x3 className="w-4 h-4" style={{ color: 'var(--c-gold)' }} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-b flex-wrap" style={{ borderColor: 'var(--c-border)' }}>
        {Object.entries(SCORE_LABELS).map(([s, label]) => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: SCORE_COLOURS[Number(s)] }} />
            <span className="text-[9px] font-semibold" style={{ color: 'var(--c-text-muted)' }}>{s} · {label}</span>
          </div>
        ))}
        <span className="ml-auto text-[9px]" style={{ color: 'var(--c-text-faint)' }}>
          ¼ = Quarter · ½ = Half · ¾ = Three-Qtr · ● = Full
        </span>
      </div>

      {/* Score panel (Ustadh) */}
      {scoreCell && (
        <div className="px-4 py-3 border-b flex-shrink-0"
          style={{ backgroundColor: 'var(--c-bg-card)', borderColor: 'var(--c-border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--c-text)' }}>
            Score: Juz {scoreCell.juz} {scoreCell.quarterLabel}
          </p>
          {/* 7-button score grid */}
          <div className="grid gap-1.5 mb-3" style={{ gridTemplateColumns: 'repeat(7,1fr)' }}>
            {([1,2,3,4,5,6,7] as number[]).map(s => (
              <button key={s} onClick={() => setScoreValue(s)}
                className="aspect-square rounded-lg text-sm font-extrabold transition-all active:scale-90 flex items-center justify-center"
                style={{
                  backgroundColor: SCORE_COLOURS[s],
                  color: '#FFF',
                  border: scoreValue === s ? '2.5px solid #FFF' : '2px solid transparent',
                  boxShadow: scoreValue === s ? `0 0 0 2.5px ${SCORE_COLOURS[s]}` : undefined,
                  transform: scoreValue === s ? 'scale(1.08)' : undefined,
                }}>
                {s}
              </button>
            ))}
          </div>
          {scoreValue && (
            <p className="text-[10px] font-semibold text-center mb-2" style={{ color: SCORE_COLOURS[scoreValue] }}>
              {SCORE_LABELS[scoreValue]}
            </p>
          )}
          <textarea
            placeholder="Optional comment…"
            value={scoreComment}
            onChange={e => setScoreComment(e.target.value)}
            rows={2}
            className="w-full rounded-xl px-3 py-2 text-xs resize-none outline-none mb-3"
            style={{ backgroundColor: 'var(--c-bg-subtle)', border: '1px solid var(--c-border-soft)', color: 'var(--c-text)' }}
          />
          <div className="flex gap-2">
            <button onClick={saveScore} disabled={scoreValue == null || saving}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
              style={{ backgroundColor: 'var(--c-green-dark)', color: '#FAF7F0' }}>
              {saving ? 'Saving…' : 'Save Score'}
            </button>
            <button onClick={() => setScoreCell(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: 'var(--c-bg-subtle)', color: 'var(--c-text-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto scroll-container">
        {loading ? (
          <div className="flex justify-center mt-12"><Spinner size={28} color="var(--c-gold)" /></div>
        ) : (
          <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 'max-content' }}>
              {/* Column headers */}
              <thead>
                <tr>
                  <th style={{ minWidth: 36, padding: 4, position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'var(--c-bg)', borderBottom: '1px solid var(--c-border)' }} />
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
                    QUARTERS.map((q, qi) => (
                      <th key={`${juz}-${q}`}
                        style={{
                          minWidth: 38, maxWidth: 38, padding: '3px 2px',
                          textAlign: 'center', verticalAlign: 'bottom',
                          backgroundColor: '#C6EFCE', color: '#1A3A00',
                          border: '1px solid #9BD4A6',
                          borderLeft: qi === 0 ? '2px solid #0F4C3A' : undefined,
                        }}>
                        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'block', fontSize: 7.5, fontWeight: 600, padding: '4px 0', whiteSpace: 'nowrap' }}>
                          {qi === 0 ? `J${juz}` : ''} {QUARTER_DISPLAY[q]}
                        </span>
                      </th>
                    ))
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Date row */}
                <tr>
                  <td style={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'var(--c-bg-card)', padding: '3px 6px', fontSize: 8, fontWeight: 600, color: 'var(--c-text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--c-border)' }}>
                    Date
                  </td>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(juz =>
                    QUARTERS.map((q, qi) => {
                      const cell = cellMap[`${juz}:${q}`];
                      return (
                        <td key={`date-${juz}-${q}`}
                          onClick={() => cell && openScore(cell)}
                          style={{
                            minWidth: 38, maxWidth: 38, height: 28,
                            textAlign: 'center', verticalAlign: 'middle',
                            borderLeft: qi === 0 ? '2px solid #0F4C3A' : '1px solid var(--c-border)',
                            borderBottom: '1px solid var(--c-border)',
                            backgroundColor: cell?.loggedDate ? 'rgba(15,76,58,.10)' : 'var(--c-bg-subtle)',
                            cursor: isUstadh && cell ? 'pointer' : 'default',
                            fontSize: 7, fontWeight: 600, color: 'var(--c-text-muted)',
                            overflow: 'hidden', whiteSpace: 'nowrap',
                          }}>
                          {cell?.loggedDate ? shortDate(cell.loggedDate) : ''}
                        </td>
                      );
                    })
                  )}
                </tr>

                {/* Score row */}
                <tr>
                  <td style={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'var(--c-bg-card)', padding: '3px 6px', fontSize: 8, fontWeight: 600, color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>
                    Score
                  </td>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(juz =>
                    QUARTERS.map((q, qi) => {
                      const cell = cellMap[`${juz}:${q}`];
                      const bg   = cell?.score != null ? SCORE_COLOURS[cell.score] : 'var(--c-bg-card)';
                      return (
                        <td key={`score-${juz}-${q}`}
                          onClick={() => cell && openScore(cell)}
                          style={{
                            minWidth: 38, maxWidth: 38, height: 40,
                            textAlign: 'center', verticalAlign: 'middle',
                            borderLeft: qi === 0 ? '2px solid #0F4C3A' : '1px solid var(--c-border)',
                            backgroundColor: bg,
                            cursor: isUstadh && cell?.loggedDate ? 'pointer' : 'default',
                            transition: 'filter .15s',
                          }}>
                          {cell?.score != null ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <span style={{ fontSize: 15, fontWeight: 800, color: '#FFF', lineHeight: 1 }}>
                                {cell.score}
                              </span>
                              <span style={{ fontSize: 6.5, fontWeight: 600, color: 'rgba(255,255,255,.75)', lineHeight: 1 }}>
                                {SCORE_LABELS[cell.score]?.slice(0,6)}
                              </span>
                            </div>
                          ) : cell?.loggedDate && isUstadh ? (
                            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--c-gold)', margin: 'auto' }} />
                          ) : null}
                        </td>
                      );
                    })
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
