import { useEffect, useState, useCallback } from "react";
import { fetchClasses, createClass, deleteClass, type ClassRow, type LayoutType } from "../db";
import type { Page } from "../App";
import { SiteHeader } from "./Tools";

export function Hub({ onNavigate }: { onNavigate: (page: Page, classId?: string) => void }) {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLayout, setNewLayout] = useState<LayoutType>("pairs");
  const load = useCallback(async () => { try { setClasses(await fetchClasses()); } catch (error) { console.error(error); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const handleCreate = async () => { if (!newName.trim()) return; try { const cls = await createClass(newName.trim(), newLayout); setNewName(""); setCreating(false); onNavigate("setup", cls.id); } catch (error) { console.error(error); } };
  const handleDelete = async (id: string) => { try { await deleteClass(id); setClasses((current) => current.filter((item) => item.id !== id)); } catch (error) { console.error(error); } };
  return <div className="site-shell"><SiteHeader active="classes" onNavigate={onNavigate} /><main className="classes-main">
    <section className="classes-heading"><div><span className="section-kicker">DESK PLANNER / YOUR WORKSPACE</span><h1>Choose a class to arrange.</h1><p>Each class has its own roster, seating preferences, and room plan.</p></div><button className="text-button filled" onClick={() => setCreating((value) => !value)}>＋ New class</button></section>
    {creating && <div className="create-card compact"><div><span className="section-kicker">NEW CLASS</span><h2>Start with a class name.</h2></div><input className="text-input" placeholder="e.g. Period 3 — Algebra II" value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleCreate()} autoFocus /><div className="segmented"><button className={newLayout === "pairs" ? "selected" : ""} onClick={() => setNewLayout("pairs")}>Pairs of two</button><button className={newLayout === "groups" ? "selected" : ""} onClick={() => setNewLayout("groups")}>Groups</button></div><button className="text-button filled" onClick={handleCreate} disabled={!newName.trim()}>Continue to setup →</button></div>}
    {loading ? <div className="hub-loading">Loading your classes…</div> : classes.length === 0 ? <div className="hub-empty"><h2>No classes yet</h2><p>Create your first class and build a thoughtful seating plan.</p><button className="text-button filled" onClick={() => setCreating(true)}>Create your first class</button></div> : <div className="class-list">{classes.map((cls, index) => <article className="class-list-row" key={cls.id}><span className="row-number">{String(index + 1).padStart(2, "0")}</span><div className="class-row-copy"><span className="row-kicker">{cls.layout === "pairs" ? "PAIRS" : "GROUPS"} · CLASSROOM</span><h2>{cls.name}</h2><p>Ready for your class details</p></div><div className="class-row-actions"><button className="text-button outlined" onClick={() => onNavigate("setup", cls.id)}>Edit setup</button><button className="text-button filled" onClick={() => onNavigate("planner", cls.id)}>Arrange room <span>→</span></button><button className="row-link" onClick={() => onNavigate("groupmaker", cls.id)}>Group Maker</button><button className="delete-inline" onClick={() => handleDelete(cls.id)} aria-label={`Delete ${cls.name}`}>×</button></div></article>)}</div>}
  </main></div>;
}
