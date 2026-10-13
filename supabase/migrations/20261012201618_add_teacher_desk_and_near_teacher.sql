/*
# Add teacher desk position and near-teacher seating option

1. Modified Tables
- `classes`: add `teacher_desk_position` column (text: 'front' or 'back', default 'front')
  — Lets the teacher place their desk at the front or back of the room.
- `students`: add `near_teacher` column (boolean, default false)
  — When true, the seating engine tries to place this student close to the teacher's desk.
  Intended for high-behavior students who need closer supervision.

2. Security
- No new tables. Existing RLS policies already cover UPDATE on both tables
  (TO anon, authenticated USING (true) WITH CHECK (true)), so the new columns
  are writable by the same single-tenant no-auth app without additional policies.

3. Notes
- Both columns are additive (ALTER TABLE ADD COLUMN) — no data is lost.
- Defaults ensure existing rows get sensible values automatically.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'teacher_desk_position'
  ) THEN
    ALTER TABLE classes ADD COLUMN teacher_desk_position text NOT NULL DEFAULT 'front';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'near_teacher'
  ) THEN
    ALTER TABLE students ADD COLUMN near_teacher boolean NOT NULL DEFAULT false;
  END IF;
END $$;
