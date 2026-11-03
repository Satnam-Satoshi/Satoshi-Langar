import type { Metadata } from 'next';
import Image from 'next/image';
import styles from './shop.module.css';

export const metadata: Metadata = {
  title: 'The community shop · A first collection',
  description: 'Explore three original Satnam Satoshi merchandise concepts: the Open Table tee, Proof of Birthday print and Proof of Service tote. A collection in development.',
};

function OpenTableTee() {
  return <div className={`${styles.productStage} ${styles.teeStage}`}>
    <div className={styles.tee} aria-hidden="true">
      <div className={styles.collar} />
      <div className={styles.teePrint}>
        <span>SATNAM SATOSHI</span>
        <strong>Open<br/><em>table.</em></strong>
        <Image src="/magazine/proof-of-birthday/long-table.jpg" width={1536} height={1024} alt="" sizes="190px" />
        <small>THERE IS ROOM FOR ONE MORE.</small>
      </div>
    </div>
    <span className={styles.stageNumber} aria-hidden="true">01 / WEAR AN INVITATION</span>
  </div>;
}

function BirthdayPrint() {
  return <div className={`${styles.productStage} ${styles.posterStage}`}>
    <div className={styles.poster} aria-hidden="true">
      <Image src="/magazine/proof-of-birthday/cover.jpg" width={1024} height={1536} alt="" sizes="250px" />
      <div className={styles.posterTitle}><span>LUNCH TIME CONVERSATIONS</span><strong>Proof of<br/><em>Birthday.</em></strong></div>
      <div className={styles.posterFoot}><span>LITECOIN AT 15</span><span>2011 → 2026</span></div>
    </div>
    <span className={styles.stageNumber} aria-hidden="true">02 / MAKE SPACE FOR A STORY</span>
  </div>;
}

function ServiceTote() {
  return <div className={`${styles.productStage} ${styles.toteStage}`}>
    <div className={styles.tote} aria-hidden="true">
      <div className={styles.toteHandle} />
      <div className={styles.toteBody}>
        <span>SATNAM SATOSHI</span>
        <strong>Proof<br/>of <em>service.</em></strong>
        <div className={styles.tableMark}><i/><i/><i/><i/><i/><i/><b/></div>
        <small>MANY HANDS.<br/>ONE OPEN TABLE.</small>
      </div>
    </div>
    <span className={styles.stageNumber} aria-hidden="true">03 / CARRY THE IDEA</span>
  </div>;
}

export default function ShopPage() {
  return <main className={styles.shop}>
    <section className={styles.intro} aria-labelledby="shop-title">
      <div className={styles.topline}><a href="/">Satnam Satoshi ↖</a><span>THE COMMUNITY SHOP / COLLECTION 01</span></div>
      <div className={styles.introGrid}>
        <div><p className={styles.eyebrow}>A first collection, taking shape</p><h1 id="shop-title">Good ideas.<br/><em>Everyday company.</em></h1></div>
        <div className={styles.introCopy}><p>Something to wear. Something to hang. Something to carry.</p><p>Original designs for people who believe open knowledge and a shared table belong in everyday life.</p><a className={styles.button} href="#collection">Explore the designs ↓</a></div>
      </div>
      <div className={styles.status}><span>DESIGN PREVIEW</span><p>These are product concepts. The seller account is not connected, and orders are not open. Final materials, sizes, prices and delivery details will appear before launch.</p></div>
    </section>

    <section className={styles.collection} id="collection" aria-labelledby="collection-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Three ways to start a conversation</p><h2 id="collection-title">Wear it. Frame it. Carry it.</h2></div><p>Original project artwork.<br/>A little wit. A generous spirit.</p></div>
      <div className={styles.products}>
        <article aria-labelledby="tee-title">
          <figure><OpenTableTee/><figcaption>Illustrated design concept · Not available to order</figcaption></figure>
          <div className={styles.productCopy}><p className={styles.eyebrow}>01 / The community tee</p><h3 id="tee-title">Open Table</h3><p>An invitation you can wear. A shared-table illustration and a reminder that there is always room for someone new.</p><dl><dt>Design direction</dt><dd>Warm ivory, navy type, original community illustration.</dd><dt>Before launch</dt><dd>Garment, sizing, print sample and price to be confirmed.</dd></dl><a href="/langar/">The story behind the table →</a></div>
        </article>
        <article aria-labelledby="poster-title">
          <figure><BirthdayPrint/><figcaption>Illustrated design concept · Not available to order</figcaption></figure>
          <div className={styles.productCopy}><p className={styles.eyebrow}>02 / The anniversary art print</p><h3 id="poster-title">Proof of Birthday</h3><p>A birthday for a public ledger. Our sculptural silver-candle artwork celebrates the curiosity behind Litecoin’s fifteen-year story.</p><dl><dt>Design direction</dt><dd>Portrait artwork, silver details and editorial typography.</dd><dt>Before launch</dt><dd>Print-ready artwork, paper, dimensions and price to be confirmed.</dd></dl><a href="/conversations/specials/proof-of-birthday/">Read the 84-page special →</a></div>
        </article>
        <article aria-labelledby="tote-title">
          <figure><ServiceTote/><figcaption>Illustrated design concept · Not available to order</figcaption></figure>
          <div className={styles.productCopy}><p className={styles.eyebrow}>03 / The everyday tote</p><h3 id="tote-title">Proof of Service</h3><p>Many hands. One open table. A simple typographic design for the everyday work of learning, making and showing up for others.</p><dl><dt>Design direction</dt><dd>Navy lettering and an original shared-table motif.</dd><dt>Before launch</dt><dd>Fabric, dimensions, print sample and price to be confirmed.</dd></dl><a href="/ecosystem/">Explore the idea of seva →</a></div>
        </article>
      </div>
    </section>

    <section className={styles.studio} aria-labelledby="studio-title">
      <div><p className={styles.eyebrow}>Made with a point of view</p><h2 id="studio-title">An open studio.<br/><em>A careful first run.</em></h2><p>The collection connects our reading room, community kitchens and creative work. We will start small: choose the products, review physical samples, then publish the full purchasing details.</p><a className={styles.button} href="/kalakar/">Bring a creative idea to Kalakar.x ↗</a></div>
      <ol><li><span>01</span><div><h3>Design with intention.</h3><p>Use original artwork and clear permissions. Keep the artist’s voice and attribution visible.</p></div></li><li><span>02</span><div><h3>Make a sample matter.</h3><p>Check fit, readability and print quality before offering a finished product.</p></div></li><li><span>03</span><div><h3>Make the details clear.</h3><p>Publish the seller, price, shipping, returns and support information before opening orders.</p></div></li></ol>
    </section>

    <section className={styles.invitation} aria-labelledby="invitation-title">
      <div><p className={styles.eyebrow}>There is more than one way to belong</p><h2 id="invitation-title">You don’t need a tee<br/>to take <em>a seat.</em></h2><p>Read a story, improve a lesson or bring a useful skill. Being part of Satnam Satoshi is free.</p></div>
      <nav aria-label="Explore and contribute"><a href="/join/"><span>Make a contribution plan</span><small>Start with your time, curiosity or craft ↗</small></a><a href="/roadmap/"><span>Follow what we’re building</span><small>Milestones and open work ↗</small></a><a href="/donate/"><span>Give voluntary BTC or LTC support</span><small>Separate from merchandise and future purchases ↗</small></a></nav>
    </section>
    <p className={styles.note}>Satnam Satoshi original design concepts. Digital mockups show the creative direction, not manufactured samples. No Litecoin Foundation affiliation or endorsement is claimed.</p>
  </main>;
}
