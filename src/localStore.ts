// Browser-only fallback used when Supabase env vars are not configured.
type Row = { id: string; created_at: string; [k: string]: unknown };
const KEY = "desk-planner-db";

function readAll(): Record<string, Row[]> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function writeAll(db: Record<string, Row[]>) { localStorage.setItem(KEY, JSON.stringify(db)); }

export const local = {
  list(table: string, filter?: (r: Row) => boolean): Row[] {
    const rows = readAll()[table] || [];
    return filter ? rows.filter(filter) : rows;
  },
  insert(table: string, values: Record<string, unknown>): Row {
    const db = readAll();
    const row: Row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...values };
    db[table] = [...(db[table] || []), row];
    writeAll(db);
    return row;
  },
  update(table: string, id: string, patch: Record<string, unknown>) {
    const db = readAll();
    db[table] = (db[table] || []).map((r) => (r.id === id ? { ...r, ...patch } : r));
    writeAll(db);
  },
  remove(table: string, pred: (r: Row) => boolean) {
    const db = readAll();
    db[table] = (db[table] || []).filter((r) => !pred(r));
    writeAll(db);
  },
};
