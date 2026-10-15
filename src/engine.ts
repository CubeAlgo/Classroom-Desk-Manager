import type { Level, ConstraintStrength, LayoutType, StudentRow } from "./db";
import { layoutSize } from "./lib";

export type { LayoutType };

export interface Student {
  id: string;
  name: string;
  visibility: Level;
  behavior: Level;
  nearTeacher: boolean;
  hearing: Level;
  esl: boolean;
  avatar?: string;
}

export const fromRow = (s: StudentRow): Student => ({
  id: s.id, name: s.name, visibility: s.visibility, behavior: s.behavior, nearTeacher: s.near_teacher,
  hearing: s.hearing ?? "high", esl: !!s.esl, avatar: s.avatar,
});

export interface Constraint {
  aId: string;
  bId: string;
  strength: ConstraintStrength;
}

export interface Arrangement {
  id: string;
  name: string;
  groups: Student[][];
  rotations: number[];
  score: number;
  visibility: number;
  behavior: number;
  hardViolations: number;
  softViolations: number;
  lockedCount: number;
  summary: string;
}

export function groupSizesFor(n: number, targetSize: number): number[] {
  if (n <= 0 || targetSize < 1) return [];
  const groups = Math.ceil(n / targetSize);
  const base = Math.floor(n / groups);
  let remainder = n % groups;
  const sizes: number[] = [];
  for (let i = 0; i < groups; i++) {
    let s = base;
    if (remainder > 0) { s++; remainder--; }
    sizes.push(s);
  }
  while (sizes.some((s) => s < 2) && sizes.length > 1) {
    const idx = sizes.findIndex((s) => s < 2);
    if (idx >= 0) { sizes.splice(idx, 1); sizes[0]++; }
    else break;
  }
  return sizes;
}

export function groupSizes(n: number): number[] {
  return groupSizesFor(n, 5);
}

export function getCapacities(count: number, layout: LayoutType, targetGroupSize?: number): number[] {
  if (targetGroupSize) return groupSizesFor(count, targetGroupSize);
  const size = layoutSize(layout);
  if (size <= 2) return Array(Math.ceil(count / size)).fill(size);
  return groupSizesFor(count, size);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function valueScore(v: Level): number {
  return v === "low" ? 1 : v === "medium" ? 2 : 3;
}

function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// Desired seat depth (0 = front row, 1 = back); null = no preference.
function desiredDepth(s: Student, ignoreVisibility = false): number | null {
  if (ignoreVisibility) return null;
  const pref = (l: Level) => (l === "low" ? 0 : l === "medium" ? 0.4 : null);
  const opts = [pref(s.visibility), pref(s.hearing), s.esl ? 0.3 : null]
    .filter((x): x is number => x !== null);
  return opts.length ? Math.min(...opts) : null;
}

export function unitDepth(gi: number, total: number, cols = 1): number {
  const rows = Math.ceil(total / Math.max(1, cols));
  return rows <= 1 ? 0 : Math.floor(gi / Math.max(1, cols)) / (rows - 1);
}

function seatQuality(student: Student, unitIndex: number, totalUnits: number, teacherDeskAtFront: boolean, cols = 1): number {
  const pos = unitDepth(unitIndex, totalUnits, cols);
  const want = desiredDepth(student);
  let score = want === null ? 1 : 1 - Math.max(0, pos - want) * 0.8;
  if (student.nearTeacher) {
    const teacherPos = teacherDeskAtFront ? 0 : 1;
    score -= Math.abs(pos - teacherPos) * 0.3;
  }
  return score;
}

function penalty(groups: Student[][], constraints: Constraint[]) {
  const unitMap = new Map<string, number>();
  groups.forEach((g, gi) => g.forEach((s) => unitMap.set(s.id, gi)));
  let hard = 0, soft = 0;
  for (const c of constraints) {
    if (!unitMap.has(c.aId) || !unitMap.has(c.bId)) continue;
    const same = unitMap.get(c.aId) === unitMap.get(c.bId);
    if (c.strength === "together") { if (!same) soft++; continue; }
    if (same) {
      if (c.strength === "hard") hard++; else soft++;
    }
  }
  return { hardViolations: hard, softViolations: soft };
}

function scoreGroups(groups: Student[][], constraints: Constraint[], lockedIds: Set<string>, teacherDeskAtFront: boolean, ignoreVisibility = false, cols = 1) {
  const total = groups.length;
  let vis = 0, locked = 0, excess = 0, nearMiss = 0;
  const hasCalm = groups.some((g) => g.some((s) => s.behavior === "low"));
  groups.forEach((g, gi) => {
    const high = g.filter((s) => s.behavior === "high").length;
    const med = g.filter((s) => s.behavior === "medium").length;
    const low = g.filter((s) => s.behavior === "low").length;
    excess += Math.max(0, high - 1) * 2 + (high >= 1 && med >= 2 ? 0.5 : 0) + (hasCalm && high >= 1 && low === 0 ? 0.6 * high : 0);
    g.forEach((s) => {
      vis += seatQuality(s, gi, total, teacherDeskAtFront, cols) * 100;
      if (lockedIds.has(s.id)) locked++;
      if (s.nearTeacher && Math.ceil(total / cols) > 1) {
        const d = unitDepth(gi, total, cols);
        if ((teacherDeskAtFront ? d : 1 - d) > 0.34) nearMiss++;
      }
    });
  });
  const n = Math.max(groups.reduce((a, g) => a + g.length, 0), 1);
  vis /= n;
  const sizes = groups.map((g) => g.length);
  const uneven = sizes.length ? Math.max(0, Math.max(...sizes) - Math.min(...sizes) - 1) : 0;
  const beh = Math.max(0, 100 - excess * 9 - nearMiss * 6 - uneven * 6);
  const p = penalty(groups, constraints);
  const rules = (p.hardViolations === 0 ? 15 : Math.max(0, 15 - p.hardViolations * 7)) + Math.max(0, 5 - p.softViolations * 2);
  const score = Math.max(0, Math.round(ignoreVisibility ? beh * 0.8 + rules : vis * 0.45 + beh * 0.35 + rules));
  const m = { score, visibility: Math.round(vis), behavior: Math.round(beh), hardViolations: p.hardViolations, softViolations: p.softViolations, lockedCount: locked };
  return { ...m, summary: uneven ? "Uneven group sizes" : explain(m, ignoreVisibility) };
}

export function explain(m: { visibility: number; behavior: number; hardViolations: number; softViolations: number }, ignoreVisibility = false): string {
  const notes: string[] = [];
  if (m.hardViolations) notes.push(`${m.hardViolations} must-apart pair seated together`);
  if (m.softViolations) notes.push(`${m.softViolations} preference missed`);
  if (m.behavior < 90) notes.push("Energetic students share a table");
  if (!notes.length) return "Every rule met, energy well spread";
  return notes.slice(0, 2).join(" · ");
}

function signature(groups: Student[][]): Set<string> {
  const pairs = new Set<string>();
  groups.forEach((g, gi) => g.forEach((a) => {
    if (g.length === 1) pairs.add(`${a.id}@${gi}`);
    g.forEach((b) => { if (a.id < b.id) pairs.add(a.id + b.id); });
  }));
  return pairs;
}

function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size) return 1;
  let same = 0;
  a.forEach((p) => { if (b.has(p)) same++; });
  return same / a.size;
}

function wouldConflict(student: Student, group: Student[], constraints: Constraint[]): "hard" | "soft" | false {
  let result: "hard" | "soft" | false = false;
  for (const c of constraints) {
    if (c.strength === "together") continue;
    const ids = new Set(group.map((s) => s.id));
    const matches = (c.aId === student.id && ids.has(c.bId)) || (c.bId === student.id && ids.has(c.aId));
    if (matches) {
      if (c.strength === "hard") return "hard";
      result = "soft";
    }
  }
  return result;
}

function togetherCount(student: Student, group: (Student | null)[], constraints: Constraint[]): number {
  const ids = new Set(group.filter(Boolean).map((s) => (s as Student).id));
  return constraints.filter((c) => c.strength === "together" &&
    ((c.aId === student.id && ids.has(c.bId)) || (c.bId === student.id && ids.has(c.aId)))).length;
}

export interface GenParams {
  students: Student[];
  constraints: Constraint[];
  layout: LayoutType;
  lockedIds: Set<string>;
  currentGroups: Student[][];
  currentRotations: number[];
  count?: number;
  targetGroupSize?: number;
  teacherDeskAtFront?: boolean;
  ignoreVisibility?: boolean;
  seed?: number;
  cols?: number;
}

export function generateArrangements(params: GenParams): Arrangement[] {
  const { students, constraints, layout, lockedIds, currentGroups, currentRotations, count = 5, targetGroupSize, teacherDeskAtFront = true, ignoreVisibility = false, seed = 0, cols = 1 } = params;
  if (students.length === 0) return [];

  const capacities = getCapacities(students.length, layout, targetGroupSize);
  const totalUnits = capacities.length;
  const results: Arrangement[] = [];

  const lockedPlacement = new Map<string, [number, number]>();
  currentGroups.forEach((g, gi) => g.forEach((s, si) => {
    if (lockedIds.has(s.id)) lockedPlacement.set(s.id, [gi, si]);
  }));

  const ATTEMPTS = 48;
  for (let i = 0; i < ATTEMPTS; i++) {
    const rng = seeded(41 + i * 977 + students.length * 3 + seed * 7919);
    const jitter = i === 0 && !seed ? 0 : (i === 0 ? 0.8 : 1.5 + (i % 8) * 1.2);
    const groups: (Student | null)[][] = Array.from({ length: totalUnits }, (_, gi) => Array(capacities[gi]).fill(null));

    for (const s of students) {
      if (!lockedIds.has(s.id)) continue;
      const p = lockedPlacement.get(s.id);
      if (p && p[0] < groups.length && p[1] < groups[p[0]].length) groups[p[0]][p[1]] = s;
    }

    const order = shuffle(students.filter((s) => !lockedIds.has(s.id)), rng);
    order.sort((a, b) => Number(b.nearTeacher) - Number(a.nearTeacher));

    for (const student of order) {
      const choices = groups
        .map((g, gi) => ({ gi, g, filled: g.filter(Boolean).length, noise: rng() * jitter }))
        .filter((x) => x.filled < capacities[x.gi]);
      if (!choices.length) continue;
      const conflictScore = (c: "hard" | "soft" | false) => c === "hard" ? 2 : c === "soft" ? 1 : 0;
      const cost = (x: typeof choices[number]) => {
        const members = x.g.filter(Boolean) as Student[];
        const pos = unitDepth(x.gi, totalUnits, cols);
        let c = conflictScore(wouldConflict(student, members, constraints)) * 1000;
        c -= togetherCount(student, x.g, constraints) * 50;
        if (student.nearTeacher) c += Math.abs(pos - (teacherDeskAtFront ? 0 : 1)) * 12;
        const want = desiredDepth(student, ignoreVisibility);
        if (want !== null) c += Math.max(0, pos - want) * 8;
        if (student.behavior === "high") c += members.filter((m) => m.behavior === "high").length * 8;
        return c + x.filled * 0.4 + x.noise;
      };
      choices.sort((a, b) => cost(a) - cost(b));
      const choice = choices[0];
      const slot = groups[choice.gi].findIndex((s) => s === null);
      if (slot >= 0) groups[choice.gi][slot] = student;
    }

    const clean = groups.map((g) => g.filter(Boolean) as Student[]);
    const rotations = clean.map((_, gi) => currentRotations[gi] ?? 0);
    const m = scoreGroups(clean, constraints, lockedIds, teacherDeskAtFront, ignoreVisibility, cols);
    results.push({ id: crypto.randomUUID(), name: "", groups: clean, rotations, ...m });
  }

  results.sort((a, b) => b.score - a.score);
  const distinct: Arrangement[] = [];
  const sigs: Set<string>[] = [];
  for (const r of results) {
    const sig = signature(r.groups);
    if (sigs.every((o) => overlap(sig, o) < 0.6)) { distinct.push(r); sigs.push(sig); }
  }
  const pool = distinct.length >= count ? distinct : results;
  const span = Math.max(count - 1, Math.floor((pool.length - 1) * 0.85));
  const idx = new Set<number>();
  for (let k = 0; k < count && k < pool.length; k++) {
    let j = Math.round((k * span) / Math.max(count - 1, 1));
    while (idx.has(j) && j < pool.length - 1) j++;
    idx.add(j);
  }
  const picked = [...idx].sort((x, y) => x - y).map((j) => pool[j]).filter(Boolean);
  const best = picked[0];
  return picked.map((r, i) => ({ ...r, name: `Option ${String.fromCharCode(65 + i)}`, summary: compareSummary(r, best, i === 0, ignoreVisibility) }));
}

function compareSummary(r: Arrangement, best: Arrangement, isBest: boolean, ignoreVisibility: boolean): string {
  const notes: string[] = [];
  if (r.hardViolations) notes.push(`${r.hardViolations} must-apart pair together`);
  if (r.softViolations) notes.push(`${r.softViolations} preference missed`);
  if (!isBest && r.behavior < best.behavior - 2) notes.push("Energetic kids sit closer together");
  if (!isBest && !ignoreVisibility && r.visibility < best.visibility - 1) notes.push("Fewer front seats for those who need them");
  if (isBest) return notes[0] ?? (r.behavior < 82 ? "Best balance — a few energetic kids must share" : "Best balance of every need");
  return notes.slice(0, 2).join(" · ") || "Same balance, a fresh mix of seats";
}

export function rescoreGroups(groups: Student[][], constraints: Constraint[], lockedIds: Set<string>, teacherDeskAtFront = true, ignoreVisibility = false, cols = 1) {
  return scoreGroups(groups, constraints, lockedIds, teacherDeskAtFront, ignoreVisibility, cols);
}
