/**
 * AuditPage — wraps AuditTimeline and decides whether to view the current
 * user's own audit log or (if studentId is in the URL) a specific student's.
 */
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AuditTimeline from '../hifz/AuditTimeline';
import { classesApi } from '../api/classes';

export default function AuditPage() {
  const { classId, studentId } = useParams<{ classId: string; studentId?: string }>();
  const sId = studentId ? Number(studentId) : undefined;
  const [studentName, setStudentName] = useState<string | undefined>();

  // If viewing a specific student, fetch their name for the header title.
  useEffect(() => {
    if (!sId || !classId) return;
    classesApi.getStudentPages(Number(classId), sId)
      .then(res => setStudentName(res.student.name))
      .catch(() => { /* leave default title */ });
  }, [classId, sId]);

  return <AuditTimeline studentId={sId} title={studentName ? `${studentName} · Audit` : 'Audit log'} />;
}
