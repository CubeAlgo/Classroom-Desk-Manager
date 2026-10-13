import { useState, useCallback, useEffect } from "react";
import { fetchClasses, fetchStudents, fetchConstraints, type ClassRow, type StudentRow, type ConstraintRow } from "../db";
import { generateArrangements, type Arrangement, type Student, type Constraint } from "../engine";
import { VIS_COLORS, BEH_COLORS } from "../lib";
import { SiteHeader } from "./Tools";
import type { Page } from "../App";

export function GroupMaker({ onNavigate, classId }: { onNavigate: (page: Page, classId?: string) => void; classId?: string }) {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classId ?? null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [constraints, setConstraints] = useState<ConstraintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupSize, setGroupSize] = useState(3);
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses().then(setClasses).catch(console.error);
  }, []);

  const loadClass = useCallback(async (cid: string) => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([fetchStudents(cid), fetchConstraints(cid)]);
      setStudents(s);
      setConstraints(c);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedClassId) loadClass(selectedClassId);
  }, [selectedClassId, loadClass]);

  const toEngineStudents = (rows: StudentRow[]): Student[] =>
    rows.map((s) => ({ id: s.id, name: s.name, visibility: s.visibility, behavior: s.behavior, nearTeacher: s.near_teacher }));

  const toEngineConstraints = (rows: ConstraintRow[]): Constraint[] =>
    rows.map((c) => ({ aId: c.student_a_id, bId: c.student_b_id, strength: c.strength }));

  const handleGenerate = () => {
    if (students.length < 2) return;
    const es = toEngineStudents(students);
    const ec = toEngineConstraints(constraints);
    const results = generateArrangements({
      students: es,
      constraints: ec,
      layout: "groups",
      lockedIds: new Set(),
      currentGroups: [],
      currentRotations: [],
      targetGroupSize: groupSize,
      teacherDeskAtFront: true,
      count: 5,
    });
    setArrangements(results);
    if (results.length > 0) setSelectedId(results[0].id);
  };

  const selected = arrangements.find((a) => a.id === selectedId) || null;
  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;

  return (
    <div className="site-shell">
      <SiteHeader active="tools" onNavigate={onNavigate} />
      <main className="gm-main">
        <section className="gm-intro">
          <span className="section-kicker">CLASSROOM TOOL</span>
          <h1>Make groups<br />that work together.</h1>
          <p>Pick a class, choose your group size, and get balanced groupings that respect visibility, behavior, and separation rules.</p>
        </section>

        {!selectedClassId ? (
          <section className="gm-class-picker">
            <h2>Pick a class</h2>
            {classes.length === 0 ? (
              <div className="empty-hint">No classes yet. Create one in My Classes first.</div>
            ) : (
              <div className="gm-class-grid">
                {classes.map((cls) => (
                  <button key={cls.id} className="gm-class-card" onClick={() => setSelectedClassId(cls.id)}>
                    <span className="row-kicker">{cls.layout === "pairs" ? "PAIRS" : "GROUPS"}</span>
                    <h3>{cls.name}</h3>
                    <span className="gm-class-go">Select →</span>
                  </button>
                ))}
              </div>
            )}
            <button className="text-button outlined" style={{ marginTop: 16 }} onClick={() => onNavigate("hub")}>Go to My Classes →</button>
          </section>
        ) : loading ? (
          <div className="loading-text">Loading students…</div>
        ) : (
          <div className="gm-workspace">
            <div className="gm-controls">
              <button className="ghost-pill" onClick={() => { setSelectedClassId(null); setArrangements([]); }}>← Change class</button>
              <div className="gm-class-info">
                <span className="section-kicker">CLASS</span>
                <h2>{selectedClass?.name || "Untitled"}</h2>
              </div>
              <div className="gm-size-control">
                <label className="field-label">Group size</label>
                <div className="gm-size-buttons">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <button key={n} className={groupSize === n ? "selected" : ""} onClick={() => setGroupSize(n)}>{n}</button>
                  ))}
                </div>
              </div>
              <button className="text-button filled" onClick={handleGenerate} disabled={students.length < 2}>
                Generate groups →
              </button>
            </div>

            {arrangements.length > 0 && (
              <div className="gm-results">
                <div className="gm-candidates">
                  {arrangements.map((a) => (
                    <button
                      key={a.id}
                      className={`gm-candidate ${a.id === selectedId ? "selected" : ""}`}
                      onClick={() => setSelectedId(a.id)}
                    >
                      <span className="gm-candidate-score">{a.score}</span>
                      <span className="gm-candidate-name">{a.name}</span>
                      <span className={`status-chip ${a.hardViolations === 0 ? "green" : "red"}`}>
                        {a.hardViolations === 0 ? "Clean" : "Review"}
                      </span>
                    </button>
                  ))}
                </div>

                {selected && (
                  <div className="gm-groups-display">
                    <div className="gm-groups-header">
                      <h3>{selected.name} — {selected.groups.length} groups</h3>
                      <span className="gm-stat">Score {selected.score}/100</span>
                    </div>
                    <div className="gm-groups-grid">
                      {selected.groups.map((group, gi) => (
                        <div key={gi} className="gm-group-card">
                          <span className="gm-group-num">Group {gi + 1}</span>
                          <div className="gm-group-members">
                            {group.map((s) => (
                              <div key={s.id} className="gm-member">
                                <span className="gm-member-name">{s.name || "?"}</span>
                                <div className="seat-badges">
                                  <span className="badge" style={{ background: VIS_COLORS[s.visibility] + "20", color: VIS_COLORS[s.visibility] }} title={`Visibility: ${s.visibility}`}>V</span>
                                  <span className="badge" style={{ background: BEH_COLORS[s.behavior] + "20", color: BEH_COLORS[s.behavior] }} title={`Behavior: ${s.behavior}`}>B</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
