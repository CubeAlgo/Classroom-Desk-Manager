import type { Level, ConstraintStrength } from "./db";

export type LayoutType = "pairs" | "groups";

export interface Student {
  id: string;
  name: string;
  visibility: Level;
  behavior: Level;
  nearTeacher: boolean;
}

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
  if (layout === "pairs") return Array(Math.ceil(count / 2)).fill(2);
  if (targetGroupSize) return groupSizesFor(count, targetGroupSize);
  return groupSizes(count);
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

function seatQuality(student: Student, unitIndex: number, totalUnits: number, teacherDeskAtFront: boolean): number {
  const pos = totalUnits <= 1 ? 0 : unitIndex / (totalUnits - 1);
  const frontPref = (4 - valueScore(student.visibility)) / 3;
  let score = 1 - Math.abs(pos - frontPref) * 0.55;
  if (student.nearTeacher) {
    const teacherPos = teacherDeskAtFront ? 0 : 1;
    score += (1 - Math.abs(pos - teacherPos)) * 0.3;
  }
  return score;
}

function penalty(groups: Student[][], constraints: Constraint[]) {
  const unitMap = new Map<string, number>();
  groups.forEach((g, gi) => g.forEach((s) => unitMap.set(s.id, gi)));
  let hard = 0, soft = 0;
  for (const c of constraints) {
    if (!unitMap.has(c.aId) || !unitMap.has(c.bId)) continue;
    if (unitMap.get(c.aId) === unitMap.get(c.bId)) {
      if (c.strength === "hard") hard++; else soft++;
    }
  }
  return { hardViolations: hard, softViolations: soft };
}

function scoreGroups(groups: Student[][], constraints: Constraint[], lockedIds: Set<string>, teacherDeskAtFront: boolean) {
  const total = groups.length;
  let vis = 0, beh = 0, locked = 0;
  groups.forEach((g, gi) => {
    g.forEach((s) => {
      vis += seatQuality(s, gi, total, teacherDeskAtFront) * 100;
      beh += 100 - (valueScore(s.behavior) - 1) * 8;
      if (lockedIds.has(s.id)) locked++;
    });
  });
  const n = Math.max(groups.reduce((a, g) => a + g.length, 0), 1);
  vis /= n; beh /= n;
  const p = penalty(groups, constraints);
  const score = Math.max(0, Math.round(
    vis * 0.5 + beh * 0.3 +
    (p.hardViolations === 0 ? 15 : Math.max(0, 15 - p.hardViolations * 7)) +
    Math.max(0, 5 - p.softViolations * 2)
  ));
  return { score, visibility: Math.round(vis), behavior: Math.round(beh), hardViolations: p.hardViolations, softViolations: p.softViolations, lockedCount: locked };
}

function wouldConflict(student: Student, group: Student[], constraints: Constraint[]): "hard" | "soft" | false {
  let result: "hard" | "soft" | false = false;
  for (const c of constraints) {
    const ids = new Set(group.map((s) => s.id));
    const matches = (c.aId === student.id && ids.has(c.bId)) || (c.bId === student.id && ids.has(c.aId));
    if (matches) {
      if (c.strength === "hard") return "hard";
      result = "soft";
    }
  }
  return result;
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
}

export function generateArrangements(params: GenParams): Arrangement[] {
  const { students, constraints, layout, lockedIds, currentGroups, currentRotations, count = 5, targetGroupSize, teacherDeskAtFront = true } = params;
  if (students.length === 0) return [];

  const capacities = getCapacities(students.length, layout, targetGroupSize);
  const totalUnits = capacities.length;
  const results: Arrangement[] = [];

  const lockedPlacement = new Map<string, [number, number]>();
  currentGroups.forEach((g, gi) => g.forEach((s, si) => {
    if (lockedIds.has(s.id)) lockedPlacement.set(s.id, [gi, si]);
  }));

  for (let i = 0; i < count + 3; i++) {
    const rng = seeded(41 + i * 17 + students.length * 3);
    const groups: (Student | null)[][] = Array.from({ length: totalUnits }, (_, gi) =>
      Array(capacities[gi]).fill(null)
    );

    for (const s of students) {
      if (!lockedIds.has(s.id)) continue;
      const p = lockedPlacement.get(s.id);
      if (p && p[0] < groups.length && p[1] < groups[p[0]].length) groups[p[0]][p[1]] = s;
    }

    const unplaced = shuffle(students.filter((s) => !lockedIds.has(s.id)), rng);
    unplaced.sort((a, b) => valueScore(b.visibility) - valueScore(a.visibility));
    const shuffled = shuffle(unplaced, rng);

    for (const student of shuffled) {
      const choices = groups
        .map((g, gi) => ({ gi, g, cap: capacities[gi], filled: g.filter(Boolean).length }))
        .filter((x) => x.filled < x.cap);
      if (!choices.length) continue;

      choices.sort((a, b) => {
        const aConflict = wouldConflict(student, a.g.filter(Boolean) as Student[], constraints);
        const bConflict = wouldConflict(student, b.g.filter(Boolean) as Student[], constraints);
        const conflictScore = (c: "hard" | "soft" | false) => c === "hard" ? 2 : c === "soft" ? 1 : 0;
        if (conflictScore(aConflict) !== conflictScore(bConflict)) return conflictScore(aConflict) - conflictScore(bConflict);

        if (student.nearTeacher) {
          const teacherPos = teacherDeskAtFront ? 0 : totalUnits - 1;
          const aDist = Math.abs(a.gi - teacherPos);
          const bDist = Math.abs(b.gi - teacherPos);
          if (aDist !== bDist) return aDist - bDist;
        }

        const aB = a.g.filter(Boolean).filter((s) => (s as Student).behavior === "high").length;
        const bB = b.g.filter(Boolean).filter((s) => (s as Student).behavior === "high").length;
        if (aB !== bB) return aB - bB;
        return a.filled - b.filled;
      });

      const choice = choices[0];
      const slot = groups[choice.gi].findIndex((s) => s === null);
      if (slot >= 0) groups[choice.gi][slot] = student;
    }

    const clean = groups.map((g) => g.filter(Boolean) as Student[]);
    const rotations = clean.map((_, gi) => currentRotations[gi] ?? 0);
    const m = scoreGroups(clean, constraints, lockedIds, teacherDeskAtFront);
    results.push({ id: crypto.randomUUID(), name: `Option ${String.fromCharCode(65 + i)}`, groups: clean, rotations, ...m });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, count);
}

export function rescoreGroups(groups: Student[][], constraints: Constraint[], lockedIds: Set<string>, teacherDeskAtFront = true) {
  return scoreGroups(groups, constraints, lockedIds, teacherDeskAtFront);
}
