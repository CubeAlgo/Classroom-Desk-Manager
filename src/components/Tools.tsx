import { useState, useEffect } from "react";
import { musicController } from "../music";
import type { Page } from "../App";

const PREVIEW_TABLES = [
  { x: 8, y: 34, seats: ["S1", "S2", "S3", "S4"], tone: ["g", "", "a", ""] },
  { x: 38, y: 34, seats: ["S5", "S6", "S7", "S8"], tone: ["", "g", "", ""] },
  { x: 68, y: 34, seats: ["S9", "S10", "S11", "S12"], tone: ["", "", "g", "a"] },
  { x: 23, y: 68, seats: ["S13", "S14", "S15", "S16"], tone: ["a", "", "", "g"] },
  { x: 53, y: 68, seats: ["S17", "S18", "S19", "S20"], tone: ["", "", "", ""] },
];

function HeroPreview() {
  return (
    <div className="hero-preview" aria-hidden="true">
      <div className="hp-window">
        <div className="hp-bar"><i /><i /><i /><span>Period 3 — Algebra II</span></div>
        <div className="hp-room">
          <div className="hp-board">WHITEBOARD</div>
          <div className="hp-teacher">Teacher</div>
          {PREVIEW_TABLES.map((t, i) => (
            <div key={i} className="hp-table" style={{ left: `${t.x}%`, top: `${t.y}%`, animationDelay: `${0.15 + i * 0.08}s` }}>
              <div className="hp-seats">{t.seats.slice(0, 2).map((s, j) => <b key={s} className={t.tone[j]}>{s}</b>)}</div>
              <div className="hp-surface" />
              <div className="hp-seats">{t.seats.slice(2).map((s, j) => <b key={s} className={t.tone[j + 2]}>{s}</b>)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="hp-float hp-score"><strong>94</strong><span>Arrangement score<small>All separation rules met</small></span></div>
      <div className="hp-float hp-rule"><i /> Keep apart · S3 &amp; S11</div>
    </div>
  );
}

const STEPS = [
  ["01", "Add your roster", "Type names or paste a whole list. Every student gets a clear S-number."],
  ["02", "Set what matters", "Visibility, behaviour, near the teacher, who to keep apart or together."],
  ["03", "Pick a plan", "Compare five scored arrangements, then drag, lock and fine-tune."],
];

export function Tools({ onNavigate }: { onNavigate: (page: Page, classId?: string) => void }) {
  return (
    <div className="site-shell">
      <SiteHeader active="tools" onNavigate={onNavigate} />
      <main className="home-main">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-pill"><i /> Classroom tools for teachers</span>
            <h1>Seating plans that think the way <em>you</em> do.</h1>
            <p>Build a roster, note the needs that matter, and get thoughtful seating arrangements in seconds. No student accounts, no setup overhead.</p>
            <div className="home-cta">
              <button className="text-button filled big" data-testid="home-open-planner-btn" onClick={() => onNavigate("hub")}>Open Desk Planner <span>→</span></button>
              <button className="text-button outlined big" data-testid="home-open-groupmaker-btn" onClick={() => onNavigate("groupmaker")}>Try Group Maker</button>
            </div>
            <dl className="home-stats">
              <div><dt>5</dt><dd>scored options per class</dd></div>
              <div><dt>6</dt><dd>per-student preferences</dd></div>
              <div><dt>0</dt><dd>accounts needed</dd></div>
            </dl>
          </div>
          <HeroPreview />
        </section>

        <section className="home-steps">
          {STEPS.map(([n, title, copy]) => (
            <article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </section>

        <section className="home-tools">
          <div className="home-section-head"><span className="section-kicker">THE TOOLKIT</span><h2>Two tools, one calm classroom.</h2></div>
          <div className="home-tool-grid">
            <article className="home-tool primary" onClick={() => onNavigate("hub")} data-testid="home-tool-desk-planner">
              <span className="home-tool-index">01</span>
              <h3>Desk Planner</h3>
              <p>Pairs or group tables, a movable teacher's desk, and rules for every student. Explore five seating possibilities for each class.</p>
              <span className="home-tool-link">Open planner →</span>
            </article>
            <article className="home-tool" onClick={() => onNavigate("groupmaker")} data-testid="home-tool-group-maker">
              <span className="home-tool-index">02</span>
              <h3>Group Maker</h3>
              <p>Balance academic and collaboration skills to create fair, effective working groups.</p>
              <span className="home-tool-link">Open Group Maker →</span>
            </article>
          </div>
        </section>
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
    <button className="brand-lockup" data-testid="brand-home-btn" onClick={() => onNavigate("tools")}><span className="brand-mark">d.</span><span>Desk planner<small>A THOUGHTFUL SEAT FOR EVERYONE</small></span></button>
    <nav className="site-nav"><button data-testid="nav-tools-btn" className={active === "tools" ? "active" : ""} onClick={() => onNavigate("tools")}><span>▦</span> Tools</button><button data-testid="nav-classes-btn" className={active === "classes" ? "active" : ""} onClick={() => onNavigate("hub")}><span>♧</span> My classes</button></nav>
    <div className="header-right">
      <MusicToggle />
      <div className="saved-status"><i /> Saved on this device</div>
    </div>
  </header>;
}
