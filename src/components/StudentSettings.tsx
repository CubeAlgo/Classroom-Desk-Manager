import type { StudentRow, ConstraintRow, ConstraintStrength, Level, StudentPatch } from "../db";
import { VIS_LABELS, BEH_LABELS, VIS_COLORS, BEH_COLORS } from "../lib";

export function GearIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function partnerOf(c: ConstraintRow, id: string) {
  return c.student_a_id === id ? c.student_b_id : c.student_a_id;
}

function LevelPicker({ label, value, labels, colors, onChange, testid }: {
  label: string; value: Level; labels: Record<Level, string>; colors: Record<Level, string>;
  onChange: (l: Level) => void; testid: string;
}) {
  return (
    <div className="drawer-section">
      <span className="field-label">{label}</span>
      <div className="level-picker">
        {(["low", "medium", "high"] as Level[]).map((l) => (
          <button key={l} data-testid={`${testid}-${l}`} className={value === l ? "selected" : ""} onClick={() => onChange(l)}>
            <i style={{ background: colors[l] }} />{labels[l]}
          </button>
        ))}
      </div>
    </div>
  );
}

function PeerPicker({ title, hint, student, students, links, onToggle, onStrength, testid }: {
  title: string; hint: string; student: StudentRow; students: StudentRow[]; links: ConstraintRow[];
  onToggle: (peerId: string) => void; onStrength?: (c: ConstraintRow, s: ConstraintStrength) => void; testid: string;
}) {
  const others = students.filter((s) => s.id !== student.id);
  return (
    <div className="drawer-section">
      <span className="field-label">{title}</span>
      <p className="drawer-hint">{hint}</p>
      {others.length === 0 ? <p className="drawer-hint">Add more students to use this.</p> : (
        <div className="peer-chips">
          {others.map((o) => {
            const link = links.find((c) => partnerOf(c, student.id) === o.id);
            return (
              <span key={o.id} className={`peer-chip ${link ? "on" : ""} ${link?.strength ?? ""}`}>
                <button data-testid={`${testid}-chip-${o.id}`} onClick={() => onToggle(o.id)}>{link ? "✓ " : "+ "}{o.name || "Unnamed"}</button>
                {link && onStrength && (
                  <button className="strength-toggle" data-testid={`${testid}-strength-${o.id}`}
                    onClick={() => onStrength(link, link.strength === "hard" ? "soft" : "hard")}
                    title="Switch between must and prefer">
                    {link.strength === "hard" ? "Must" : "Prefer"}
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StudentSettings({ student, students, constraints, onClose, onUpdate, onToggleLink, onStrength }: {
  student: StudentRow; students: StudentRow[]; constraints: ConstraintRow[];
  onClose: () => void;
  onUpdate: (patch: StudentPatch) => void;
  onToggleLink: (peerId: string, kind: "apart" | "together") => void;
  onStrength: (c: ConstraintRow, s: ConstraintStrength) => void;
}) {
  const mine = constraints.filter((c) => c.student_a_id === student.id || c.student_b_id === student.id);
  const apart = mine.filter((c) => c.strength !== "together");
  const together = mine.filter((c) => c.strength === "together");
  return (
    <div className="drawer-backdrop" onClick={onClose} data-testid="student-settings-backdrop">
      <aside className="drawer" onClick={(e) => e.stopPropagation()} data-testid="student-settings-drawer">
        <header className="drawer-head">
          <div>
            <span className="section-kicker"><GearIcon size={11} /> STUDENT SETTINGS</span>
            <input className="drawer-name" data-testid="student-settings-name" value={student.name}
              onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Student name" />
          </div>
          <button className="drawer-close" onClick={onClose} data-testid="student-settings-close" aria-label="Close">×</button>
        </header>
        <div className="drawer-body">
          <LevelPicker label="Visibility" value={student.visibility} labels={VIS_LABELS} colors={VIS_COLORS} onChange={(v) => onUpdate({ visibility: v })} testid="visibility" />
          <LevelPicker label="Behaviour" value={student.behavior} labels={BEH_LABELS} colors={BEH_COLORS} onChange={(v) => onUpdate({ behavior: v })} testid="behaviour" />
          <div className="drawer-section">
            <span className="field-label">Behaviour notes</span>
            <textarea className="text-input drawer-notes" data-testid="student-settings-notes" rows={3}
              value={student.notes ?? ""} onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="e.g. Chatty after lunch, works well with quiet peers" />
          </div>
          <label className="switch-row" data-testid="near-teacher-switch">
            <span><b>Sit near the teacher</b><small>Placed closest to the teacher's desk</small></span>
            <input type="checkbox" checked={student.near_teacher} onChange={(e) => onUpdate({ near_teacher: e.target.checked })} />
            <i className="switch" />
          </label>
          <PeerPicker title="Keep apart from" hint="Tap a name to separate. Tap Must/Prefer to switch strictness." student={student} students={students}
            links={apart} onToggle={(id) => onToggleLink(id, "apart")} onStrength={onStrength} testid="apart" />
          <PeerPicker title="Keep together with" hint="We'll try to seat these students at the same desk or group." student={student} students={students}
            links={together} onToggle={(id) => onToggleLink(id, "together")} testid="together" />
        </div>
        <footer className="drawer-foot">
          <span className="drawer-hint">Changes save automatically</span>
          <button className="text-button filled" onClick={onClose} data-testid="student-settings-done">Done</button>
        </footer>
      </aside>
    </div>
  );
}
