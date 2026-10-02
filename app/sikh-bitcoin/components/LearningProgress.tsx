import type { Course, Lesson } from '../../data/courses';

/** Server-rendered and usable without scripts; learning.js adds optional local tracking. */
export function LearningProgress({ course, lessons, currentSlug }: {
  course: Course; lessons: Lesson[]; currentSlug?: string;
}) {
  return (
    <section
      className="my-8 rounded-xl border border-border p-5 sm:p-7"
      aria-label={`${course.title} learning progress`}
      data-learning-progress
      data-course-id={course.id}
      data-lesson-slug={currentSlug}
      data-lessons={JSON.stringify(lessons.map(({ slug, title }) => ({ slug, title })))}
    >
      <h2 className="!mt-0 !text-2xl">Your learning, at your pace</h2>
      <p data-learning-fallback>
        Read every lesson freely. Optional progress tracking needs JavaScript and browser storage;
        it does not require an account or wallet.
      </p>
      <div data-learning-controls hidden>
        <p data-learning-status aria-live="polite" aria-atomic="true" />
        <progress data-learning-meter max={lessons.length} value={0} className="my-3 w-full accent-primary" aria-label="Lessons marked complete" />
        <div className="my-4 flex flex-wrap gap-3">
          {currentSlug && <button type="button" className="launch-button" data-learning-toggle aria-pressed="false">Mark this lesson complete</button>}
          <button type="button" className="rounded-lg border border-border px-4 py-3 text-sm" data-learning-export>Export this course’s progress</button>
          <button type="button" className="rounded-lg border border-border px-4 py-3 text-sm" data-learning-reset>Reset this course</button>
        </div>
        <div data-learning-confirm hidden>
          <p>Remove the saved completion marks for this course on this browser? Other courses will stay unchanged.</p>
          <div className="flex flex-wrap gap-4">
            <button type="button" className="rounded-lg border border-border px-4 py-3 text-sm" data-learning-reset-confirm>Yes, reset this course</button>
            <button type="button" className="rounded-lg border border-border px-4 py-3 text-sm" data-learning-reset-cancel>Keep my progress</button>
          </div>
        </div>
        <p className="!text-sm" data-learning-storage-note>
          Saved only in this browser for this website address. Clearing storage, changing device or using a
          different gateway may lose these marks. No sync, grading or credential; nothing is sent to us.
          The export is a record for you, not a file this site can import.
        </p>
      </div>
    </section>
  );
}
