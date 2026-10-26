import { Link } from 'react-router-dom';

const cultureCards = [
  {
    title: 'Innovation',
    icon: '💡',
    description: 'Work on cutting-edge projects that push boundaries and shape the future of technology.',
  },
  {
    title: 'Career Growth',
    icon: '📈',
    description: 'Clear career paths, mentorship programs, and continuous learning opportunities for every team member.',
  },
  {
    title: 'Great Culture',
    icon: '🤝',
    description: 'A diverse, inclusive workplace where collaboration and creativity thrive every day.',
  },
  {
    title: 'Global Impact',
    icon: '🌍',
    description: "Your work reaches millions of users worldwide, making a real difference in people's lives.",
  },
];

/** Present the approved HireHub culture story and the application path. */
export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="hero__eyebrow">Careers at HireHub</p>
          <h1 id="hero-title">Build Your Future With Us</h1>
          <p className="hero__subtitle">
            Join a team that values innovation, collaboration, and growth. We're looking for talented people like you.
          </p>
          <Link className="button button--hero" to="/apply">Express Your Interest</Link>
        </div>
      </section>

      <section className="culture-section" aria-labelledby="culture-title">
        <div className="culture-section__heading">
          <h2 id="culture-title">Why Join Us?</h2>
        </div>
        <div className="culture-grid">
          {cultureCards.map((card, index) => (
            <article className={`culture-card culture-card--${index + 1}`} key={card.title}>
              <div className="culture-card__icon" aria-hidden="true">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="next-step" aria-labelledby="next-step-title">
        <div className="next-step__copy">
          <h2 id="next-step-title">Ready to take the next step?</h2>
        </div>
        <Link className="button button--primary" to="/apply">Apply Now</Link>
      </section>
    </div>
  );
}
