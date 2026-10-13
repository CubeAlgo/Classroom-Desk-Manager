import { supabase } from "./supabase";
import { local } from "./localStore";

export type LayoutType = "pairs" | "groups";
export type Level = "low" | "medium" | "high";
export type ConstraintStrength = "hard" | "soft" | "together";
export type TeacherDeskPosition = "front" | "back";

export interface ClassRow {
  id: string;
  name: string;
  layout: LayoutType;
  teacher_desk_position: TeacherDeskPosition;
  created_at: string;
}

export interface StudentRow {
  id: string;
  class_id: string;
  name: string;
  visibility: Level;
  behavior: Level;
  near_teacher: boolean;
  notes?: string;
  sort_order: number;
  created_at: string;
}

export type StudentPatch = Partial<Pick<StudentRow, "name" | "visibility" | "behavior" | "near_teacher" | "notes">>;

export interface ConstraintRow {
  id: string;
  class_id: string;
  student_a_id: string;
  student_b_id: string;
  strength: ConstraintStrength;
  created_at: string;
}

export interface ArrangementRow {
  id: string;
  class_id: string;
  name: string;
  score: number;
  groups_data: string[][];
  rotations_data: number[];
  locked_ids: string[];
  created_at: string;
}

const byCreatedDesc = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);
const byCreatedAsc = <T extends { created_at: string }>(a: T, b: T) => a.created_at.localeCompare(b.created_at);

// ── Classes ──────────────────────────────────────────────────────

export async function fetchClasses(): Promise<ClassRow[]> {
  if (!supabase) return (local.list("classes") as unknown as ClassRow[]).sort(byCreatedDesc);
  const { data, error } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as ClassRow[];
}

export async function createClass(name: string, layout: LayoutType, teacherDeskPosition: TeacherDeskPosition = "front"): Promise<ClassRow> {
  const values = { name, layout, teacher_desk_position: teacherDeskPosition };
  if (!supabase) return local.insert("classes", values) as unknown as ClassRow;
  const { data, error } = await supabase.from("classes").insert(values).select().single();
  if (error) throw error;
  return data as ClassRow;
}

export async function updateClass(id: string, patch: Partial<Pick<ClassRow, "name" | "layout" | "teacher_desk_position">>): Promise<void> {
  if (!supabase) return local.update("classes", id, patch);
  const { error } = await supabase.from("classes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteClass(id: string): Promise<void> {
  if (!supabase) {
    local.remove("classes", (r) => r.id === id);
    ["students", "constraints", "arrangements"].forEach((t) => local.remove(t, (r) => r.class_id === id));
    return;
  }
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw error;
}

// ── Students ─────────────────────────────────────────────────────

export async function fetchStudents(classId: string): Promise<StudentRow[]> {
  if (!supabase) {
    return (local.list("students", (r) => r.class_id === classId) as unknown as StudentRow[]).sort((a, b) => a.sort_order - b.sort_order);
  }
  const { data, error } = await supabase.from("students").select("*").eq("class_id", classId).order("sort_order", { ascending: true });
  if (error) throw error;
  return data as StudentRow[];
}

export async function createStudent(classId: string, name: string, sortOrder: number): Promise<StudentRow> {
  const values = { class_id: classId, name, sort_order: sortOrder, visibility: "medium", behavior: "medium", near_teacher: false };
  if (!supabase) return local.insert("students", { ...values, notes: "" }) as unknown as StudentRow;
  const { data, error } = await supabase.from("students").insert(values).select().single();
  if (error) throw error;
  return data as StudentRow;
}

export async function updateStudent(id: string, patch: StudentPatch): Promise<void> {
  if (!supabase) return local.update("students", id, patch);
  const { error } = await supabase.from("students").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteStudent(id: string): Promise<void> {
  if (!supabase) {
    local.remove("students", (r) => r.id === id);
    local.remove("constraints", (r) => r.student_a_id === id || r.student_b_id === id);
    return;
  }
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw error;
}

// ── Constraints ──────────────────────────────────────────────────

export async function fetchConstraints(classId: string): Promise<ConstraintRow[]> {
  if (!supabase) return (local.list("constraints", (r) => r.class_id === classId) as unknown as ConstraintRow[]).sort(byCreatedAsc);
  const { data, error } = await supabase.from("constraints").select("*").eq("class_id", classId).order("created_at", { ascending: true });
  if (error) throw error;
  return data as ConstraintRow[];
}

export async function createConstraint(classId: string, aId: string, bId: string, strength: ConstraintStrength): Promise<ConstraintRow> {
  const values = { class_id: classId, student_a_id: aId, student_b_id: bId, strength };
  if (!supabase) return local.insert("constraints", values) as unknown as ConstraintRow;
  const { data, error } = await supabase.from("constraints").insert(values).select().single();
  if (error) throw error;
  return data as ConstraintRow;
}

export async function updateConstraint(id: string, patch: Partial<Pick<ConstraintRow, "student_a_id" | "student_b_id" | "strength">>): Promise<void> {
  if (!supabase) return local.update("constraints", id, patch);
  const { error } = await supabase.from("constraints").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteConstraint(id: string): Promise<void> {
  if (!supabase) return local.remove("constraints", (r) => r.id === id);
  const { error } = await supabase.from("constraints").delete().eq("id", id);
  if (error) throw error;
}

// ── Arrangements ─────────────────────────────────────────────────

export async function fetchArrangements(classId: string): Promise<ArrangementRow[]> {
  if (!supabase) return (local.list("arrangements", (r) => r.class_id === classId) as unknown as ArrangementRow[]).sort(byCreatedDesc);
  const { data, error } = await supabase.from("arrangements").select("*").eq("class_id", classId).order("created_at", { ascending: false });
  if (error) throw error;
  return data as ArrangementRow[];
}

export async function saveArrangement(
  classId: string, name: string, score: number, groupsData: string[][], rotationsData: number[], lockedIds: string[]
): Promise<ArrangementRow> {
  const values = { class_id: classId, name, score, groups_data: groupsData, rotations_data: rotationsData, locked_ids: lockedIds };
  if (!supabase) return local.insert("arrangements", values) as unknown as ArrangementRow;
  const { data, error } = await supabase.from("arrangements").insert(values).select().single();
  if (error) throw error;
  return data as ArrangementRow;
}

export async function updateArrangement(
  id: string, patch: Partial<Pick<ArrangementRow, "name" | "score" | "groups_data" | "rotations_data" | "locked_ids">>
): Promise<void> {
  if (!supabase) return local.update("arrangements", id, patch);
  const { error } = await supabase.from("arrangements").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteArrangement(id: string): Promise<void> {
  if (!supabase) return local.remove("arrangements", (r) => r.id === id);
  const { error } = await supabase.from("arrangements").delete().eq("id", id);
  if (error) throw error;
}
