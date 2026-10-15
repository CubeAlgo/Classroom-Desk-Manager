import { useState, useEffect } from "react";
import { musicController } from "../music";
import type { Page } from "../App";

const KIDS = ["Mia", "Leo", "Ava", "Sam", "Zoe", "Max", "Ivy", "Ben", "Ella", "Kai", "Lily", "Noah", "Ruby", "Eli", "Nora", "Finn"];
const COLORS = ["coral", "sun", "mint", "sky", "grape"];
const TABLES = [
  { x: 6, y: 36 }, { x: 37, y: 36 }, { x: 68, y: 36 }, { x: 21, y: 68 }, { x: 53, y: 68 },
];

function HeroPreview() {
  return (
    <div className="hero-preview" aria-hidden="true">
      <div className="hp-window">
        <div className="hp-bar"><i /><i /><i /><span>Room 12 · Ms. Rivera's 2nd Grade</span></div>
        <div className="hp-room">
          <div className="hp-board">WHITEBOARD</div>
          <div className="hp-teacher">Teacher</div>
          {TABLES.map((t, i) => (
            <div key={i} className="hp-table" style={{ left: `${t.x}%`, top: `${t.y}%`, animationDelay: `${0.15 + i * 0.08}s` }}>
              <div className="hp-seats">{[0, 1].map((j) => <b key={j} className={COLORS[(i + j) % 5]}>{KIDS[(i * 3 + j) % KIDS.length]}</b>)}</div>
              <div className={`hp-surface ${COLORS[(i + 2) % 5]}`} />
              <div className="hp-seats">{[2, 3].map((j) => <b key={j} className={COLORS[(i + j) % 5]}>{KIDS[(i * 3 + j) % KIDS.length]}</b>)}</div>
            </div>
          ))}
          <span className="hp-sticker star">★</span>
          <span className="hp-sticker apple" />
        </div>
      </div>
    </div>
  );
}

const QUOTES = [
  { text: "Remarkably user-friendly — it saves me valuable planning time every week.", name: "Ms. Schnell", role: "ESL Teacher", color: "sky" },
  { text: "Keeps my seating organized while truly taking each student's needs into account.", name: "Ms. Creighton", role: "Grade 7/8 Teacher", color: "coral" },
  { text: "So many group and seating options — it's easy to experiment until the room feels just right.", name: "Ms. Hardimen", role: "Grade 8 Music Teacher", color: "grape" },
];

const initials = (name: string) => name.replace(/^(Ms|Mr|Mrs|Dr)\.?\s*/i, "").slice(0, 1).toUpperCase();

function Testimonials() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % QUOTES.length), 6500);
    return () => clearInterval(t);
  }, [i]);
  const q = QUOTES[i];
  return (
    <section className="home-quote" data-testid="home-testimonial">
      <span className="quote-label">What teachers say</span>
      <blockquote key={q.name} data-testid="testimonial-text">“{q.text}”</blockquote>
      <cite key={`${q.name}-cite`}><i className={`av-${q.color}`}>{initials(q.name)}</i><span><b>{q.name}</b><small>{q.role}</small></span></cite>
      <div className="quote-dots">
        {QUOTES.map((x, j) => (
          <button key={x.name} className={j === i ? "on" : ""} data-testid={`testimonial-dot-${j}`} onClick={() => setI(j)} aria-label={`Show quote from ${x.name}`} />
        ))}
      </div>
    </section>
  );
}

export function Tools({ onNavigate }: { onNavigate: (page: Page, classId?: string) => void }) {
  return (
    <div className="site-shell">
      <SiteHeader active="tools" onNavigate={onNavigate} />
      <main className="home-main">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-pill"><i /> Classroom tools for teachers</span>
            <h1>Seating plans that think the way <em>you</em> do.</h1>
            <p>Happy tables, calm classrooms. Seating plans in seconds.</p>
            <div className="home-cta">
              <button className="text-button filled big" data-testid="home-open-planner-btn" onClick={() => onNavigate("hub")}>Open Desk Planner <span>→</span></button>
              <button className="text-button outlined big" data-testid="home-open-groupmaker-btn" onClick={() => onNavigate("groupmaker")}>Try Group Maker</button>
            </div>
          </div>
          <HeroPreview />
        </section>

        <Testimonials />
        <p className="local-note">Your classes and room plans stay in this browser, on this device.</p>
      </main>
    </div>
  );
}

export function MusicToggle() {
  const [muted, setMuted] = useState(musicController.muted);
  useEffect(() => musicController.subscribe(setMuted), []);
  return (
    <button
      className={`music-toggle ${muted ? "is-muted" : "is-playing"}`}
      data-testid="music-toggle-btn"
      onClick={() => musicController.toggleMute()}
      title={muted ? "Play music" : "Mute music"}
      aria-label={muted ? "Play music" : "Mute music"}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        {muted ? <><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></> : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></>}
      </svg>
      <span className="music-label">{muted ? "Music off" : "Lo-fi on"}</span>
      {!muted && <span className="eq"><i /><i /><i /></span>}
    </button>
  );
}

export function SiteHeader({ active, onNavigate }: { active: "tools" | "classes"; onNavigate: (page: Page, classId?: string) => void }) {
  return <header className="site-header">
    <button className="brand-lockup" data-testid="brand-home-btn" onClick={() => onNavigate("tools")}><span className="brand-mark" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="9" width="18" height="6" rx="2" fill="#f7f4ec" /><circle cx="7.5" cy="5" r="2.2" fill="#f2b632" /><circle cx="16.5" cy="5" r="2.2" fill="#f2785c" /><circle cx="7.5" cy="19" r="2.2" fill="#4a9be8" /><circle cx="16.5" cy="19" r="2.2" fill="#3fb68b" /></svg></span><span className="brand-name">Desk Planner</span></button>
    <nav className="site-nav"><button data-testid="nav-tools-btn" className={active === "tools" ? "active" : ""} onClick={() => onNavigate("tools")}><span>▦</span> Tools</button><button data-testid="nav-classes-btn" className={active === "classes" ? "active" : ""} onClick={() => onNavigate("hub")}><span>♧</span> My classes</button></nav>
    <div className="header-right">
      <MusicToggle />
      <div className="saved-status"><i /> Saved on this device</div>
    </div>
  </header>;
}
