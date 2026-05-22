/**
 * NazirahLogDetail — shows one saved Nazira log (pages grouped by color).
 *
 * Route params:
 *   classId    — context (for back navigation)
 *   logId      — the log to show
 *   studentId? — if present, Ustadh viewing a student's log
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { nazirahApi, type NazirahLogDetail as LogDetail } from '../../api/nazirah';
import GroupedPages from '../../hifz/GroupedPages';
import Spinner from '../../components/Spinner';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${d} ${months[m - 1]} ${y}`;
}

export default function NazirahLogDetailPage() {
  const { logId, studentId } = useParams<{
    classId: string; logId: string; studentId?: string;
  }>();
  const navigate = useNavigate();
  const lId = Number(logId);
  const sId = studentId ? Number(studentId) : undefined;

  const [log, setLog] = useState<LogDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = sId !== undefined
        ? await nazirahApi.getStudentLog(lId, sId)
        : await nazirahApi.getLog(lId);
      setLog(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load log');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [lId, sId, navigate]);

  useEffect(() => { load(); }, [load]);

  const goBack = () => navigate(-1);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--c-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pb-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--c-bg-nav)', borderColor: 'var(--c-border)' }}
      >
        <button
          onClick={goBack}
          className="p-1.5 -ml-1.5 rounded-lg transition-all active:scale-90"
          style={{ color: 'var(--c-text-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base truncate" style={{ color: 'var(--c-text)' }}>
            Nazira Status
          </h1>
          {log && (
            <p className="text-[11px] flex items-center gap-1" style={{ color: 'var(--c-text-muted)' }}>
              <Calendar className="w-3 h-3" />
              {formatDate(log.logDate)}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-layout scroll-container">
        {loading ? (
          <div className="flex justify-center mt-12">
            <Spinner size={28} color="var(--c-gold)" />
          </div>
        ) : !log ? null : (
          <GroupedPages
            grouped={log.grouped}
            totalTracked={log.pageCount}
          />
        )}
      </div>
    </div>
  );
}
