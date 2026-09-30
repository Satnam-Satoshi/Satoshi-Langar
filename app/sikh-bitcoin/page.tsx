import type { Metadata } from 'next';
import { PageIntro } from '../components/PageIntro';
import { courseOutlines, lessons } from '../data/courses';

export const metadata: Metadata = {
  title: 'Sikh Bitcoin · Learn together',
  description: 'Three free beginner lessons on Bitcoin, custody and Lightning, plus an open course roadmap. No wallet, purchase or sign-in required.',
};

export default function SikhBitcoinPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Sikh Bitcoin · Community learning"
        title="A little understanding. A world of possibility."
        description="Learn Bitcoin one clear step at a time. Ask questions, check the evidence and bring someone along. You can start without a wallet, a purchase or a sign-in."
      />
      <section className="reading-content wide-content" aria-labelledby="start-learning">
        <span className="inline-tag">Three complete starter lessons · Free to read</span>
        <h2 id="start-learning">Start here. Take your time.</h2>
        <p>
          These short lessons include a paper exercise, questions and answers you can reveal at your own pace.
          There is no score to chase and no account to create. Your answers are not submitted or saved.
        </p>
        <div className="course-list">
          {lessons.map((lesson, index) => (
            <article className="course-row" key={lesson.slug}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="!mt-0">{lesson.title}</h3>
                <p>{lesson.description}</p>
                <p>About {lesson.minutes} minutes · Exercise and self-check</p>
              </div>
              <a href={`/sikh-bitcoin/${lesson.slug}/`} aria-label={`Read lesson ${index + 1}: ${lesson.title}`}>
                Read lesson <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
        <h2>Why “Sikh Bitcoin”?</h2>
        <p>
          The name draws on Sikh as a student or learner, while respecting Sikh as a living religious identity.
          This is a community learning program open to all backgrounds. It does not claim religious endorsement
          of Bitcoin, speak for Sikh institutions or require a shared belief.
        </p>
        <p>
          Our approach brings patient learning together with a habit of verification: understand the claim,
          follow its source and be honest about what remains uncertain.
          {' '}<a href="https://www.worldsikh.org/sikh_faith">Read the World Sikh Organization’s explanation of Sikh identity.</a>
        </p>
        <h2 id="course-roadmap">Where the learning can go next</h2>
        <p>
          These six course outlines are our proposed curriculum. The three lessons above are available now;
          the full courses, translated editions and guided workshops still need development and review.
          Completing a starter lesson is practice, not a certification.
        </p>
        {courseOutlines.map((course, index) => (
          <details key={course.title}>
            <summary>{String(index + 1).padStart(2, '0')} · {course.title}</summary>
            <span className="inline-tag">{course.status}</span>
            <p><strong>For {course.audience.toLowerCase()}.</strong> {course.description}</p>
            <ol>
              {course.modules.map((module) => <li key={module}>{module}</li>)}
            </ol>
            <p><strong>What you should be able to do:</strong> {course.outcome}</p>
          </details>
        ))}
        <h2>Help make learning easier</h2>
        <p>
          Teachers, translators, designers and curious beginners can help. Review one explanation, test the
          lesson with a newcomer or propose an accessible format. Punjabi and other language editions need
          knowledgeable human review before publication.
        </p>
        <a className="launch-button" href="/join/">Find a contribution <span aria-hidden="true">→</span></a>
        <p className="source-notes">
          Educational material · Reviewed September 30, 2026. Each lesson links its primary sources.
          Learning never requires sharing wallet credentials or sending money.
        </p>
      </section>
    </main>
  );
}
