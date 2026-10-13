import { useState, useEffect } from "react";
import { musicController } from "../music";
import type { Page } from "../App";

export function Tools({ onNavigate }: { onNavigate: (page: Page, classId?: string) => void }) {
  return (
    <div className="site-shell">
      <SiteHeader active="tools" onNavigate={onNavigate} />
      <main className="tools-main">
        <section className="tools-intro">
          <div>
            <span className="section-kicker">A LITTLE MORE ROOM TO THINK</span>
            <h1>Tools for the classroom,<br />starting with the seats.</h1>
            <p>Plan a room that works for the students in front of you. No student accounts, no setup overhead — just your class and a thoughtful starting point.</p>
          </div>
          <div className="made-for-card"><span className="made-for-icon">▥</span><span>Made for teachers<small>Saved on this device</small></span></div>
        </section>

        <section className="tool-feature-card">
          <div className="tool-preview seating-preview" aria-hidden="true">
            <div className="preview-grid" />
            <div className="preview-board" />
            <div className="preview-table preview-table-one"><i /><i /></div>
            <div className="preview-table preview-table-two"><i /><i /></div>
          </div>
          <div className="tool-copy">
            <span className="section-kicker">CLASSROOM TOOL · READY TO USE</span>
            <span className="feature-index">01 / 02</span>
            <h2>Desk Planner</h2>
            <p>Build your roster, note the needs that matter, then explore five seating possibilities for each class.</p>
            <button className="text-button filled" onClick={() => onNavigate("hub")}>Open Desk Planner <span>→</span></button>
          </div>
        </section>

        <section className="tool-secondary-card" onClick={() => onNavigate("groupmaker")}>
          <div className="tool-secondary-icon"><span>♧</span><b>02</b></div>
          <div className="tool-copy"><span className="section-kicker">READY TO USE</span><h2>Group Maker</h2><p>Balance academic and collaboration skills to create fair, effective working groups.</p></div>
          <button className="text-button outlined" onClick={(event) => { event.stopPropagation(); onNavigate("groupmaker"); }}>Open Group Maker</button>
        </section>
        <p className="local-note">Your classes and room plans stay in this browser, on this device.</p>
      </main>
    </div>
  );
}

export function MusicToggle() {
  const [muted, setMuted] = useState(musicController.muted);

  useEffect(() => {
    return musicController.subscribe(setMuted);
  }, []);

  return (
    <button
      className="music-toggle"
      onClick={() => musicController.toggleMute()}
      title={muted ? "Unmute music" : "Mute music"}
      aria-label={muted ? "Unmute music" : "Mute music"}
    >
      {muted ? "\u266A\u0338" : "\u266A"}
    </button>
  );
}

export function SiteHeader({ active, onNavigate }: { active: "tools" | "classes"; onNavigate: (page: Page, classId?: string) => void }) {
  return <header className="site-header">
    <button className="brand-lockup" onClick={() => onNavigate("tools")}><span className="brand-mark">d.</span><span>Desk planner<small>A THOUGHTFUL SEAT FOR EVERYONE</small></span></button>
    <nav className="site-nav"><button className={active === "tools" ? "active" : ""} onClick={() => onNavigate("tools")}><span>▦</span> Tools</button><button className={active === "classes" ? "active" : ""} onClick={() => onNavigate("hub")}><span>♧</span> My classes</button></nav>
    <div className="header-right">
      <MusicToggle />
      <div className="saved-status"><i /> Saved on this device</div>
    </div>
  </header>;
}
