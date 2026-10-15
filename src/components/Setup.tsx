import { useEffect, useState, useCallback } from "react";
import {
  fetchStudents, createStudent, updateStudent, deleteStudent,
  fetchConstraints, createConstraint, updateConstraint, deleteConstraint,
  updateClass, type StudentRow, type ConstraintRow, type ClassRow, type ConstraintStrength, type TeacherDeskPosition, type StudentPatch,
} from "../db";
import type { Page } from "../App";
import { SiteHeader } from "./Tools";
import { StudentSettings, GearIcon } from "./StudentSettings";
import { KidAvatar } from "./KidAvatar";
import { LAYOUTS } from "../lib";

const CLIP = "desk-planner-clipboard";
type ClipStudent = StudentPatch & { key: string; name: string };
type Clip = { fromClassId: string; students: ClipStudent[]; constraints: { a: string; b: string; strength: ConstraintStrength }[] };
const readClip = (): Clip | null => { try { return JSON.parse(localStorage.getItem(CLIP) || "null"); } catch { return null; } };
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const KEY = isMac ? "⌘" : "Ctrl+";

function studentTags(s: StudentRow, constraints: ConstraintRow[]) {
  const mine = constraints.filter((c) => c.student_a_id === s.id || c.student_b_id === s.id);
  const tags: { label: string; tone: string }[] = [];
  if (s.visibility === "low") tags.push({ label: "Needs front", tone: "red" });
  if (s.behavior === "high") tags.push({ label: "Needs watch", tone: "amber" });
  if (s.near_teacher) tags.push({ label: "Near teacher", tone: "green" });
  if (s.hearing === "low") tags.push({ label: "Hearing", tone: "red" });
  if (s.esl) tags.push({ label: "ESL", tone: "sky" });
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
  const [addError, setAddError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clip, setClip] = useState<Clip | null>(readClip);
  const [notice, setNotice] = useState("");

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
    const taken = new Set(students.map((s) => s.name.trim().toLowerCase()));
    const clean: string[] = [];
    const dupes: string[] = [];
    for (const raw of names) {
      const n = raw.trim();
      if (!n) continue;
      if (taken.has(n.toLowerCase())) { dupes.push(n); continue; }
      taken.add(n.toLowerCase());
      clean.push(n);
    }
    setAddError(dupes.length ? `Already in this class: ${dupes.join(", ")}. Each student needs a unique name.` : "");
    const created: StudentRow[] = [];
    try {
      for (const [i, n] of clean.entries()) created.push(await createStudent(classId, n, students.length + i));
    } catch (e) { console.error(e); }
    setStudents((prev) => [...prev, ...created]);
    return dupes.length === 0;
  };

  const nextDefaultName = () => {
    const taken = new Set(students.map((s) => s.name.trim().toLowerCase()));
    let n = students.length + 1;
    while (taken.has(`student ${n}`)) n++;
    return `Student ${n}`;
  };

  const handleAddOne = async () => {
    if (await addNames([newName || nextDefaultName()])) setNewName("");
  };

  const handleAddBulk = async () => {
    await addNames(bulkText.split(/[\n,]/));
    setBulkText("");
    setBulkOpen(false);
  };

  const isDuplicate = (id: string, name: string) =>
    students.some((s) => s.id !== id && s.name.trim().toLowerCase() === name.trim().toLowerCase());

  const handleUpdateStudent = async (id: string, patch: StudentPatch) => {
    setStudents((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
    if (patch.name !== undefined && (!patch.name.trim() || isDuplicate(id, patch.name))) return;
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

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const copySelected = useCallback(() => {
    const picked = students.filter((s) => selectedIds.has(s.id));
    if (!picked.length) return;
    const ids = new Set(picked.map((s) => s.id));
    const data: Clip = {
      fromClassId: classId,
      students: picked.map((s) => ({ key: s.id, name: s.name, visibility: s.visibility, behavior: s.behavior, near_teacher: s.near_teacher, notes: s.notes, hearing: s.hearing, esl: s.esl, avatar: s.avatar })),
      constraints: constraints.filter((c) => ids.has(c.student_a_id) && ids.has(c.student_b_id)).map((c) => ({ a: c.student_a_id, b: c.student_b_id, strength: c.strength })),
    };
    localStorage.setItem(CLIP, JSON.stringify(data));
    setClip(data);
    setNotice(`Copied ${picked.length} student${picked.length === 1 ? "" : "s"}. Open another class and press ${KEY}V to paste.`);
  }, [students, selectedIds, constraints, classId]);

  const pasteClip = useCallback(async () => {
    const data = readClip();
    if (!data?.students.length) return;
    const taken = new Set(students.map((s) => s.name.trim().toLowerCase()));
    const idMap = new Map<string, string>();
    const created: StudentRow[] = [];
    let skipped = 0;
    try {
      for (const { key, name: n, ...extra } of data.students) {
        if (taken.has(n.trim().toLowerCase())) { skipped++; continue; }
        taken.add(n.trim().toLowerCase());
        const row = await createStudent(classId, n, students.length + created.length, extra);
        idMap.set(key, row.id);
        created.push(row);
      }
      const links: ConstraintRow[] = [];
      for (const c of data.constraints) {
        const a = idMap.get(c.a), b = idMap.get(c.b);
        if (a && b) links.push(await createConstraint(classId, a, b, c.strength));
      }
      setStudents((prev) => [...prev, ...created]);
      setConstraints((prev) => [...prev, ...links]);
    } catch (e) { console.error(e); }
    setNotice(`Pasted ${created.length} student${created.length === 1 ? "" : "s"}${skipped ? ` · ${skipped} already here` : ""}.`);
  }, [students, classId]);

  const removeSelected = async () => {
    const ids = [...selectedIds];
    setSelectedIds(new Set());
    for (const id of ids) await handleDeleteStudent(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select") || !(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "c" && selectedIds.size) { e.preventDefault(); copySelected(); }
      if (k === "v" && readClip()) { e.preventDefault(); pasteClip(); }
      if (k === "a" && students.length) { e.preventDefault(); setSelectedIds(new Set(students.map((s) => s.id))); }
    };
    const onFocus = () => setClip(readClip());
    window.addEventListener("keydown", onKey);
    window.addEventListener("focus", onFocus);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("focus", onFocus); };
  }, [selectedIds, copySelected, pasteClip, students]);

  const active = students.find((s) => s.id === settingsId) || null;

  return (
    <div className="page">
      <SiteHeader active="classes" onNavigate={onNavigate} />
      <div className="setup-nav">
        <button className="back-btn" data-testid="setup-back-btn" onClick={() => onNavigate("hub")}>← All classes</button>
        <button className="text-button filled map-cta" data-testid="setup-review-map-btn" onClick={() => onNavigate("planner", classId)} disabled={students.length === 0} title={students.length === 0 ? "Add students first" : ""}><span className="map-cta-copy"><b>See seating arrangements</b><small>{students.length === 0 ? "Add students first" : `${students.length} students · 5 options ready`}</small></span><span className="map-cta-arrow">→</span></button>
      </div>

      <main className="setup-main">
        <section className="panel class-details" data-testid="class-details-panel">
          <div className="class-details-field">
            <label className="field-label">Class name</label>
            <input className="text-input" data-testid="class-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Class name" />
          </div>
          <div className="class-details-field">
            <label className="field-label">Seating layout</label>
            <div className="segmented five">
              {LAYOUTS.map((l) => (
                <button key={l.id} data-testid={`layout-${l.id}-btn`} className={layout === l.id ? "selected" : ""} onClick={() => setLayout(l.id)} title={l.desc}>{l.short}</button>
              ))}
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
            <input className={`text-input ${newName.trim() && isDuplicate("", newName) ? "invalid" : ""}`} data-testid="add-student-input" value={newName} placeholder="Type a student's name and press Enter"
              onChange={(e) => { setNewName(e.target.value); setAddError(""); }} onKeyDown={(e) => e.key === "Enter" && handleAddOne()} />
            <button className="text-button filled" data-testid="add-student-btn" onClick={handleAddOne} disabled={!!newName.trim() && isDuplicate("", newName)}>＋ Add student</button>
            <button className="text-button outlined" data-testid="paste-list-btn" onClick={() => setBulkOpen((v) => !v)}>Paste a list</button>
          </div>
          {(addError || (newName.trim() && isDuplicate("", newName))) && (
            <p className="field-error" data-testid="add-student-error">{addError || `"${newName.trim()}" is already in this class. Try adding a last initial.`}</p>
          )}
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

          {(selectedIds.size > 0 || (clip && clip.students.length > 0) || notice) && (
            <div className="select-bar" data-testid="select-bar">
              {selectedIds.size > 0 ? (
                <>
                  <b>{selectedIds.size} selected</b>
                  <button className="text-button filled" data-testid="copy-selected-btn" onClick={copySelected}>Copy <kbd>{KEY}C</kbd></button>
                  <button className="text-button outlined" data-testid="remove-selected-btn" onClick={removeSelected}>Remove from class</button>
                  <button className="ghost-pill" data-testid="clear-selection-btn" onClick={() => setSelectedIds(new Set())}>Clear</button>
                </>
              ) : <span className="select-hint">Tip: tick students to copy them into another class</span>}
              {clip && clip.students.length > 0 && (
                <button className="text-button outlined paste-btn" data-testid="paste-students-btn" onClick={pasteClip}>Paste {clip.students.length} copied <kbd>{KEY}V</kbd></button>
              )}
              {notice && <span className="select-notice" data-testid="select-notice">{notice}</span>}
            </div>
          )}

          {loading ? (
            <div className="loading-text">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="empty-hint" data-testid="students-empty">No students yet. Add your first student above.</div>
          ) : (
            <div className="roster-grid" data-testid="student-list">
              {students.map((s, i) => {
                const dupe = !s.name.trim() || isDuplicate(s.id, s.name);
                return (
                <div key={s.id} className={`roster-card ${dupe ? "invalid" : ""} ${selectedIds.has(s.id) ? "picked" : ""}`} data-testid={`student-card-${i}`}>
                  <button className={`pick-box ${selectedIds.has(s.id) ? "on" : ""}`} data-testid={`student-select-${i}`} onClick={() => toggleSelect(s.id)} aria-label="Select student">{selectedIds.has(s.id) ? "✓" : ""}</button>
                  <KidAvatar avatar={s.avatar} fallback={`S${i + 1}`} className="roster-avatar" />
                  <div className="roster-copy">
                    <input className="roster-name" data-testid={`student-name-input-${i}`} value={s.name}
                      onChange={(e) => handleUpdateStudent(s.id, { name: e.target.value })} />
                    {dupe && <p className="field-error" data-testid={`student-name-error-${i}`}>{s.name.trim() ? "Name already used — not saved" : "Name can't be empty"}</p>}
                    <div className="roster-tags">
                      {studentTags(s, constraints).map((t) => <span key={t.label} className={`tag ${t.tone}`}>{t.label}</span>)}
                    </div>
                  </div>
                  <button className="roster-gear" data-testid={`student-settings-btn-${i}`} onClick={() => setSettingsId(s.id)} title="Student settings" aria-label="Student settings"><GearIcon /></button>
                  <button className="delete-student" data-testid={`student-delete-btn-${i}`} onClick={() => handleDeleteStudent(s.id)} title="Remove">×</button>
                </div>
                );
              })}
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
