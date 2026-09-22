import { Link } from 'react-router-dom';
import type { ProfessorCourse, StudentCourse } from '../../api/types';
import { percent, pluralise } from '../../lib/format';
import { accentClasses } from '../../lib/status';
import { cx } from '../../lib/cx';
import { ProgressBar, ProgressRing } from '../ui';

export function StudentCourseCard({ course }: { course: StudentCourse }) {
  const accent = accentClasses(course.accent);
  const done = percent(course.done, course.assignmentCount);

  return (
    <Link
      to={'/student/courses/' + course.id}
      className="card group relative block overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className={cx('absolute inset-x-0 top-0 h-1', accent.bar)} aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cx('font-mono text-[0.72rem] font-medium uppercase tracking-wide', accent.text)}>
            {course.code}
          </p>
          <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug text-ink">
            {course.title}
          </h3>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{course.professorName}</p>
        </div>
        <ProgressRing value={done} size={52} thickness={5} caption="handed in" />
      </div>

      <div className="mt-5">
        <ProgressBar
          value={done}
          tone={done === 100 ? 'acknowledged' : 'primary'}
          label={course.code + ' submissions handed in'}
        />
        <div className="mt-2.5 flex items-center justify-between text-[0.76rem]">
          <span className="text-ink-soft">
            {pluralise(course.done, 'assignment')} of {course.assignmentCount} handed in
          </span>
          {course.pending > 0 ? (
            <span className="font-semibold text-status-pending">{course.pending} open</span>
          ) : (
            <span className="font-semibold text-status-acknowledged">Nothing open</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProfessorCourseCard({ course }: { course: ProfessorCourse }) {
  const accent = accentClasses(course.accent);
  const done = percent(course.submitted, course.studentCount * Math.max(course.assignmentCount, 1));
  const ackRate = percent(course.acknowledged, Math.max(course.submitted, 1));

  return (
    <Link
      to={'/professor/courses/' + course.id}
      className="card relative block overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className={cx('absolute inset-x-0 top-0 h-1', accent.bar)} aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cx('font-mono text-[0.72rem] font-medium uppercase tracking-wide', accent.text)}>
            {course.code}
          </p>
          <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug text-ink">
            {course.title}
          </h3>
          <p className="mt-1 text-[0.82rem] text-ink-soft">
            {pluralise(course.studentCount, 'student')} / {pluralise(course.assignmentCount, 'assignment')}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold leading-none text-ink">{ackRate}%</p>
          <p className="mt-1 text-[0.72rem] text-ink-faint">of hand ins acknowledged</p>
        </div>
      </div>

      <div className="mt-5">
        <ProgressBar value={done} label={course.code + ' submission rate'} />
        <div className="mt-2.5 flex items-center justify-between text-[0.76rem]">
          <span className="text-ink-soft">
            {course.submitted} handed in / {course.acknowledged} acknowledged
          </span>
          {course.pending > 0 ? (
            <span className="font-semibold text-status-pending">{course.pending} to review</span>
          ) : (
            <span className="font-semibold text-status-acknowledged">All clear</span>
          )}
        </div>
      </div>
    </Link>
  );
}
