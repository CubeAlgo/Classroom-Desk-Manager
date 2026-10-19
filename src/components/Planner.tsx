import { useEffect, useState, useCallback, useRef } from "react";
import { fetchStudents, fetchConstraints, type ConstraintRow, type ClassRow, type StudentRow, updateClass } from "../db";
import { fromRow, generateArrangements, rescoreGroups, getCapacities, type Student, type Constraint, type Arrangement, type LayoutType } from "../engine";
import { VIS_COLORS, BEH_COLORS } from "../lib";
import type { Page } from "../App";
import { SiteHeader } from "./Tools";
import { KidAvatar } from "./KidAvatar";
import { RoomViewport } from "./RoomViewport";
import { layoutSize } from "../lib";
import { getRoomLayout, saveRoomLayout, listPlans, savePlan, deletePlan, type SavedPlan } from "../plans";

interface DeskPosition { x: number; y: number; }

// Teacher desk Y positions: top strip or bottom strip (percent of canvas)
const TEACHER_FRONT_Y = 4;
const TEACHER_BACK_Y = 88;
const ROOM_W = 1200;
const GAP_X = 36;
const GAP_Y = 44;
const FOOTPRINTS: Record<number, { w: number; h: number }> = {
  1: { w: 110, h: 104 }, 2: { w: 200, h: 104 }, 3: { w: 270, h: 150 }, 4: { w: 270, h: 150 }, 5: { w: 270, h: 200 },
};

export function Planner({
  classId, classData, onNavigate, onClassUpdated,
}: {
  classId: string;
  classData: ClassRow | null;
  onNavigate: (page: Page, classId?: string) => void;
  onClassUpdated: (cls: ClassRow) => void;
}) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [constraints, setConstraints] = useState<ConstraintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentGroups, setCurrentGroups] = useState<Student[][]>([]);
  const [savedLayout] = useState(() => {
    const l = getRoomLayout(classId);
    return l && l.v === 2 && l.size === layoutSize(classData?.layout ?? "pairs") ? l : null;
  });
  const [deskPositions, setDeskPositions] = useState<DeskPosition[]>(savedLayout?.desks ?? []);
  const [currentRotations, setCurrentRotations] = useState<number[]>(savedLayout?.rotations ?? []);
  const [plans, setPlans] = useState<SavedPlan[]>(() => listPlans(classId));
  const [planName, setPlanName] = useState("");
  const [notice, setNotice] = useState("");
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  // Teacher desk X position (0-100 percent). Y is determined by front/back setting.
  const [teacherDeskX, setTeacherDeskX] = useState(savedLayout?.teacher.x ?? 50);

  const seedRef = useRef(0);
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
  const [teacherDeskY, setTeacherDeskY] = useState(savedLayout?.teacher.y ?? (teacherDeskAtFront ? TEACHER_FRONT_Y : TEACHER_BACK_Y));

  const toEngineStudents = (rows: typeof students): Student[] =>
    rows.map(fromRow);

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

  const size = layoutSize(layout);
  const foot = FOOTPRINTS[size] ?? FOOTPRINTS[2];
  const canvasWidth = () => ROOM_W;
  const gridCols = (count: number) => {
    const max = Math.max(1, Math.floor((canvasWidth() - 40 + GAP_X) / (foot.w + GAP_X)));
    return Math.max(1, Math.min(count, Math.ceil(count / Math.ceil(count / max))));
  };
  const topPx = teacherDeskAtFront ? 96 : 36;
  const canvasHeight = (count: number) => Math.max(560, topPx + Math.ceil(count / gridCols(count)) * (foot.h + GAP_Y) + (teacherDeskAtFront ? 40 : 110));

  const buildInitialPositions = (count: number): DeskPosition[] => {
    const W = canvasWidth();
    const cols = gridCols(count);
    const H = canvasHeight(count);
    const rowOffset = (row: number) => {
      const inRow = Math.min(cols, count - row * cols);
      return (W - (inRow * foot.w + (inRow - 1) * GAP_X)) / 2;
    };
    return Array.from({ length: count }, (_, i) => ({
      x: ((rowOffset(Math.floor(i / cols)) + (i % cols) * (foot.w + GAP_X)) / W) * 100,
      y: ((topPx + Math.floor(i / cols) * (foot.h + GAP_Y)) / H) * 100,
    }));
  };

  // Side tables tilt toward the board; middle ones face it straight.
  const defaultRotation = (gi: number, count: number) => {
    const cols = gridCols(count);
    if (size < 3 || cols < 3) return 0;
    const c = gi % cols;
    return c === 0 ? 8 : c === cols - 1 ? -8 : 0;
  };
  const withRotations = (a: Arrangement): Arrangement => ({
    ...a, rotations: a.groups.map((_, gi) => (rotationsRef.current.length === a.groups.length ? rotationsRef.current[gi] : undefined) ?? defaultRotation(gi, a.groups.length)),
  });

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
      seed: seedRef.current++,
      cols: gridCols(getCapacities(s.length, layout).length),
    });
    const rotated = results.map(withRotations);
    setArrangements(rotated);
    if (rotated.length > 0) {
      setSelectedId(rotated[0].id);
      setCurrentGroups(rotated[0].groups);
      setCurrentRotations(rotated[0].rotations);
      const n = rotated[0].groups.length;
      setDeskPositions((prev) => (prev.length === n ? prev : buildInitialPositions(n)));
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
    setDeskPositions((prev) => (prev.length === a.groups.length ? prev : buildInitialPositions(a.groups.length)));
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
    const m = rescoreGroups(newGroups, ec, lockedIds, teacherDeskAtFront, false, gridCols(newGroups.length));
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

  const handleMoveTeacherDesk = (x: number, y: number) => {
    setTeacherDeskX(Math.max(6, Math.min(94, x)));
    setTeacherDeskY(Math.max(1, Math.min(92, y)));
  };

  const handleToggleTeacherDeskSide = () => {
    if (!classData) return;
    const newPos = teacherDeskAtFront ? "back" : "front";
    onClassUpdated({ ...classData, teacher_desk_position: newPos });
    updateClass(classId, { teacher_desk_position: newPos }).catch(console.error);
  };

  const prevFront = useRef(teacherDeskAtFront);
  useEffect(() => {
    if (prevFront.current === teacherDeskAtFront) return;
    prevFront.current = teacherDeskAtFront;
    setTeacherDeskY(teacherDeskAtFront ? TEACHER_FRONT_Y : TEACHER_BACK_Y);
    setDeskPositions(savedLayout?.desks ?? []);
    doGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherDeskAtFront]);

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(""), 2600); };
  const currentLayout = () => ({ desks: currentGroups.map((_, gi) => deskPositions[gi] || buildInitialPositions(currentGroups.length)[gi]), teacher: { x: teacherDeskX, y: teacherDeskY }, rotations: currentRotations, v: 2, size });

  const handleSaveLayout = () => { saveRoomLayout(classId, currentLayout()); flash("Room layout saved — new plans will use it"); };

  const handleSavePlan = () => {
    const name = planName.trim() || `Plan ${plans.length + 1}`;
    const plan = savePlan({ classId, name, groups: currentGroups.map((g) => g.map((st) => st.id)), rotations: currentRotations, layout: currentLayout() });
    saveRoomLayout(classId, plan.layout);
    setPlans((prev) => [plan, ...prev]);
    setPlanName("");
    flash(`Saved "${name}"`);
  };

  const handleLoadPlan = (p: SavedPlan) => {
    const byId = new Map(students.map((st) => [st.id, fromRow(st)]));
    const groups = p.groups.map((g) => g.map((id) => byId.get(id)).filter(Boolean) as Student[]);
    const placed = new Set(groups.flat().map((st) => st.id));
    students.filter((st) => !placed.has(st.id)).forEach((st) => {
      const smallest = groups.reduce((a, g) => (g.length < a.length ? g : a), groups[0]);
      smallest.push(fromRow(st));
    });
    const m = rescoreGroups(groups, toEngineConstraints(constraints), lockedIds, teacherDeskAtFront, false, gridCols(groups.length));
    const arr: Arrangement = { id: p.id, name: p.name, groups, rotations: p.rotations, ...m };
    setArrangements((prev) => [arr, ...prev.filter((a) => a.id !== p.id)]);
    setSelectedId(p.id);
    setCurrentGroups(groups);
    setCurrentRotations(p.rotations);
    setDeskPositions(p.layout.desks);
    setTeacherDeskX(p.layout.teacher.x);
    setTeacherDeskY(p.layout.teacher.y);
  };

  const handleDeletePlan = (id: string) => { deletePlan(id); setPlans((prev) => prev.filter((p) => p.id !== id)); };

  const ec = toEngineConstraints(constraints);
  const insight = selected ? rescoreGroups(currentGroups, ec, lockedIds, teacherDeskAtFront, false, gridCols(currentGroups.length)) : null;

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
          <button className="ghost-pill" data-testid="planner-desk-toggle-btn" onClick={handleToggleTeacherDeskSide}>
            Desk: {teacherDeskAtFront ? "Front" : "Back"} (swap)
          </button>
          {notice && <span className="planner-notice" data-testid="planner-notice">{notice}</span>}
          <button className="ghost-pill" data-testid="planner-save-layout-btn" onClick={handleSaveLayout} title="Keep this desk layout for every new plan">Save room layout</button>
          <button className="text-button filled" data-testid="planner-regenerate-btn" onClick={doGenerate}>Regenerate</button>
        </div>
      </div>

      <div className="planner-body">
        <div className="planner-canvas-col">
          <RoomViewport width={ROOM_W} height={canvasHeight(currentGroups.length)}
            actions={<button className="text-button filled" data-testid="room-regenerate-btn" onClick={doGenerate}>Regenerate</button>}>
          <div className="board-strip">WHITEBOARD</div>
          <div className="classroom-canvas" id="classroom-canvas" style={{ width: ROOM_W, height: canvasHeight(currentGroups.length), minHeight: 0, flex: "none" }}>
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
          </RoomViewport>
        </div>

        <div className="planner-right-col">
          <section className="right-panel">
            <div className="right-panel-head">
              <h3>Seating options</h3>
              <span className="count-pill">{arrangements.length}</span>
            </div>
            {arrangements.length === 0 ? (
              <p className="muted-text">No arrangements yet — click Regenerate.</p>
            ) : (
              <div className="candidate-list">
                {arrangements.map((a) => (
                  <div key={a.id} className={`candidate-card ${a.id === selectedId ? "selected" : ""}`} onClick={() => handleSelectArrangement(a)}>
                    <div className={`candidate-score tier-${tier(a.score)}`}>{a.score}</div>
                    <div>
                      <div className="candidate-title">{a.name}{a.name === "Option A" && <span className="best-chip">Top pick</span>}{plans.some((p) => p.id === a.id) && <span className="best-chip saved">Saved</span>}</div>
                      <div className="candidate-detail">{a.summary}</div>
                      {a.hardViolations > 0 && <div className="candidate-conflict" data-testid={`candidate-conflict-${a.name}`}>Must apart: {conflictPairs(a.id === selectedId ? currentGroups : a.groups, ec).join(" · ")}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="right-panel">
            <div className="right-panel-head">
              <h3>Why this score?</h3>
            </div>
            {insight ? (
              <>
                <div className={`insight-score-display tier-text-${tier(insight.score)}`}>{insight.score}<small>/100</small></div>
                <p className="insight-summary" data-testid="planner-insight-summary">{selected?.summary}</p>
                <div className="insight-meters">
                  <Meter label="Front-seat needs" value={insight.visibility} />
                  <Meter label="Calm tables" value={insight.behavior} />
                </div>
                <p className="insight-note">Click a seat to lock it · drag the teacher's desk anywhere</p>
              </>
            ) : (
              <p className="muted-text">Select a candidate above to see what was prioritized.</p>
            )}
          </section>
          <section className="right-panel plans-panel" data-testid="saved-plans-panel">
            <div className="right-panel-head"><h3>Saved plans</h3><span className="count-pill">{plans.length}</span></div>
            <div className="plan-save-row">
              <input className="text-input" data-testid="plan-name-input" value={planName} onChange={(e) => setPlanName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePlan()} placeholder="Name this plan, e.g. Week 3" />
              <button className="text-button filled" data-testid="save-plan-btn" onClick={handleSavePlan} disabled={!currentGroups.length}>Save</button>
            </div>
            {plans.map((p, i) => (
              <div key={p.id} className="plan-row" data-testid={`saved-plan-${i}`}>
                <button className="plan-open" data-testid={`load-plan-btn-${i}`} onClick={() => handleLoadPlan(p)}>
                  <b>{p.name}</b><small>{new Date(p.createdAt).toLocaleDateString()}</small>
                </button>
                <button className="delete-inline" data-testid={`delete-plan-btn-${i}`} onClick={() => handleDeletePlan(p.id)} aria-label="Delete plan">×</button>
              </div>
            ))}
          </section>
          <KeyPanel locked={currentGroups.flat().filter((st) => lockedIds.has(st.id))} conflicts={conflictPairs(currentGroups, ec)} />
        </div>
      </div>
    </div>
  );
}

export const tier = (s: number) => (s >= 90 ? "great" : s >= 80 ? "good" : s >= 70 ? "ok" : "low");

export function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <span>{label}<b>{value}%</b></span>
      <i><em className={`tier-bg-${tier(value)}`} style={{ width: `${value}%` }} /></i>
    </div>
  );
}

let dragSource: { group: number; seat: number } | null = null;

export const shortName = (name: string) => {
  const parts = (name || "?").trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
};

function conflictPairs(groups: Student[][], constraints: Constraint[]) {
  const where = new Map<string, Student & { gi: number }>();
  groups.forEach((g, gi) => g.forEach((s) => where.set(s.id, { ...s, gi })));
  return constraints.filter((c) => c.strength === "hard" && where.get(c.aId) && where.get(c.aId)?.gi === where.get(c.bId)?.gi)
    .map((c) => `${shortName(where.get(c.aId)!.name)} & ${shortName(where.get(c.bId)!.name)}`);
}

function KeyPanel({ locked, conflicts }: { locked: Student[]; conflicts: string[] }) {
  return (
    <section className="right-panel key-panel" data-testid="planner-key-panel">
      <div className="right-panel-head"><h3>Room key</h3></div>
      <div className="key-row"><b>Locked in place</b><span data-testid="key-locked">{locked.length ? locked.map((s) => shortName(s.name)).join(", ") : "None — click a seat to lock"}</span></div>
      <div className="key-row"><b>Must-apart conflicts</b><span data-testid="key-conflicts" className={conflicts.length ? "bad" : "good"}>{conflicts.length ? conflicts.join(" · ") : "None"}</span></div>
      <ul className="key-legend">
        <li><i className="k-lock" /> Locked</li><li><i className="k-hard" /> Must apart</li><li><i className="k-soft" /> Prefer apart</li>
        <li><em className="k-badge">V</em> Visibility</li><li><em className="k-badge">B</em> Behaviour</li><li><em className="k-badge">H</em> Hearing</li><li><em className="k-badge esl-badge">ESL</em> Language support</li><li><em className="k-badge star">★</em> Near teacher</li>
      </ul>
      <p className="insight-note">Drag a student onto any seat or table to move them</p>
    </section>
  );
}

// ── Teacher Desk (draggable horizontally along front or back wall) ──

function TeacherDesk({ x, y, onMove }: { x: number; y: number; onMove: (x: number, y: number) => void }) {
  const dragRef = useRef<{ startX: number; startY: number; startXPercent: number; startYPercent: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startXPercent: x, startYPercent: y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    const canvas = document.getElementById("classroom-canvas");
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    onMove(dragRef.current.startXPercent + dx, dragRef.current.startYPercent + dy);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragging(false);
    dragRef.current = null;
  };

  return (
    <div
      data-testid="teacher-desk" className={`teacher-desk ${dragging ? "dragging" : ""}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title="Drag to move the teacher's desk anywhere"
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
  const tableRef = useRef<HTMLDivElement>(null);
  const rotateRef = useRef<{ startAngle: number; startRot: number } | null>(null);
  const deskDragRef = useRef<{ startX: number; startY: number; startPos: DeskPosition } | null>(null);
  const [isDraggingDesk, setIsDraggingDesk] = useState(false);

  const size = layoutSize(layout);
  const isPair = size <= 2;
  const label = isPair ? `Desk ${groupIndex + 1}` : `Group ${groupIndex + 1}`;

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

  const handleSeatDragStart = (si: number) => { dragSource = { group: groupIndex, seat: si }; };
  const handleSeatDrop = (si: number) => {
    if (dragSource) { onMoveStudent(dragSource.group, dragSource.seat, groupIndex, si); dragSource = null; }
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

  const topCount = Math.ceil(group.length / 2);
  const renderSeat = (student: Student, si: number) => {
    const isLocked = lockedIds.has(student.id);
    const conflict = conflictMap.get(student.id);
    return (
      <div
        key={student.id}
        data-testid={`seat-${groupIndex}-${si}`}
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
          <span className="seat-name" title={student.name}>{student.avatar && <KidAvatar avatar={student.avatar} fallback="" size={18} className="seat-avatar" />}{shortName(student.name)}</span>
          <div className="seat-badges">
            <span className="badge" style={{ background: VIS_COLORS[student.visibility] + "20", color: VIS_COLORS[student.visibility] }} title={`Visibility: ${student.visibility}`}>V</span>
            <span className="badge" style={{ background: BEH_COLORS[student.behavior] + "20", color: BEH_COLORS[student.behavior] }} title={`Behavior: ${student.behavior}`}>B</span>
            {<span className="badge" style={{ background: VIS_COLORS[student.hearing] + "20", color: VIS_COLORS[student.hearing] }} title={`Hearing: ${student.hearing}`}>H</span>}
            {student.esl && <span className="badge esl-badge" title="ESL / language support">ESL</span>}
            {student.nearTeacher && <span className="badge near-teacher-badge" title="Needs to sit near teacher">★</span>}
            {isLocked && <span className="badge lock-badge">🔒</span>}
            {conflict === "hard" && <span className="badge conflict-badge hard" title="Hard conflict — must separate">!</span>}
            {conflict === "soft" && <span className="badge conflict-badge soft" title="Soft conflict — prefer separate">~</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid={`table-group-${groupIndex}`}
      className={`table-group ${isDraggingDesk ? "dragging-desk" : ""}`}
      style={{ position: "absolute", left: `${position.x}%`, top: `${position.y}%`, transform: `rotate(${rotation}deg)` }}
      onPointerDown={onDeskDragStart}
      onPointerMove={onDeskDragMove}
      onPointerUp={onDeskDragEnd}
    >
      <div className="table-group-header">
        <span className="unit-label">{label}</span>
        <div className="rotate-controls" onClick={(e) => e.stopPropagation()}>
          <button className="rotate-btn" onPointerDown={(e) => e.stopPropagation()} data-testid={`rotate-ccw-${groupIndex}`} onClick={() => onRotate(groupIndex, -15)}>↺</button>
          <div className="rotate-handle" onPointerDown={onRotateStart} onPointerMove={onRotateMove} onPointerUp={onRotateEnd}>⟳</div>
          <button className="rotate-btn" onPointerDown={(e) => e.stopPropagation()} data-testid={`rotate-cw-${groupIndex}`} onClick={() => onRotate(groupIndex, 15)}>↻</button>
          <button className="rotate-btn" onPointerDown={(e) => e.stopPropagation()} data-testid={`rotate-reset-${groupIndex}`} onClick={() => onRotate(groupIndex, -rotation)}>⤾</button>
        </div>
      </div>

      <div className={`table-container ${isPair ? "pair-container" : "group-container"}`} ref={tableRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => { if (dragSource && dragSource.group !== groupIndex) { onMoveStudent(dragSource.group, dragSource.seat, groupIndex, group.length); dragSource = null; } }}>
        {isPair ? (
          <>
            <div className={`table-surface pair-surface ${size === 1 ? "single-surface" : ""}`} />
            <div className="seats-container pair-seats">{group.map((s, si) => renderSeat(s, si))}</div>
          </>
        ) : (
          <>
            <div className="seats-container group-col">{group.slice(0, topCount).map((s, i) => renderSeat(s, i))}</div>
            <div className="table-surface group-surface vertical" style={{ height: Math.max(topCount, 2) * 50 }}><span className="table-surface-label">{label}</span></div>
            <div className="seats-container group-col">{group.slice(topCount).map((s, i) => renderSeat(s, topCount + i))}</div>
          </>
        )}
      </div>
    </div>
  );
}
