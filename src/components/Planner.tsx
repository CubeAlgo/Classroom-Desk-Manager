import { useEffect, useState, useCallback, useRef } from "react";
import { fetchStudents, fetchConstraints, type ConstraintRow, type ClassRow, type StudentRow, updateClass } from "../db";
import { generateArrangements, rescoreGroups, type Student, type Constraint, type Arrangement, type LayoutType } from "../engine";
import { VIS_COLORS, BEH_COLORS } from "../lib";
import type { Page } from "../App";
import { SiteHeader } from "./Tools";

interface DeskPosition { x: number; y: number; }

// Teacher desk Y positions: top strip or bottom strip (percent of canvas)
const TEACHER_FRONT_Y = 4;
const TEACHER_BACK_Y = 88;

export function Planner({
  classId, classData, onNavigate,
}: {
  classId: string;
  classData: ClassRow | null;
  onNavigate: (page: Page, classId?: string) => void;
}) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [constraints, setConstraints] = useState<ConstraintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentGroups, setCurrentGroups] = useState<Student[][]>([]);
  const [currentRotations, setCurrentRotations] = useState<number[]>([]);
  const [deskPositions, setDeskPositions] = useState<DeskPosition[]>([]);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  // Teacher desk X position (0-100 percent). Y is determined by front/back setting.
  const [teacherDeskX, setTeacherDeskX] = useState(35);

  const studentsRef = useRef(students);
  const constraintsRef = useRef(constraints);
  const lockedRef = useRef(lockedIds);
  const groupsRef = useRef(currentGroups);
  const rotationsRef = useRef(currentRotations);
  useEffect(() => { studentsRef.current = students; }, [students]);
  useEffect(() => { constraintsRef.current = constraints; }, [constraints]);
  useEffect(() => { lockedRef.current = lockedIds; }, [lockedIds]);
  useEffect(() => { groupsRef.current = currentGroups; }, [currentGroups]);
  useEffect(() => { rotationsRef.current = currentRotations; }, [currentRotations]);

  const layout: LayoutType = classData?.layout ?? "pairs";
  const teacherDeskAtFront: boolean = classData?.teacher_desk_position !== "back";
  const teacherDeskY = teacherDeskAtFront ? TEACHER_FRONT_Y : TEACHER_BACK_Y;

  const toEngineStudents = (rows: typeof students): Student[] =>
    rows.map((s) => ({ id: s.id, name: s.name, visibility: s.visibility, behavior: s.behavior, nearTeacher: s.near_teacher }));

  const toEngineConstraints = (rows: ConstraintRow[]): Constraint[] =>
    rows.map((c) => ({ aId: c.student_a_id, bId: c.student_b_id, strength: c.strength }));

  const selected = arrangements.find((a) => a.id === selectedId) || null;

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

  const buildInitialPositions = (count: number): DeskPosition[] => {
    const yStart = teacherDeskAtFront ? 22 : 12;
    return Array.from({ length: count }, (_, i) => ({
      x: 10 + (i % 4) * 22,
      y: yStart + Math.floor(i / 4) * 32,
    }));
  };

  const doGenerate = useCallback(() => {
    const s = studentsRef.current;
    const c = constraintsRef.current;
    if (s.length === 0) return;
    const es = toEngineStudents(s);
    const ec = toEngineConstraints(c);
    const results = generateArrangements({
      students: es,
      constraints: ec,
      layout,
      lockedIds: lockedRef.current,
      currentGroups: groupsRef.current,
      currentRotations: rotationsRef.current,
      teacherDeskAtFront,
    });
    setArrangements(results);
    if (results.length > 0) {
      setSelectedId(results[0].id);
      setCurrentGroups(results[0].groups);
      setCurrentRotations(results[0].rotations);
      setDeskPositions((prev) =>
        results[0].groups.map((_, gi) => prev[gi] ?? buildInitialPositions(results[0].groups.length)[gi])
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, teacherDeskAtFront]);

  useEffect(() => {
    if (!loading && students.length > 0 && arrangements.length === 0) doGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, students.length]);

  const handleSelectArrangement = (a: Arrangement) => {
    setSelectedId(a.id);
    setCurrentGroups(a.groups);
    setCurrentRotations(a.rotations);
    setDeskPositions((prev) =>
      a.groups.map((_, gi) => prev[gi] ?? buildInitialPositions(a.groups.length)[gi])
    );
  };

  const handleToggleLock = (studentId: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  };

  const handleMoveStudent = (fromGroup: number, fromSeat: number, toGroup: number, toSeat: number) => {
    if (fromGroup === toGroup && fromSeat === toSeat) return;
    const newGroups = currentGroups.map((g) => [...g]);
    const fromStudent = newGroups[fromGroup]?.[fromSeat];
    const toStudent = newGroups[toGroup]?.[toSeat];
    if (!fromStudent || lockedIds.has(fromStudent.id)) return;
    if (toStudent && lockedIds.has(toStudent.id)) return;

    if (toStudent) {
      newGroups[fromGroup][fromSeat] = toStudent;
      newGroups[toGroup][toSeat] = fromStudent;
    } else {
      newGroups[fromGroup].splice(fromSeat, 1);
      newGroups[toGroup].splice(toSeat, 0, fromStudent);
    }
    setCurrentGroups(newGroups);
    const ec = toEngineConstraints(constraintsRef.current);
    const m = rescoreGroups(newGroups, ec, lockedIds, teacherDeskAtFront);
    setArrangements((prev) => prev.map((a) => a.id === selectedId ? { ...a, groups: newGroups, ...m } : a));
  };

  const handleRotate = (gi: number, delta: number) => {
    setCurrentRotations((prev) => {
      const next = [...prev];
      next[gi] = (next[gi] || 0) + delta;
      setArrangements((arr) => arr.map((a) => a.id === selectedId ? { ...a, rotations: next } : a));
      return next;
    });
  };

  const handleMoveDeskPosition = (gi: number, pos: DeskPosition) => {
    setDeskPositions((prev) => {
      const next = [...prev];
      next[gi] = pos;
      return next;
    });
  };

  const handleMoveTeacherDesk = (x: number) => {
    // Constrain: keep desk within 10%-70% horizontally (avoid corners)
    const clamped = Math.max(10, Math.min(70, x));
    setTeacherDeskX(clamped);
  };

  const handleToggleTeacherDeskSide = () => {
    const newPos = teacherDeskAtFront ? "back" : "front";
    updateClass(classId, { teacher_desk_position: newPos }).catch(console.error);
    // Optimistically update local state through parent — but we can also just
    // force a refresh by updating classData in the parent via onNavigate hack.
    // Simpler: just update our local view.
    if (classData) {
      const updated = { ...classData, teacher_desk_position: newPos };
      // Notify parent through navigate (stays on same page)
      onNavigate("planner", classId);
    }
  };

  const ec = toEngineConstraints(constraints);
  const insight = selected ? rescoreGroups(currentGroups, ec, lockedIds, teacherDeskAtFront) : null;

  if (loading) {
    return <div className="site-shell"><SiteHeader active="classes" onNavigate={onNavigate} /><div className="loading-text" style={{ padding: "80px 32px" }}>Loading planner…</div></div>;
  }

  return (
    <div className="site-shell planner-shell">
      <SiteHeader active="classes" onNavigate={onNavigate} />
      <div className="planner-subheader">
        <div className="planner-subheader-left">
          <button className="ghost-pill" onClick={() => onNavigate("hub")}>← All classes</button>
          <button className="ghost-pill" onClick={() => onNavigate("setup", classId)}>← Edit setup</button>
          <div className="planner-title-block">
            <span className="section-kicker">CLASSROOM MAP</span>
            <h1 className="planner-title">{classData?.name || "Untitled class"}</h1>
          </div>
        </div>
        <div className="planner-subheader-right">
          {lockedIds.size > 0 && <span className="locked-pill">{lockedIds.size} locked</span>}
          <div className="planner-legend">
            <span className="legend-dot green" /> Locked
            <span className="legend-dot amber" style={{ marginLeft: 10 }} /> Soft conflict
            <span className="legend-dot red" style={{ marginLeft: 10 }} /> Hard conflict
          </div>
          <button className="ghost-pill" onClick={handleToggleTeacherDeskSide}>
            Desk: {teacherDeskAtFront ? "Front" : "Back"} (swap)
          </button>
          <button className="text-button filled" onClick={doGenerate}>Regenerate</button>
        </div>
      </div>

      <div className="planner-body">
        <div className="planner-canvas-col">
          <div className="board-strip">WHITEBOARD</div>
          <div className="classroom-canvas" id="classroom-canvas">
            <TeacherDesk
              x={teacherDeskX}
              y={teacherDeskY}
              onMove={handleMoveTeacherDesk}
            />
            {currentGroups.length === 0 ? (
              <div className="empty-classroom">Click Regenerate to create seating arrangements.</div>
            ) : (
              currentGroups.map((group, gi) => (
                <DraggableTableGroup
                  key={gi}
                  group={group}
                  groupIndex={gi}
                  layout={layout}
                  rotation={currentRotations[gi] || 0}
                  position={deskPositions[gi] || buildInitialPositions(currentGroups.length)[gi]}
                  lockedIds={lockedIds}
                  constraints={ec}
                  onMoveStudent={handleMoveStudent}
                  onRotate={handleRotate}
                  onMoveDesk={handleMoveDeskPosition}
                  onToggleLock={handleToggleLock}
                />
              ))
            )}
          </div>
        </div>

        <div className="planner-right-col">
          <section className="right-panel">
            <div className="right-panel-head">
              <span className="section-kicker">CANDIDATES</span>
              <h3>Arrangements</h3>
              <span className="count-pill">{arrangements.length}</span>
            </div>
            {arrangements.length === 0 ? (
              <p className="muted-text">No arrangements yet — click Regenerate.</p>
            ) : (
              <div className="candidate-list">
                {arrangements.map((a) => (
                  <div key={a.id} className={`candidate-card ${a.id === selectedId ? "selected" : ""}`} onClick={() => handleSelectArrangement(a)}>
                    <div className="candidate-score">{a.score}</div>
                    <div>
                      <div className="candidate-title">{a.name}</div>
                      <div className="candidate-detail">Vis {a.visibility}% · Beh {a.behavior}% · {a.hardViolations} hard</div>
                    </div>
                    <span className={`status-chip ${a.hardViolations === 0 ? "green" : "red"}`}>{a.hardViolations === 0 ? "Clean" : "Review"}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="right-panel">
            <div className="right-panel-head">
              <span className="section-kicker">INSIGHT</span>
              <h3>Why this arrangement?</h3>
            </div>
            {insight ? (
              <>
                <div className="insight-score-display">{insight.score}<small>/100</small></div>
                <ul className="insight-list">
                  <li>{insight.visibility}% visibility fit across the class.</li>
                  <li>{insight.behavior}% behavior-balancing score.</li>
                  <li>{insight.hardViolations === 0 ? "All hard separation rules satisfied." : `${insight.hardViolations} hard conflict${insight.hardViolations === 1 ? "" : "s"} remain.`}</li>
                  {insight.softViolations > 0 && <li>{insight.softViolations} soft preference conflict{insight.softViolations === 1 ? "" : "s"} remain.</li>}
                  {lockedIds.size > 0 && <li>{lockedIds.size} locked student{lockedIds.size === 1 ? "" : "s"} kept in place.</li>}
                </ul>
                <p className="insight-note">Tip: click any seat to lock it, then Regenerate to keep those students in place. Drag the teacher's desk to reposition it along the front or back wall.</p>
              </>
            ) : (
              <p className="muted-text">Select a candidate above to see what was prioritized.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Teacher Desk (draggable horizontally along front or back wall) ──

function TeacherDesk({ x, y, onMove }: { x: number; y: number; onMove: (x: number) => void }) {
  const dragRef = useRef<{ startX: number; startXPercent: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragging(true);
    dragRef.current = { startX: e.clientX, startXPercent: x };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    const canvas = document.getElementById("classroom-canvas");
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    onMove(dragRef.current.startXPercent + dx);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragging(false);
    dragRef.current = null;
  };

  return (
    <div
      className={`teacher-desk ${dragging ? "dragging" : ""}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title="Drag to reposition along the wall"
    >
      <span>Teacher's Desk</span>
    </div>
  );
}

// ── DraggableTableGroup ────────────────────────────────────────────

function DraggableTableGroup({
  group, groupIndex, layout, rotation, position, lockedIds, constraints,
  onMoveStudent, onRotate, onMoveDesk, onToggleLock,
}: {
  group: Student[];
  groupIndex: number;
  layout: LayoutType;
  rotation: number;
  position: DeskPosition;
  lockedIds: Set<string>;
  constraints: Constraint[];
  onMoveStudent: (fg: number, fs: number, tg: number, ts: number) => void;
  onRotate: (gi: number, delta: number) => void;
  onMoveDesk: (gi: number, pos: DeskPosition) => void;
  onToggleLock: (id: string) => void;
}) {
  const [seatDragOver, setSeatDragOver] = useState<number | null>(null);
  const seatDragRef = useRef<{ group: number; seat: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const rotateRef = useRef<{ startAngle: number; startRot: number } | null>(null);
  const deskDragRef = useRef<{ startX: number; startY: number; startPos: DeskPosition } | null>(null);
  const [isDraggingDesk, setIsDraggingDesk] = useState(false);

  const label = layout === "pairs" ? `Desk ${groupIndex + 1}` : `Group ${groupIndex + 1}`;
  const isPair = layout === "pairs";

  const groupIds = new Set(group.map((s) => s.id));
  const conflictMap = new Map<string, "hard" | "soft">();
  for (const c of constraints) {
    if (c.strength !== "together" && groupIds.has(c.aId) && groupIds.has(c.bId)) {
      const sev = c.strength;
      const ea = conflictMap.get(c.aId);
      const eb = conflictMap.get(c.bId);
      if (!ea || (ea === "soft" && sev === "hard")) conflictMap.set(c.aId, sev);
      if (!eb || (eb === "soft" && sev === "hard")) conflictMap.set(c.bId, sev);
    }
  }

  const handleSeatDragStart = (si: number) => { seatDragRef.current = { group: groupIndex, seat: si }; };
  const handleSeatDrop = (si: number) => {
    if (seatDragRef.current) { onMoveStudent(seatDragRef.current.group, seatDragRef.current.seat, groupIndex, si); seatDragRef.current = null; }
    setSeatDragOver(null);
  };

  const getAngle = (e: React.PointerEvent) => {
    const el = tableRef.current; if (!el) return 0;
    const r = el.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const onRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    rotateRef.current = { startAngle: getAngle(e), startRot: rotation };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onRotateMove = (e: React.PointerEvent) => {
    if (!rotateRef.current) return;
    e.stopPropagation();
    onRotate(groupIndex, rotateRef.current.startRot + (getAngle(e) - rotateRef.current.startAngle) - rotation);
  };
  const onRotateEnd = (e: React.PointerEvent) => { e.stopPropagation(); rotateRef.current = null; };

  const onDeskDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".rotate-controls, .seat, .teacher-desk")) return;
    e.stopPropagation();
    setIsDraggingDesk(true);
    const canvas = document.getElementById("classroom-canvas");
    const canvasRect = canvas?.getBoundingClientRect();
    if (!canvasRect) return;
    deskDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: { ...position },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDeskDragMove = (e: React.PointerEvent) => {
    if (!deskDragRef.current) return;
    const canvas = document.getElementById("classroom-canvas");
    const canvasRect = canvas?.getBoundingClientRect();
    if (!canvasRect) return;
    const dx = ((e.clientX - deskDragRef.current.startX) / canvasRect.width) * 100;
    const dy = ((e.clientY - deskDragRef.current.startY) / canvasRect.height) * 100;
    onMoveDesk(groupIndex, {
      x: Math.max(0, Math.min(80, deskDragRef.current.startPos.x + dx)),
      y: Math.max(0, Math.min(82, deskDragRef.current.startPos.y + dy)),
    });
  };
  const onDeskDragEnd = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingDesk(false);
    deskDragRef.current = null;
  };

  return (
    <div
      className={`table-group ${isDraggingDesk ? "dragging-desk" : ""}`}
      style={{ position: "absolute", left: `${position.x}%`, top: `${position.y}%`, transform: `rotate(${rotation}deg)` }}
      onPointerDown={onDeskDragStart}
      onPointerMove={onDeskDragMove}
      onPointerUp={onDeskDragEnd}
    >
      <div className="table-group-header">
        <span className="unit-label">{label}</span>
        <div className="rotate-controls" onClick={(e) => e.stopPropagation()}>
          <button className="rotate-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRotate(groupIndex, -15)}>↺</button>
          <div className="rotate-handle" onPointerDown={onRotateStart} onPointerMove={onRotateMove} onPointerUp={onRotateEnd}>⟳</div>
          <button className="rotate-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRotate(groupIndex, 15)}>↻</button>
          <button className="rotate-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRotate(groupIndex, -rotation)}>⤾</button>
        </div>
      </div>

      <div className="table-container" ref={tableRef}>
        <div className={`table-surface ${isPair ? "pair-surface" : "group-surface"}`}>
          <span className="table-surface-label">{label}</span>
        </div>
        <div className={`seats-container ${isPair ? "pair-seats" : "group-seats"}`}>
          {group.map((student, si) => {
            const isLocked = lockedIds.has(student.id);
            const conflict = conflictMap.get(student.id);
            return (
              <div
                key={student.id}
                className={`seat ${isLocked ? "locked" : ""} ${conflict ? `conflict-${conflict}` : ""}`}
                draggable={!isLocked}
                onDragStart={(e) => { e.stopPropagation(); handleSeatDragStart(si); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setSeatDragOver(si); }}
                onDragLeave={() => setSeatDragOver(null)}
                onDrop={(e) => { e.stopPropagation(); handleSeatDrop(si); }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onToggleLock(student.id); }}
                title={isLocked ? "Locked — click to unlock" : "Click to lock · Drag to move"}
                style={seatDragOver === si ? { outline: "2px dashed #3a8c5c", outlineOffset: "2px" } : undefined}
              >
                <div className="seat-inner">
                  <span className="seat-name">{student.name || "?"}</span>
                  <div className="seat-badges">
                    <span className="badge" style={{ background: VIS_COLORS[student.visibility] + "20", color: VIS_COLORS[student.visibility] }} title={`Visibility: ${student.visibility}`}>V</span>
                    <span className="badge" style={{ background: BEH_COLORS[student.behavior] + "20", color: BEH_COLORS[student.behavior] }} title={`Behavior: ${student.behavior}`}>B</span>
                    {student.nearTeacher && <span className="badge near-teacher-badge" title="Needs to sit near teacher">★</span>}
                    {isLocked && <span className="badge lock-badge">🔒</span>}
                    {conflict === "hard" && <span className="badge conflict-badge hard" title="Hard conflict — must separate">!</span>}
                    {conflict === "soft" && <span className="badge conflict-badge soft" title="Soft conflict — prefer separate">~</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
