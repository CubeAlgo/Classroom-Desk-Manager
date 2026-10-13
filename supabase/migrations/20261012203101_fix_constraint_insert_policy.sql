/*
# Fix constraint INSERT policy (was on wrong table)

1. Bug
- The original migration created the INSERT policy for `constraints` on the `classes` table by mistake:
  `CREATE POLICY "anon_insert_constraints" ON classes FOR INSERT ...`
- This means there is NO INSERT policy on the `constraints` table, so all inserts fail RLS silently.

2. Fix
- Drop the misplaced policy from `classes`.
- Create the correct INSERT policy on `constraints` with `TO anon, authenticated WITH CHECK (true)`.
*/

DROP POLICY IF EXISTS "anon_insert_constraints" ON classes;
DROP POLICY IF EXISTS "anon_insert_constraints" ON constraints;

CREATE POLICY "anon_insert_constraints" ON constraints FOR INSERT
  TO anon, authenticated WITH CHECK (true);
