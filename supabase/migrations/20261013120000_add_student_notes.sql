/*
  # Add notes to students
  - `students`: add `notes` column (text, default '')
  - `constraints.strength` may now also be 'together' (keep students together)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'notes'
  ) THEN
    ALTER TABLE students ADD COLUMN notes text NOT NULL DEFAULT '';
  END IF;
END $$;

ALTER TABLE students ADD COLUMN IF NOT EXISTS hearing text NOT NULL DEFAULT 'high';
ALTER TABLE students ADD COLUMN IF NOT EXISTS esl boolean NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar text NOT NULL DEFAULT '';
