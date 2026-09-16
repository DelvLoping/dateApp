import { Heart } from 'lucide-react';

export default function Home() {
  return (
    <main className="home-shell">
      <div className="home-orb home-orb-one" />
      <div className="home-orb home-orb-two" />
      <section className="home-card">
        <span className="brand-mark"><Heart size={18} fill="currentColor" /></span>
        <p className="eyebrow">A private invitation</p>
        <h1>Un date&nbsp;?</h1>
        <p className="home-copy">Certaines pages ne s’ouvrent qu’avec la bonne adresse.</p>
        <div className="home-signature">F.</div>
      </section>
    </main>
  );
}
