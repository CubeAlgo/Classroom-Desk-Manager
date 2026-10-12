import { SiteHeader } from "./Tools";
import type { Page } from "../App";

export function GroupMaker({ onNavigate }: { onNavigate: (page: Page, classId?: string) => void }) {
  return <div className="site-shell"><SiteHeader active="tools" onNavigate={onNavigate} /><main className="placeholder-main"><span className="section-kicker">CLASSROOM TOOL · COMING NEXT</span><h1>Make groups<br />that work together.</h1><p>The Group Maker will let you choose any group size from two to five students, then balance the class with the same thoughtful controls as Desk Planner.</p><div className="placeholder-card"><div className="placeholder-icon">♧</div><div><h2>Group Maker</h2><p>This space is ready for the group-building flow. We’ll add roster selection, group size, and balancing preferences here next.</p><button className="text-button outlined" onClick={() => onNavigate("tools")}>← Back to tools</button></div></div></main></div>;
}
