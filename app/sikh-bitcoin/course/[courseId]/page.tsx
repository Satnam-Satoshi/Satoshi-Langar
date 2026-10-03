import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageIntro } from '../../../components/PageIntro';
import { courses, getCourseLessons } from '../../../data/courses';
import { LearningProgress } from '../../components/LearningProgress';

type CoursePageProps = { params: Promise<{ courseId: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return courses.map(({ id }) => ({ courseId: id })); }
export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = courses.find(({ id }) => id === courseId);
  if (!course) notFound();
  return { title: `${course.title} · Sikh Bitcoin`, description: course.description };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;
  const course = courses.find(({ id }) => id === courseId);
  if (!course) notFound();
  const courseLessons = getCourseLessons(course.id);
  return (
    <main>
      <PageIntro eyebrow={`Sikh Bitcoin · ${course.level} · 21 lessons`} title={course.title} description={course.description} />
      <section className="reading-content wide-content" aria-labelledby="course-contents">
        <nav aria-label="Learning section"><a href="/sikh-bitcoin/">← All three courses</a></nav>
        <p className="status-note">{course.duration}. {course.prerequisite}</p>
        <h2>What you will be able to do</h2>
        <p>{course.outcome}</p>
        <p>Read in order or explore a question. Exercises and quizzes work without an account; no answers are sent to us.</p>
        <a className="launch-button" href={`/sikh-bitcoin/${courseLessons[0].slug}/`}>Start lesson 1 <span aria-hidden="true">→</span></a>
        <LearningProgress course={course} lessons={courseLessons} />
        <h2 id="course-contents">Your 21-lesson path</h2>
        <div className="course-list">
          {courseLessons.map((lesson) => (
            <article className="course-row" key={lesson.slug}>
              <span aria-hidden="true">{String(lesson.order).padStart(2, '0')}</span>
              <div>
                <h3 className="!mt-0">{lesson.title}</h3>
                <p>{lesson.description}</p>
                <p className="!text-sm">About {lesson.minutes} minutes with practice <span data-learning-completed={lesson.slug} hidden>· Marked complete</span></p>
              </div>
              <a href={`/sikh-bitcoin/${lesson.slug}/`} data-learning-lesson-link={lesson.slug} aria-label={`Read lesson ${lesson.order}: ${lesson.title}`}>Read lesson <span aria-hidden="true">→</span></a>
            </article>
          ))}
        </div>
        <p className="source-notes">
          AI-assisted educational material. Sources checked October 1, 2026; independent curriculum review is pending.
          The final capstone is a self-directed exercise, not a credential or permission to transact.
        </p>
      </section>
    </main>
  );
}
