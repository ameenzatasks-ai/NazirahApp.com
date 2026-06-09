/**
 * StudentDawrLog — route wrapper that extracts studentId from URL params
 * and renders DawrLog with the student context.
 *
 * Route: /classes/:classId/student/:studentId/dawr
 */
import { useParams, useSearchParams } from 'react-router-dom';
import DawrLog from './DawrLog';

export default function StudentDawrLog() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  const [search] = useSearchParams();
  const name = search.get('name') ?? undefined;

  return <DawrLog studentId={Number(studentId)} studentName={name} classIdProp={classId ? Number(classId) : undefined} />;
}
