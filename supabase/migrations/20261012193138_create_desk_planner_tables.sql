/*
# Classroom Desk Planner — Database Schema (single-tenant, no auth)

1. New Tables
- `classes`: A teacher's named class (e.g. "Period 3 — Algebra II").
  - id (uuid PK)
  - name (text, not null)
  - layout (text: 'pairs' or 'groups', default 'pairs')
  - created_at (timestamptz)

- `students`: Individual students belonging to a class.
  - id (uuid PK)
  - class_id (uuid FK → classes.id ON DELETE CASCADE)
  - name (text, not null)
  - visibility (text: 'low'/'medium'/'high', default 'medium')
  - behavior (text: 'low'/'medium'/'high', default 'medium')
  - sort_order (int, default 0)
  - created_at (timestamptz)

- `constraints`: Separation rules between two students.
  - id (uuid PK)
  - class_id (uuid FK → classes.id ON DELETE CASCADE)
  - student_a_id (uuid FK → students.id ON DELETE CASCADE)
  - student_b_id (uuid FK → students.id ON DELETE CASCADE)
  - strength (text: 'hard' or 'soft', default 'hard')
  - created_at (timestamptz)

- `arrangements`: A saved seating arrangement for a class.
  - id (uuid PK)
  - class_id (uuid FK → classes.id ON DELETE CASCADE)
  - name (text, not null)
  - score (int, default 0)
  - groups_data (jsonb — array of arrays of student IDs)
  - rotations_data (jsonb — array of rotation angles in degrees)
  - locked_ids (jsonb — array of student IDs that are locked)
  - created_at (timestamptz)

2. Security
- RLS enabled on all tables.
- Single-tenant no-auth app: all policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because data is intentionally shared/public.
*/

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  layout text NOT NULL DEFAULT 'pairs',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_classes" ON classes;
CREATE POLICY "anon_select_classes" ON classes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_classes" ON classes;
CREATE POLICY "anon_insert_classes" ON classes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_classes" ON classes;
CREATE POLICY "anon_update_classes" ON classes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_classes" ON classes;
CREATE POLICY "anon_delete_classes" ON classes FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  visibility text NOT NULL DEFAULT 'medium',
  behavior text NOT NULL DEFAULT 'medium',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS constraints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_a_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  strength text NOT NULL DEFAULT 'hard',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_constraints_class_id ON constraints(class_id);

ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_constraints" ON constraints;
CREATE POLICY "anon_select_constraints" ON constraints FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_constraints" ON constraints;
CREATE POLICY "anon_insert_constraints" ON classes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_constraints" ON constraints;
CREATE POLICY "anon_update_constraints" ON constraints FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_constraints" ON constraints;
CREATE POLICY "anon_delete_constraints" ON constraints FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS arrangements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  score int NOT NULL DEFAULT 0,
  groups_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  rotations_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  locked_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arrangements_class_id ON arrangements(class_id);

ALTER TABLE arrangements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_arrangements" ON arrangements;
CREATE POLICY "anon_select_arrangements" ON arrangements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_arrangements" ON arrangements;
CREATE POLICY "anon_insert_arrangements" ON arrangements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_arrangements" ON arrangements;
CREATE POLICY "anon_update_arrangements" ON arrangements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_arrangements" ON arrangements;
CREATE POLICY "anon_delete_arrangements" ON arrangements FOR DELETE
  TO anon, authenticated USING (true);
