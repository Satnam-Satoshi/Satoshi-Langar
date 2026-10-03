import type { Metadata } from 'next';
import { PageIntro } from '../components/PageIntro';
import { courses, getCourseLessons } from '../data/courses';

export const metadata: Metadata = {
  title: 'Sikh Bitcoin · Learn together',
  description: 'Three free Bitcoin courses, 63 complete lessons, exercises and self-checks. Learn foundations, technical depth and self-custody without a wallet or sign-in.',
};

export default function SikhBitcoinPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Sikh Bitcoin · Community learning"
        title="Learn deeply. Verify for yourself."
        description="From your first Bitcoin question to a careful self-custody design. Three open courses, 63 complete lessons and room to learn at your own pace. No wallet, purchase or sign-in required."
      />
      <section className="reading-content wide-content" aria-labelledby="choose-course">
        <span className="inline-tag">Free to read · 21 lessons per course</span>
        <h2 id="choose-course">Choose your starting point</h2>
        <p>
          Each lesson includes a clear explanation, a paper exercise with a worked answer and questions
          you can reveal at your own pace. You can save completion marks in your browser; answers are
          never submitted. Levels describe the material, not a qualification you must earn.
        </p>
        <div className="course-list">
          {courses.map((course, index) => (
            <article className="course-row" key={course.id}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <span className="inline-tag">{course.level} · {getCourseLessons(course.id).length} lessons</span>
                <h3 className="!mt-3">{course.title}</h3>
                <p>{course.description}</p>
                <p><strong>By the end:</strong> {course.outcome}</p>
                <p className="!text-sm">{course.duration}</p>
              </div>
              <a href={`/sikh-bitcoin/course/${course.id}/`} aria-label={`Explore ${course.title}`}>
                Explore course <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
        <h2>A useful way to learn</h2>
        <ol className="steps">
          <li>Choose a course and read one lesson. Follow a source when a claim is unfamiliar.</li>
          <li>Try the exercise before revealing its answer. Explain the result in your own words.</li>
          <li>Use the self-check questions, then optionally mark the lesson complete. Return whenever you need.</li>
          <li>Finish the capstone with a friend or reviewer. A good question is progress too.</li>
        </ol>
        <p className="status-note">
          All scenarios use paper or fictional records. Learning never requires sending money,
          sharing recovery words, taking a loan or connecting a wallet. Completion is self-reported
          practice, not certification, investment advice or authorization to operate a treasury.
        </p>
        <h2>Why “Sikh Bitcoin”?</h2>
        <p>
          The name draws on Sikh as a student or learner, while respecting Sikh as a living religious identity.
          This community learning program welcomes all backgrounds. It does not claim religious endorsement
          of Bitcoin, speak for Sikh institutions or require a shared belief.
          {' '}<a href="https://www.worldsikh.org/sikh_faith">Read the World Sikh Organization’s explanation of Sikh identity.</a>
        </p>
        <h2 id="course-roadmap">Help the curriculum grow responsibly</h2>
        <p>
          The three courses are available to read now. Independent subject-matter review, translated editions,
          audio formats and guided workshops are next steps. Teachers, technical reviewers, translators and
          curious beginners can test an explanation and propose a correction. Punjabi and other translations
          need knowledgeable human review before publication.
        </p>
        <a className="launch-button" href="/join/">Find a contribution <span aria-hidden="true">→</span></a>
        <p className="source-notes">
          AI-assisted educational material · Sources checked October 1, 2026. Each lesson links its references.
          Independent curriculum review is still pending; no institutional endorsement or accreditation is claimed.
        </p>
      </section>
    </main>
  );
}
