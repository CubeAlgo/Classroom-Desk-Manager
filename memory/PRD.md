# Desk Planner — PRD

## Original problem
Existing Vite + React + TS classroom Desk Planner (from Bolt, Supabase backend). User asked: fix the badly laid-out "create class" UI and the setup page; students page should just show/add students; a gear (settings) icon per student opens settings where teachers set visibility, behaviour, near teacher, separate, etc.

## Architecture
- Vite React TS at /app/src; preview served via /app/frontend/package.json (`vite --port 3000`)
- Data: Supabase when VITE_SUPABASE_URL/ANON_KEY set; otherwise localStorage fallback (src/localStore.ts)
- Seating engine: src/engine.ts (constraint strengths: hard, soft, together)

## Implemented (Oct 2026)
- New create-class card (name, layout option cards, teacher desk front/back, cancel/continue)
- Setup page: compact class-details bar + roster grid; add one student / paste a list
- Per-student gear -> settings drawer: visibility, behaviour, notes, near-teacher switch, keep apart (Must/Prefer), keep together
- Engine supports "together" constraints; planner ignores them for conflict badges
- Migration added: supabase/migrations/20261013120000_add_student_notes.sql (students.notes)

## Backlog
- P1: Show notes / together links on planner seat hover
- P1: Reorder students via drag
- P2: Print / export seating chart
