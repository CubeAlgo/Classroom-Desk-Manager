import { useEffect, useState, useCallback } from "react";
import { fetchClasses, createClass, deleteClass, type ClassRow, type LayoutType, type TeacherDeskPosition } from "../db";
import type { Page } from "../App";
import { SiteHeader } from "./Tools";
import { LAYOUTS, layoutLabel } from "../lib";

function OptionCard({ selected, title, desc, onClick, testid }: { selected: boolean; title: string; desc: string; onClick: () => void; testid: string }) {
  return (
    <button className={`option-card ${selected ? "selected" : ""}`} onClick={onClick} data-testid={testid}>
      <i className="option-radio" />
      <span><b>{title}</b><small>{desc}</small></span>
    </button>
  );
}

function CreateClassCard({ onCancel, onCreated }: { onCancel: () => void; onCreated: (cls: ClassRow) => void }) {
  const [name, setName] = useState("");
  const [layout, setLayout] = useState<LayoutType>("pairs");
  const [desk, setDesk] = useState<TeacherDeskPosition>("front");
  const submit = async () => {
    if (!name.trim()) return;
    try { onCreated(await createClass(name.trim(), layout, desk)); } catch (error) { console.error(error); }
  };
  return (
    <section className="create-card" data-testid="create-class-card">
      <div className="create-card-intro">
        <span className="section-kicker">NEW CLASS</span>
        <h2>Create a classroom workspace</h2>
        <p>Start with the basics. You can add students and fine-tune the room next.</p>
      </div>
      <div className="create-card-fields">
        <div>
          <label className="field-label">Class name</label>
          <input className="text-input" data-testid="new-class-name-input" placeholder="e.g. Period 3 — Algebra II" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus />
        </div>
        <div>
          <label className="field-label">Starting layout</label>
          <div className="option-grid five">
            {LAYOUTS.map((l) => (
              <OptionCard key={l.id} testid={`new-class-layout-${l.id}`} selected={layout === l.id} title={l.title} desc={l.desc} onClick={() => setLayout(l.id)} />
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Teacher's desk</label>
          <div className="option-grid">
            <OptionCard testid="new-class-desk-front" selected={desk === "front"} title="Front of room" desc="Next to the whiteboard" onClick={() => setDesk("front")} />
            <OptionCard testid="new-class-desk-back" selected={desk === "back"} title="Back of room" desc="Facing the students' backs" onClick={() => setDesk("back")} />
          </div>
        </div>
      </div>
      <div className="create-card-foot">
        <button className="ghost-pill" data-testid="new-class-cancel-btn" onClick={onCancel}>Cancel</button>
        <button className="text-button filled" data-testid="new-class-continue-btn" onClick={submit} disabled={!name.trim()}>Continue to setup →</button>
      </div>
    </section>
  );
}

export function Hub({ onNavigate }: { onNavigate: (page: Page, classId?: string) => void }) {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => { try { setClasses(await fetchClasses()); } catch (error) { console.error(error); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const handleDelete = async (id: string) => { try { await deleteClass(id); setClasses((current) => current.filter((item) => item.id !== id)); } catch (error) { console.error(error); } };
  return <div className="site-shell"><SiteHeader active="classes" onNavigate={onNavigate} /><main className="classes-main">
    <section className="classes-heading"><div><span className="page-title-kicker">Desk Planner <em>/</em> Your workspace</span><h1>Choose a class to arrange.</h1></div><button className="text-button filled" data-testid="new-class-btn" onClick={() => setCreating((value) => !value)}>{creating ? "Cancel" : "＋ New class"}</button></section>
    {creating && <CreateClassCard onCancel={() => setCreating(false)} onCreated={(cls) => { setCreating(false); onNavigate("setup", cls.id); }} />}
    {loading ? <div className="hub-loading">Loading your classes…</div> : classes.length === 0 ? (!creating && <div className="hub-empty"><h2>No classes yet</h2><p>Create your first class and build a thoughtful seating plan.</p><button className="text-button filled" data-testid="create-first-class-btn" onClick={() => setCreating(true)}>Create your first class</button></div>) : <div className="class-list">{classes.map((cls, index) => <article className="class-list-row" key={cls.id} data-testid={`class-row-${index}`}><span className="row-number">{String(index + 1).padStart(2, "0")}</span><div className="class-row-copy"><span className="row-kicker">{layoutLabel(cls.layout).toUpperCase()} · CLASSROOM</span><h2>{cls.name}</h2><p>Ready for your class details</p></div><div className="class-row-actions"><button className="text-button outlined" data-testid={`class-edit-btn-${index}`} onClick={() => onNavigate("setup", cls.id)}>Edit setup</button><button className="text-button filled" data-testid={`class-arrange-btn-${index}`} onClick={() => onNavigate("planner", cls.id)}>Arrange room <span>→</span></button><button className="row-link" onClick={() => onNavigate("groupmaker", cls.id)}>Group Maker</button><button className="delete-inline" data-testid={`class-delete-btn-${index}`} onClick={() => handleDelete(cls.id)} aria-label={`Delete ${cls.name}`}>×</button></div></article>)}</div>}
  </main></div>;
}
