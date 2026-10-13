import { useEffect, useState, useCallback } from "react";
import {
  fetchStudents, createStudent, updateStudent, deleteStudent,
  fetchConstraints, createConstraint, updateConstraint, deleteConstraint,
  updateClass, type StudentRow, type ConstraintRow, type ClassRow, type ConstraintStrength, type TeacherDeskPosition, type StudentPatch,
} from "../db";
import type { Page } from "../App";
import { SiteHeader } from "./Tools";
import { StudentSettings, GearIcon } from "./StudentSettings";

function studentTags(s: StudentRow, constraints: ConstraintRow[]) {
  const mine = constraints.filter((c) => c.student_a_id === s.id || c.student_b_id === s.id);
  const tags: { label: string; tone: string }[] = [];
  if (s.visibility === "low") tags.push({ label: "Needs front", tone: "red" });
  if (s.behavior === "high") tags.push({ label: "Needs watch", tone: "amber" });
  if (s.near_teacher) tags.push({ label: "Near teacher", tone: "green" });
  const apart = mine.filter((c) => c.strength !== "together").length;
  const together = mine.filter((c) => c.strength === "together").length;
  if (apart) tags.push({ label: `Apart · ${apart}`, tone: "red" });
  if (together) tags.push({ label: `Together · ${together}`, tone: "green" });
  if (s.notes?.trim()) tags.push({ label: "Note", tone: "neutral" });
  return tags;
}

export function Setup({ classId, classData, onNavigate, onClassUpdated }: {
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
  const [deskPos, setDeskPos] = useState<TeacherDeskPosition>(classData?.teacher_desk_position ?? "front");
  const [newName, setNewName] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);

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
    setDeskPos(classData?.teacher_desk_position ?? "front");
  }, [classData]);

  useEffect(() => {
    if (!classData || (name === classData.name && layout === classData.layout && deskPos === classData.teacher_desk_position)) return;
    const t = setTimeout(() => {
      updateClass(classId, { name, layout, teacher_desk_position: deskPos }).then(() => {
        onClassUpdated({ ...classData, name, layout, teacher_desk_position: deskPos });
      }).catch(console.error);
    }, 600);
    return () => clearTimeout(t);
  }, [name, layout, deskPos, classData, classId, onClassUpdated]);

  const addNames = async (names: string[]) => {
    const clean = names.map((n) => n.trim()).filter(Boolean);
    const created: StudentRow[] = [];
    try {
      for (const [i, n] of clean.entries()) created.push(await createStudent(classId, n, students.length + i));
    } catch (e) { console.error(e); }
    setStudents((prev) => [...prev, ...created]);
  };

  const handleAddOne = async () => {
    await addNames([newName || `Student ${students.length + 1}`]);
    setNewName("");
  };

  const handleAddBulk = async () => {
    await addNames(bulkText.split(/[\n,]/));
    setBulkText("");
    setBulkOpen(false);
  };

  const handleUpdateStudent = async (id: string, patch: StudentPatch) => {
    setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
    try { await updateStudent(id, patch); } catch (e) { console.error(e); }
  };

  const handleDeleteStudent = async (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setConstraints((prev) => prev.filter((c) => c.student_a_id !== id && c.student_b_id !== id));
    try { await deleteStudent(id); } catch (e) { console.error(e); }
  };

  const handleToggleLink = async (studentId: string, peerId: string, kind: "apart" | "together") => {
    const existing = constraints.filter((c) =>
      (c.student_a_id === studentId && c.student_b_id === peerId) || (c.student_a_id === peerId && c.student_b_id === studentId));
    const sameKind = existing.some((c) => (c.strength === "together") === (kind === "together"));
    setConstraints((prev) => prev.filter((c) => !existing.includes(c)));
    try {
      await Promise.all(existing.map((c) => deleteConstraint(c.id)));
      if (!sameKind) {
        const c = await createConstraint(classId, studentId, peerId, kind === "together" ? "together" : "hard");
        setConstraints((prev) => [...prev, c]);
      }
    } catch (e) { console.error(e); }
  };

  const handleStrength = async (c: ConstraintRow, strength: ConstraintStrength) => {
    setConstraints((prev) => prev.map((x) => x.id === c.id ? { ...x, strength } : x));
    try { await updateConstraint(c.id, { strength }); } catch (e) { console.error(e); }
  };

  const active = students.find((s) => s.id === settingsId) || null;

  return (
    <div className="page">
      <SiteHeader active="classes" onNavigate={onNavigate} />
      <div className="setup-nav">
        <button className="back-btn" data-testid="setup-back-btn" onClick={() => onNavigate("hub")}>← All classes</button>
        <button className="text-button filled" data-testid="setup-review-map-btn" onClick={() => onNavigate("planner", classId)} disabled={students.length === 0}>Review classroom map →</button>
      </div>

      <main className="setup-main">
        <section className="panel class-details" data-testid="class-details-panel">
          <div className="class-details-field">
            <label className="field-label">Class name</label>
            <input className="text-input" data-testid="class-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Class name" />
          </div>
          <div className="class-details-field">
            <label className="field-label">Seating layout</label>
            <div className="segmented">
              <button data-testid="layout-pairs-btn" className={layout === "pairs" ? "selected" : ""} onClick={() => setLayout("pairs")}>Pairs</button>
              <button data-testid="layout-groups-btn" className={layout === "groups" ? "selected" : ""} onClick={() => setLayout("groups")}>Groups (≤5)</button>
            </div>
          </div>
          <div className="class-details-field">
            <label className="field-label">Teacher desk</label>
            <div className="segmented">
              <button data-testid="desk-front-btn" className={deskPos === "front" ? "selected" : ""} onClick={() => setDeskPos("front")}>Front</button>
              <button data-testid="desk-back-btn" className={deskPos === "back" ? "selected" : ""} onClick={() => setDeskPos("back")}>Back</button>
            </div>
          </div>
          <div className="mini-stat" data-testid="student-count"><span>{students.length}</span><small>students</small></div>
        </section>

        <section className="panel students-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ROSTER</span>
              <h2>Students</h2>
              <p>Add your students here. Tap the <GearIcon size={12} /> next to a name to set visibility, behaviour, near-teacher and who to keep apart or together.</p>
            </div>
          </div>

          <div className="add-student-bar">
            <input className="text-input" data-testid="add-student-input" value={newName} placeholder="Type a student's name and press Enter"
              onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddOne()} />
            <button className="text-button filled" data-testid="add-student-btn" onClick={handleAddOne}>＋ Add student</button>
            <button className="text-button outlined" data-testid="paste-list-btn" onClick={() => setBulkOpen((v) => !v)}>Paste a list</button>
          </div>
          {bulkOpen && (
            <div className="bulk-add" data-testid="bulk-add-panel">
              <textarea className="text-input" data-testid="bulk-add-textarea" rows={5} value={bulkText} onChange={(e) => setBulkText(e.target.value)}
                placeholder={"One name per line (or comma separated)\nAva Patel\nNoah Kim"} />
              <div className="bulk-add-actions">
                <button className="ghost-pill" onClick={() => setBulkOpen(false)}>Cancel</button>
                <button className="text-button filled" data-testid="bulk-add-submit" onClick={handleAddBulk} disabled={!bulkText.trim()}>Add all</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-text">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="empty-hint" data-testid="students-empty">No students yet. Add your first student above.</div>
          ) : (
            <div className="roster-grid" data-testid="student-list">
              {students.map((s, i) => (
                <div key={s.id} className="roster-card" data-testid={`student-card-${i}`}>
                  <span className="roster-avatar">{(s.name || "?").trim().charAt(0).toUpperCase()}</span>
                  <div className="roster-copy">
                    <input className="roster-name" data-testid={`student-name-input-${i}`} value={s.name}
                      onChange={(e) => handleUpdateStudent(s.id, { name: e.target.value })} />
                    <div className="roster-tags">
                      {studentTags(s, constraints).map((t) => <span key={t.label} className={`tag ${t.tone}`}>{t.label}</span>)}
                    </div>
                  </div>
                  <button className="roster-gear" data-testid={`student-settings-btn-${i}`} onClick={() => setSettingsId(s.id)} title="Student settings" aria-label="Student settings"><GearIcon /></button>
                  <button className="delete-student" data-testid={`student-delete-btn-${i}`} onClick={() => handleDeleteStudent(s.id)} title="Remove">×</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {active && (
        <StudentSettings
          student={active}
          students={students}
          constraints={constraints}
          onClose={() => setSettingsId(null)}
          onUpdate={(patch) => handleUpdateStudent(active.id, patch)}
          onToggleLink={(peerId, kind) => handleToggleLink(active.id, peerId, kind)}
          onStrength={handleStrength}
        />
      )}
    </div>
  );
}
