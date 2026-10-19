// Saved seating plans and room layouts — stored in this browser.
export interface DeskPosition { x: number; y: number; }
export interface RoomLayout { desks: DeskPosition[]; teacher: DeskPosition; rotations?: number[]; v?: number; size?: number; }
export interface SavedPlan {
  id: string;
  classId: string;
  name: string;
  groups: string[][];
  rotations: number[];
  layout: RoomLayout;
  createdAt: string;
}

const PLANS = "desk-planner-plans";
const LAYOUTS = "desk-planner-room-layouts";

const read = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
};

export function getRoomLayout(classId: string): RoomLayout | null {
  return read<Record<string, RoomLayout>>(LAYOUTS, {})[classId] ?? null;
}

export function saveRoomLayout(classId: string, layout: RoomLayout) {
  const all = read<Record<string, RoomLayout>>(LAYOUTS, {});
  localStorage.setItem(LAYOUTS, JSON.stringify({ ...all, [classId]: layout }));
}

export function listPlans(classId: string): SavedPlan[] {
  return read<SavedPlan[]>(PLANS, []).filter((p) => p.classId === classId);
}

export function savePlan(plan: Omit<SavedPlan, "id" | "createdAt">): SavedPlan {
  const full = { ...plan, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  localStorage.setItem(PLANS, JSON.stringify([full, ...read<SavedPlan[]>(PLANS, [])]));
  return full;
}

export function deletePlan(id: string) {
  localStorage.setItem(PLANS, JSON.stringify(read<SavedPlan[]>(PLANS, []).filter((p) => p.id !== id)));
}
