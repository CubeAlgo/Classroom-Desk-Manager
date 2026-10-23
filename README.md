# Deskly

**Classroom seating, made simple.**

Built by the **AlgoHawk Team**: [CubeAlgo](https://github.com/CubeAlgo) (Avneet) and [CyberHawk09](https://github.com/CyberHawk09) (Conner)

**[Try the live app →](https://classroom-desk-manager.vercel.app)**

---

## Overview

Deskly turns a class list into a thoughtful seating plan in seconds. Tell it who needs the front row, who should sit apart (or together), and where your desk is. It generates five scored seating options that you can compare, drag around, lock in place, and save. A built-in Group Maker handles balanced groups for activities.

## Features

- **Five scored options per class**, each with a one-line explanation of its trade-offs
- **Per-student needs**: visibility, hearing, behaviour, ESL support, and near-teacher seating
- **Keep apart / keep together rules**, with "Must" or "Prefer" strictness
- **Flexible layouts**: singles, pairs, or tables of 3, 4, or 5
- **Interactive classroom map**: drag students and tables, rotate, lock seats, zoom, and go full screen
- **Saved plans and room layouts** with names and comments
- **Group Maker** for balanced groups of 2 to 6
- **Private by default**: your data stays in your browser (Supabase is optional)

## How to Use

### 1. Create a class
Open **My classes → New class**. Choose a class name, a starting layout (Singles, Pairs, Threes, Fours, or Fives), and whether the teacher's desk is at the **front** or **back** of the room. You can change all of these later on the setup page.

### 2. Add students
On the setup page, type a name and press **Enter**, or click **Paste a list** to add many at once (one name per line, or comma-separated). Names must be unique within a class, so add a last initial if two students share a first name.

### 3. Set each student's needs
Click the **gear icon** next to a student to open their settings. Changes save automatically.

| Setting | What it does |
|---|---|
| **Visibility** | Low means the student needs a front seat. High means any seat is fine. |
| **Hearing** | Low means the student needs a front seat. |
| **Behaviour** | Calm, Medium, or Energetic. Energetic students are spread across tables and paired with calmer peers. |
| **Sit near the teacher** | Places the student closest to the teacher's desk, wherever it is. |
| **ESL / language support** | Seats the student closer to the front and the teacher. |
| **Keep apart from** | Pick students to separate. Toggle **Must** (strict) or **Prefer** (flexible). |
| **Keep together with** | Pick students Deskly should try to seat at the same desk or table. |
| **Behaviour notes** | Private notes for your own reference. |
| **Seat colour** | Optional colour that fills the student's seat on the map. |

### 4. Compare seating options
Click **See seating arrangements**. Deskly generates **Options A to E** straight away:

- Each card shows a **score out of 100** and a short summary. Option A is the top pick.
- Click any option to load it onto the classroom map.
- Click **Regenerate** for a fresh set of options at any time.
- The **Why this score?** panel breaks the selected option down into *front-seat needs* and *calm tables*.
- The **Room key** lists locked students and any must-apart conflicts, and explains the seat badges (V = visibility, B = behaviour, H = hearing, ESL, ★ = near teacher, 🔒 = locked, ! = must-apart conflict, ~ = prefer-apart conflict).

### 5. Fine-tune the room
Adjust the selected plan directly on the map:

| Action | How |
|---|---|
| **Move a student** | Drag them onto another seat (to swap) or onto another table (to move). The score updates live. |
| **Lock a seat** | Click a student. Locked students can't be moved and **stay put when you regenerate**. Click again to unlock. |
| **Move a table** | Drag the table anywhere on the map. |
| **Rotate a table** | Use ↺ / ↻ (15° steps), drag the ⟳ handle for free rotation, or ⤾ to reset. |
| **Move the teacher's desk** | Drag it anywhere, or use **Desk: Front/Back (swap)** in the top bar. |
| **Zoom** | Use the +/− buttons, pinch, or Ctrl/⌘ + scroll (100% to 300%). |
| **Full screen** | Click **Full screen** for a larger view, with Regenerate still available. |

### 6. Save your work
- **Save room layout** keeps your table and desk positions for every new plan in that class.
- **Save plan** stores the current seating under a name, with optional comments (for example, a note for a substitute teacher). Saved plans can be reopened, edited, or deleted at any time. If students have been added since a plan was saved, they are seated at the smallest table when it is reopened.

## How Seating Plans Are Generated

Deskly's engine builds many candidate arrangements, scores each one, and shows you five distinct choices.

1. **It seats students to meet their needs.** Students with low visibility, low hearing, or ESL support are pulled toward the front. Near-teacher students are placed close to your desk.
2. **It respects your rules.** Must-apart pairs are strongly avoided, prefer-apart pairs are avoided where possible, and keep-together pairs are seated together where possible.
3. **It balances behaviour.** Energetic students are spread across tables and, where possible, paired with calm students. Table sizes are kept even.
4. **It scores and selects.** The engine runs 48 randomised attempts and scores each out of 100:
   - Front-seat needs: up to 45 points
   - Calm tables: up to 35 points
   - Rules (apart/together): up to 20 points
5. **It picks five distinct options.** Near-duplicates are filtered out, and the five options are spread across the quality range so you see real alternatives.

Scores are colour-coded: **90+** great, **80+** good, **70+** okay, below 70 low.

## Group Maker

For group work rather than a full seating plan:

1. Open **Try Group Maker** from the home page, or click **Group Maker** on any class.
2. Pick a class and a **group size** (2 to 6), then click **Generate groups**.
3. Compare five scored options and **drag students between groups** to adjust.

Group Maker scores behaviour balance and your keep-apart/together rules. It ignores seat position, so it works for any activity. A class needs at least two students.

## Copy Students Between Classes

Splitting a class or reusing a roster? On the setup page, tick the students you want (or press Ctrl/⌘ + A for everyone), press **Ctrl/⌘ + C**, open another class, and press **Ctrl/⌘ + V**. Student settings and the rules between copied students come along. Students whose names already exist in the target class are skipped.

## Data and Privacy

By default, Deskly stores everything **in your browser on your device**. There are no accounts and nothing is uploaded. Clearing your browser data removes your classes.

To use a shared backend instead, create a [Supabase](https://supabase.com) project, run the SQL files in [`supabase/migrations`](supabase/migrations) in order, and add these to a `.env` file:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Classes, students, and rules are then stored in Supabase. Saved plans, room layouts, and the music preference always stay in the browser. The included migrations are single-tenant with no authentication, so they are intended for personal or demo use.

## Run Locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/CubeAlgo/Classroom-Desk-Manager.git
cd Classroom-Desk-Manager
npm install
npm run dev
```

Then open the local URL printed in your terminal. Other scripts:

| Command | Description |
|---|---|
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build locally |

## Tech Stack

React 18 · TypeScript · Vite · Supabase (optional) · lucide-react

## Project Structure

```
src/
├── App.tsx                  Page routing
├── engine.ts                Seating generation and scoring
├── db.ts                    Data layer (Supabase or browser storage)
├── plans.ts                 Saved plans and room layouts
├── lib.ts                   Layout options, labels, and colours
├── music.ts                 Optional lo-fi background music
└── components/
    ├── Tools.tsx            Home page and site header
    ├── Hub.tsx              Class list and class creation
    ├── Setup.tsx            Class details and student roster
    ├── StudentSettings.tsx  Per-student settings drawer
    ├── Planner.tsx          Classroom map, options, and saved plans
    ├── RoomViewport.tsx     Zoom and full-screen viewport
    └── GroupMaker.tsx       Balanced group generator
supabase/migrations/         Database schema
```

## Authors

**AlgoHawk Team**: [CubeAlgo](https://github.com/CubeAlgo) (Avneet) and [CyberHawk09](https://github.com/CyberHawk09) (Conner)
