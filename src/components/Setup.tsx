import { useEffect, useState, useCallback } from "react";
import {
  fetchStudents, createStudent, updateStudent, deleteStudent,
  fetchConstraints, createConstraint, updateConstraint, deleteConstraint,
  updateClass, type StudentRow, type ConstraintRow, type ClassRow, type Level, type ConstraintStrength,
} from "../db";
import { VIS_COLORS, BEH_COLORS, LEVEL_LABELS } from "../lib";
import type { Page } from "../App";
import { SiteHeader } from "./Tools";

export function Setup({
  classId,
  classData,
  onNavigate,
  onClassUpdated,
}: {
  classId: string;
  classData: ClassRow | null;
  onNavigate: (page: Page, classId?: string) => void;
  onClassUpdated: (cls: ClassRow) => void;
}) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [constraints, setConstraints] = useState<ConstraintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(classData?.name ?? "");
  const [layout, setLayout] = useState(classData?.layout ?? "pairs");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([fetchStudents(classId), fetchConstraints(classId)]);
      setStudents(s);
      setConstraints(c);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [classId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setName(classData?.name ?? "");
    setLayout(classData?.layout ?? "pairs");
  }, [classData]);

  // Debounced class name/layout save
  useEffect(() => {
    if (!classData || name === classData.name && layout === classData.layout) return;
    const t = setTimeout(() => {
      updateClass(classId, { name, layout }).then(() => {
        onClassUpdated({ ...classData, name, layout });
      }).catch(console.error);
    }, 600);
    return () => clearTimeout(t);
  }, [name, layout, classData, classId, onClassUpdated]);

  const handleAddStudent = async () => {
    try {
      const s = await createStudent(classId, `Student ${students.length + 1}`, students.length);
      setStudents((prev) => [...prev, s]);
    } catch (e) { console.error(e); }
  };

  const handleUpdateStudent = async (id: string, patch: Partial<Pick<StudentRow, "name" | "visibility" | "behavior">>) => {
    setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
    try { await updateStudent(id, patch); } catch (e) { console.error(e); }
  };

  const handleDeleteStudent = async (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setConstraints((prev) => prev.filter((c) => c.student_a_id !== id && c.student_b_id !== id));
    try { await deleteStudent(id); } catch (e) { console.error(e); }
  };

  const handleAddConstraint = async () => {
    if (students.length < 2) return;
    try {
      const c = await createConstraint(classId, students[0].id, students[1].id, "hard");
      setConstraints((prev) => [...prev, c]);
    } catch (e) { console.error(e); }
  };

  const handleUpdateConstraint = async (id: string, patch: Partial<Pick<ConstraintRow, "student_a_id" | "student_b_id" | "strength">>) => {
    setConstraints((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
    try { await updateConstraint(id, patch); } catch (e) { console.error(e); }
  };

  const handleDeleteConstraint = async (id: string) => {
    setConstraints((prev) => prev.filter((c) => c.id !== id));
    try { await deleteConstraint(id); } catch (e) { console.error(e); }
  };

  return (
    <div className="page">
      <SiteHeader active="classes" onNavigate={onNavigate} />
      <div className="setup-nav"><button className="back-btn" onClick={() => onNavigate("hub")}>← All classes</button><button className="text-button filled" onClick={() => onNavigate("planner", classId)} disabled={students.length === 0}>Review classroom map →</button></div>

      <main className="setup-main">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CLASS SETUP</span>
              <h2>Class details</h2>
            </div>
          </div>
          <label className="field-label">Class name</label>
          <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Class name" />
          <label className="field-label">Seating layout</label>
          <div className="segmented">
            <button className={layout === "pairs" ? "selected" : ""} onClick={() => setLayout("pairs")}>Pairs (2 seats)</button>
            <button className={layout === "groups" ? "selected" : ""} onClick={() => setLayout("groups")}>Groups (up to 5)</button>
          </div>
          <div className="mini-stat-row">
            <div className="mini-stat"><span>{students.length}</span><small>students</small></div>
            <div className="mini-stat"><span>{constraints.length}</span><small>rules</small></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Students</h2>
              <p>Rate each student's visibility and behavior: low, medium, or high.</p>
            </div>
            <button className="icon-btn" onClick={handleAddStudent} title="Add student">+</button>
          </div>

          {loading ? (
            <div className="loading-text">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="empty-hint">No students yet. Click + to add your first student.</div>
          ) : (
            <div className="student-list">
              <div className="student-list-header">
                <span>Name</span>
                <span>Visibility</span>
                <span>Behavior</span>
                <span></span>
                <span></span>
              </div>
              {students.map((s) => (
                <div key={s.id} className="student-row">
                  <input
                    className="student-name"
                    value={s.name}
                    onChange={(e) => handleUpdateStudent(s.id, { name: e.target.value })}
                  />
                  <select
                    value={s.visibility}
                    onChange={(e) => handleUpdateStudent(s.id, { visibility: e.target.value as Level })}
                    style={{ color: VIS_COLORS[s.visibility] }}
                  >
                    <option value="low">Low — needs front</option>
                    <option value="medium">Medium</option>
                    <option value="high">High — any seat</option>
                  </select>
                  <select
                    value={s.behavior}
                    onChange={(e) => handleUpdateStudent(s.id, { behavior: e.target.value as Level })}
                    style={{ color: BEH_COLORS[s.behavior] }}
                  >
                    <option value="low">Low — calm</option>
                    <option value="medium">Medium</option>
                    <option value="high">High — active</option>
                  </select>
                  <div className="student-tags">
                    <span className="tag" style={{ background: VIS_COLORS[s.visibility] + "1a", color: VIS_COLORS[s.visibility] }}>
                      Vis: {LEVEL_LABELS[s.visibility]}
                    </span>
                    <span className="tag" style={{ background: BEH_COLORS[s.behavior] + "1a", color: BEH_COLORS[s.behavior] }}>
                      Beh: {LEVEL_LABELS[s.behavior]}
                    </span>
                  </div>
                  <button className="delete-student" onClick={() => handleDeleteStudent(s.id)} title="Remove">×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Keep apart</h2>
              <p>Choose "Don't put together" (hard rule) or "Try not to put together" (soft preference).</p>
            </div>
            <button className="icon-btn" onClick={handleAddConstraint} title="Add rule" disabled={students.length < 2}>+</button>
          </div>
          {constraints.length === 0 ? (
            <div className="empty-hint">{students.length < 2 ? "Add at least 2 students first." : "No separation rules yet."}</div>
          ) : (
            <div className="constraint-list">
              {constraints.map((c) => (
                <div key={c.id} className="constraint-row">
                  <select value={c.student_a_id} onChange={(e) => handleUpdateConstraint(c.id, { student_a_id: e.target.value })}>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name || "Unnamed"}</option>)}
                  </select>
                  <span className="constraint-arrow">↔</span>
                  <select value={c.student_b_id} onChange={(e) => handleUpdateConstraint(c.id, { student_b_id: e.target.value })}>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name || "Unnamed"}</option>)}
                  </select>
                  <select
                    className="constraint-strength"
                    value={c.strength}
                    onChange={(e) => handleUpdateConstraint(c.id, { strength: e.target.value as ConstraintStrength })}
                  >
                    <option value="hard">Don't put together</option>
                    <option value="soft">Try not to put together</option>
                  </select>
                  <button className="delete-constraint" onClick={() => handleDeleteConstraint(c.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
