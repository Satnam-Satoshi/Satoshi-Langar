import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageIntro } from '../../components/PageIntro';
import { courses, getCourseLessons, lessons } from '../../data/courses';
import { LearningProgress } from '../components/LearningProgress';

type LessonPageProps = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return lessons.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lesson = lessons.find((item) => item.slug === slug);
  if (!lesson) notFound();
  return { title: `${lesson.title} · Sikh Bitcoin`, description: lesson.description };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params;
  const lesson = lessons.find((item) => item.slug === slug);
  if (!lesson) notFound();
  const course = courses.find(({ id }) => id === lesson.courseId);
  if (!course) notFound();
  const courseLessons = getCourseLessons(course.id);
  const previousLesson = courseLessons[lesson.order - 2];
  const nextLesson = courseLessons[lesson.order];
  const nextCourse = courses[courses.findIndex(({ id }) => id === course.id) + 1];

  return (
    <main>
      <PageIntro eyebrow={`Sikh Bitcoin · ${course.level} · Lesson ${lesson.order} of 21`} title={lesson.title} description={lesson.description} />
      <article className="reading-content">
        <nav className="flex flex-wrap gap-5" aria-label="Learning section">
          <a href={`/sikh-bitcoin/course/${course.id}/`}>← {course.title}</a>
          <a href="/sikh-bitcoin/">All courses</a>
        </nav>
        <p className="status-note">About {lesson.minutes} minutes with practice. You only need something to take notes with. No real wallet details or payments are part of this lesson.</p>
        <details>
          <summary>Course contents · Lesson {lesson.order} of 21</summary>
          <ol>
            {courseLessons.map((item) => (
              <li key={item.slug}>
                <a href={`/sikh-bitcoin/${item.slug}/`} data-learning-lesson-link={item.slug} aria-current={item.slug === slug ? 'page' : undefined}>{item.title}</a>
                <span className="!text-sm" data-learning-completed={item.slug} hidden> · Marked complete</span>
              </li>
            ))}
          </ol>
        </details>
        <h2>What you will learn</h2>
        <ul>{lesson.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
        {lesson.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.sourceIds && (
              <p className="!text-sm">Read the source:{' '}
                {section.sourceIds.map((id, index) => {
                  const source = lesson.sources.find((item) => item.id === id);
                  return source ? <span key={id}>{index > 0 ? ' · ' : ''}<a href={source.url}>{source.title}</a></span> : null;
                })}
              </p>
            )}
          </section>
        ))}
        <section aria-labelledby="practice">
          <h2 id="practice">{lesson.exercise.title}</h2>
          <p>{lesson.exercise.prompt}</p>
          <details><summary>Reveal the worked answer</summary><p>{lesson.exercise.answer}</p></details>
        </section>
        <section aria-labelledby="self-check">
          <h2 id="self-check">Check your understanding</h2>
          <p>Choose an answer in your head or on paper, then reveal the explanation. Retry whenever you like. Answers are not submitted or scored; completion marks are your own learning notes.</p>
          {lesson.quiz.map((question, index) => (
            <section key={question.question} aria-labelledby={`question-${index + 1}`}>
              <h3 id={`question-${index + 1}`}>{index + 1}. {question.question}</h3>
              <ul>{question.options.map((option) => <li key={option}>{option}</li>)}</ul>
              <details><summary>Reveal answer {index + 1}</summary><p>{question.answer}</p></details>
            </section>
          ))}
        </section>
        <h2>Take this with you</h2>
        <p>{lesson.takeaway}</p>
        <LearningProgress course={course} lessons={courseLessons} currentSlug={lesson.slug} />
        <nav className="my-8 flex flex-wrap items-center gap-6" aria-label="Lesson navigation">
          {previousLesson && <a href={`/sikh-bitcoin/${previousLesson.slug}/`}>← {previousLesson.title}</a>}
          {nextLesson ? (
            <a className="launch-button" href={`/sikh-bitcoin/${nextLesson.slug}/`}>Next: {nextLesson.title} <span aria-hidden="true">→</span></a>
          ) : (
            <a className="launch-button" href={nextCourse ? `/sikh-bitcoin/course/${nextCourse.id}/` : '/sikh-bitcoin/'}>{nextCourse ? `Explore ${nextCourse.title}` : 'Explore all courses'} <span aria-hidden="true">→</span></a>
          )}
        </nav>
        <aside className="source-notes" aria-labelledby="sources">
          <h2 id="sources">Read and verify</h2>
          <p>Primary references checked October 1, 2026. Classroom scenarios and calculations are original illustrations, not live data. Specifications describe their stated scope; implementation and operational details can change.</p>
          <ul>{lesson.sources.map((source) => <li key={source.id}><a href={source.url}>{source.title}</a></li>)}</ul>
          <p>AI-assisted educational material; independent subject-matter review is pending. No accreditation, institutional endorsement or individualized financial advice is claimed.</p>
          <p>Found an unclear explanation? <a href="https://github.com/Satnam-Satoshi/Satoshi-Langar/issues/new">Suggest a correction on GitHub</a> without wallet secrets or personal payment details.</p>
        </aside>
      </article>
    </main>
  );
}
