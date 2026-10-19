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

## Iteration 3-4 (Oct 2026)
- Home: bigger hero, colourful elementary classroom preview, teacher testimonial, new logo (table + 4 kids)
- Duplicate student names blocked; roster avatars S1, S2...
- Rectangular group tables, seats above/below; "First L." seat names, bigger
- Varied seating options (diverse, spread scores, short summaries); hard conflicts named on cards
- Room key panel (locked, conflicts, legend); drag students across tables; teacher desk drag x+y; front/back toggle fixed
- Group Maker: no visibility, behaviour labels, score summary
- Cozy lo-fi music with persistent global mute (synced across tabs)

## Iteration 5 (Oct 2026)
- Rotating testimonials (Schnell, Creighton, Hardimen)
- Saved named plans + saved room layout (browser localStorage: desk-planner-plans, desk-planner-room-layouts)
- Optional kid avatars (colour + lucide animal), Hearing level, ESL toggle (migration adds hearing/esl/avatar)
- Layouts: 1s, Pairs, 3s, 4s, 5s
- Group Maker drag between groups; multi-select copy/paste students between classes (Ctrl/Cmd+C/V)
- Regenerate gives fresh options; uneven group size penalty

## Iteration 6-7 (Oct 2026)
- Map: V/B/H badges always; roomier auto layout (column count from footprint), vertical group tables w/ seats left/right, side columns tilted 10deg
- Fixed 1200px to-scale room in RoomViewport (auto-fit scale + Full screen with Regenerate)
- Engine: depth by grid row (cols param), uneven-size fix

## Iteration 8-9
- Renamed to Deskly; How-to section (8 steps) under testimonials with arrow jump
- Balanced/centered table rows, stale layout ignored (RoomLayout v2 + size), tilt only edge tables in rows of 3+
- Student colour fills whole seat (map + Group Maker)
- Iteration 10: mascots removed (colour only), tinted seat badges white w/ level colours, info row (key/plans/score) below map
