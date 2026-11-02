import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import styles from './daily-news-map.module.css';

type Graphic = { editionId: string; date: string; headline: string; width: number; height: number; pngSha256: string; pngBytes: number; stories: { id: string; title: string; sourceDates: string[] }[] };
function recordedGraphic(editionId: string): Graphic | null {
  if (!/^\d{4}-\d{2}-\d{2}-r[1-9]\d*$/.test(editionId)) return null;
  const directory = path.join(process.cwd(), 'public/magazine/daily', editionId);
  let raw: string;
  try { raw = readFileSync(path.join(directory, 'graphic.json'), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  const value = JSON.parse(raw) as Graphic;
  const png = readFileSync(path.join(directory, 'social.png'));
  if (value.editionId !== editionId || value.date !== editionId.slice(0, 10) || value.width !== 1200 || value.height !== 630 || value.pngBytes !== png.length || createHash('sha256').update(png).digest('hex') !== value.pngSha256 || typeof value.headline !== 'string' || !Array.isArray(value.stories) || !value.stories.length || value.stories.some(story => typeof story.id !== 'string' || typeof story.title !== 'string' || !Array.isArray(story.sourceDates) || story.sourceDates.some(date => typeof date !== 'string'))) throw Error('Recorded daily graphic failed verification');
  return value;
}

export default function DailyNewsMap({ editionId }: { editionId: string }) {
  const graphic = recordedGraphic(editionId);
  if (!graphic) return null;
  const image = `/magazine/daily/${editionId}/social.png`;
  return <section className={styles.map} aria-label={`Daily news map for ${graphic.date}`}>
    <header><p>THE DAILY NEWS MAP · {graphic.date}</p><h2>{graphic.headline}</h2></header>
    <a href={image} aria-label="Open the full-size daily news graphic"><img src={image} width={1200} height={630} loading="lazy" alt={`Original editorial map: ${graphic.stories.map(story => story.title).join('; ')}. Each story keeps its source publication date.`}/></a>
    <ol>{graphic.stories.map(story => <li key={story.id}><strong>{story.title}</strong><span>Source: {story.sourceDates.join(' / ')}</span></li>)}</ol>
    <footer><span>AI-prepared. Original artwork. Source dates remain visible.</span><a href={`/conversations/editions/${editionId}/#feature-desk`}>Read the stories and sourcebook ↗</a></footer>
  </section>;
}
