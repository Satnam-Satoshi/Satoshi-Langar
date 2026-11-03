import { calendarWeeks, formatPublicationMonth, type PublicationDay } from '../data/edition-calendar';
import { editionDateHref, formatEditionDate, type LtcEdition } from '../data/editions';
import styles from '../conversations/magazine.module.css';

export default function LtcEditionCalendar({ month, days }: { month: string; days: PublicationDay<LtcEdition>[] }) {
  const published = new Map(days.map(day => [day.date, day]));
  return <div className={styles.calendarPanel}>
    <p className={styles.kicker}>Choose a publication day</p>
    <table className={styles.calendar}>
      <caption>{formatPublicationMonth(month)}</caption>
      <thead><tr>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead>
      <tbody>{calendarWeeks(month).map((week, index) => <tr key={index}>{week.map((date, dayIndex) => <td key={date ?? `blank-${dayIndex}`}>{date && (published.has(date) ? <a href={editionDateHref(date)} aria-label={`Read ${formatEditionDate(date)} edition`}>{Number(date.slice(-2))}<span aria-hidden="true">●</span></a> : <span className={styles.calendarEmpty}>{Number(date.slice(-2))}</span>)}</td>)}</tr>)}</tbody>
    </table>
    <p className={styles.small}><span className={styles.calendarDot} aria-hidden="true">●</span> Published edition. Only published dates are linked. An unlinked date has no edition in this archive.</p>
  </div>;
}
