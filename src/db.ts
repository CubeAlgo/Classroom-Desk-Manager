import { supabase } from "./supabase";

export type LayoutType = "pairs" | "groups";
export type Level = "low" | "medium" | "high";
export type ConstraintStrength = "hard" | "soft";

export interface ClassRow {
  id: string;
  name: string;
  layout: LayoutType;
  created_at: string;
}

export interface StudentRow {
  id: string;
  class_id: string;
  name: string;
  visibility: Level;
  behavior: Level;
  sort_order: number;
  created_at: string;
}

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

// ── Classes ──────────────────────────────────────────────────────

export async function fetchClasses(): Promise<ClassRow[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ClassRow[];
}

export async function createClass(name: string, layout: LayoutType): Promise<ClassRow> {
  const { data, error } = await supabase
    .from("classes")
    .insert({ name, layout })
    .select()
    .single();
  if (error) throw error;
  return data as ClassRow;
}

export async function updateClass(id: string, patch: Partial<Pick<ClassRow, "name" | "layout">>): Promise<void> {
  const { error } = await supabase.from("classes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw error;
}

// ── Students ─────────────────────────────────────────────────────

export async function fetchStudents(classId: string): Promise<StudentRow[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("class_id", classId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as StudentRow[];
}

export async function createStudent(
  classId: string,
  name: string,
  sortOrder: number
): Promise<StudentRow> {
  const { data, error } = await supabase
    .from("students")
    .insert({ class_id: classId, name, sort_order: sortOrder, visibility: "medium", behavior: "medium" })
    .select()
    .single();
  if (error) throw error;
  return data as StudentRow;
}

export async function updateStudent(
  id: string,
  patch: Partial<Pick<StudentRow, "name" | "visibility" | "behavior">>
): Promise<void> {
  const { error } = await supabase.from("students").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw error;
}

// ── Constraints ──────────────────────────────────────────────────

export async function fetchConstraints(classId: string): Promise<ConstraintRow[]> {
  const { data, error } = await supabase
    .from("constraints")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as ConstraintRow[];
}

export async function createConstraint(
  classId: string,
  aId: string,
  bId: string,
  strength: ConstraintStrength
): Promise<ConstraintRow> {
  const { data, error } = await supabase
    .from("constraints")
    .insert({ class_id: classId, student_a_id: aId, student_b_id: bId, strength })
    .select()
    .single();
  if (error) throw error;
  return data as ConstraintRow;
}

export async function updateConstraint(
  id: string,
  patch: Partial<Pick<ConstraintRow, "student_a_id" | "student_b_id" | "strength">>
): Promise<void> {
  const { error } = await supabase.from("constraints").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteConstraint(id: string): Promise<void> {
  const { error } = await supabase.from("constraints").delete().eq("id", id);
  if (error) throw error;
}

// ── Arrangements ─────────────────────────────────────────────────

export async function fetchArrangements(classId: string): Promise<ArrangementRow[]> {
  const { data, error } = await supabase
    .from("arrangements")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ArrangementRow[];
}

export async function saveArrangement(
  classId: string,
  name: string,
  score: number,
  groupsData: string[][],
  rotationsData: number[],
  lockedIds: string[]
): Promise<ArrangementRow> {
  const { data, error } = await supabase
    .from("arrangements")
    .insert({
      class_id: classId,
      name,
      score,
      groups_data: groupsData,
      rotations_data: rotationsData,
      locked_ids: lockedIds,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ArrangementRow;
}

export async function updateArrangement(
  id: string,
  patch: Partial<Pick<ArrangementRow, "name" | "score" | "groups_data" | "rotations_data" | "locked_ids">>
): Promise<void> {
  const { error } = await supabase.from("arrangements").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteArrangement(id: string): Promise<void> {
  const { error } = await supabase.from("arrangements").delete().eq("id", id);
  if (error) throw error;
}
