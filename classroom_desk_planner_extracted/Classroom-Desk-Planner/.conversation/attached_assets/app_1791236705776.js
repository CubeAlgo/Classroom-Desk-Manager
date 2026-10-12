const state = {
  layout: "pairs",
  students: [],
  constraints: [],
  candidates: [],
  selectedCandidate: null,
  currentArrangement: [],
  lockedStudents: new Set()
};

const demoNames = [
  "Ava", "Ben", "Carla", "Diego", "Elena", "Finn",
  "Grace", "Hassan", "Ivy", "Jake", "Kayla", "Leo",
  "Maya", "Noah", "Olivia", "Priya", "Quinn", "Riley",
  "Sofia", "Theo", "Uma", "Victor", "Willow", "Zane"
];

const demoStudents = demoNames.map((name, i) => ({
  id: crypto.randomUUID(),
  name,
  visibility: ["medium","high","medium","low","medium","high"][i % 6],
  behavior: ["low","medium","high","medium","low","medium"][i % 6]
}));

state.students = demoStudents;

const $ = (selector) => document.querySelector(selector);

function uniquePairs(arr) {
  const pairs = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      pairs.push([arr[i], arr[j]]);
    }
  }
  return pairs;
}

function normaliseName(name) {
  return String(name || "").trim();
}

function renderStats() {
  $("#studentCount").textContent = state.students.length;
  $("#unitCount").textContent = state.layout === "pairs"
    ? Math.ceil(state.students.length / 2)
    : groupSizes(state.students.length).length;
}

function groupSizes(n) {
  if (n <= 0) return [];
  const groups = Math.ceil(n / 5);
  const sizes = Array(groups).fill(5);
  let extra = groups * 5 - n;

  // Convert 5s into smaller balanced groups rather than leaving one tiny group.
  let idx = groups - 1;
  while (extra > 0) {
    if (sizes[idx] > 4) {
      sizes[idx]--;
      extra--;
    } else {
      idx--;
      if (idx < 0) break;
    }
  }

  // A second pass handles cases such as 26–29 by balancing toward 4–5 seats.
  while (sizes.some(s => s < 4) && groups > 1) {
    sizes[sizes.indexOf(5)]--;
    sizes[sizes.lastIndexOf(4)]++;
  }
  return sizes;
}

function renderStudents() {
  const container = $("#studentList");
  container.innerHTML = "";

  state.students.forEach(student => {
    const row = document.getElementById("studentTemplate").content.firstElementChild.cloneNode(true);
    row.dataset.id = student.id;

    const name = row.querySelector(".student-name");
    const vis = row.querySelector(".student-visibility");
    const beh = row.querySelector(".student-behavior");
    const lock = row.querySelector(".lock-student");
    const del = row.querySelector(".delete-student");

    name.value = student.name;
    vis.value = student.visibility;
    beh.value = student.behavior;

    if (state.lockedStudents.has(student.id)) {
      row.classList.add("locked");
      lock.classList.add("active");
      lock.textContent = "●";
    }

    name.addEventListener("input", e => {
      student.name = e.target.value;
      renderConstraints();
      renderClassTitle();
    });
    vis.addEventListener("change", e => {
      student.visibility = e.target.value;
    });
    beh.addEventListener("change", e => {
      student.behavior = e.target.value;
    });
    lock.addEventListener("click", () => {
      if (state.lockedStudents.has(student.id)) {
        state.lockedStudents.delete(student.id);
      } else {
        state.lockedStudents.add(student.id);
      }
      renderStudents();
      renderClassroom(state.currentArrangement);
    });
    del.addEventListener("click", () => {
      state.lockedStudents.delete(student.id);
      state.constraints = state.constraints.filter(([a,b]) => a !== student.id && b !== student.id);
      state.students = state.students.filter(s => s.id !== student.id);
      renderAll();
    });

    container.appendChild(row);
  });

  renderStats();
}

function renderConstraints() {
  const container = $("#constraintList");
  container.innerHTML = "";

  if (!state.constraints.length) {
    const empty = document.createElement("div");
    empty.style.cssText = "font-size:11px;color:#8a93a0;padding:8px 0;";
    empty.textContent = "No separation rules yet.";
    container.appendChild(empty);
    return;
  }

  state.constraints.forEach((constraint, index) => {
    const row = document.getElementById("constraintTemplate").content.firstElementChild.cloneNode(true);
    const a = row.querySelector(".constraint-a");
    const b = row.querySelector(".constraint-b");
    const strength = row.querySelector(".constraint-strength");

    fillStudentOptions(a);
    fillStudentOptions(b);

    a.value = constraint[0];
    b.value = constraint[1];
    strength.value = constraint[2];

    a.addEventListener("change", e => state.constraints[index][0] = e.target.value);
    b.addEventListener("change", e => state.constraints[index][1] = e.target.value);
    strength.addEventListener("change", e => state.constraints[index][2] = e.target.value);

    row.querySelector(".delete-constraint").addEventListener("click", () => {
      state.constraints.splice(index, 1);
      renderConstraints();
    });

    container.appendChild(row);
  });
}

function fillStudentOptions(select) {
  select.innerHTML = state.students.map(s =>
    `<option value="${escapeHtml(s.id)}">${escapeHtml(normaliseName(s.name) || "Unnamed")}</option>`
  ).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderClassTitle() {
  const title = $("#className").value.trim() || "Untitled class";
  $("#classTitle").textContent = title;
}

function addStudent() {
  const newStudent = {
    id: crypto.randomUUID(),
    name: `Student ${state.students.length + 1}`,
    visibility: "medium",
    behavior: "medium"
  };
  state.students.push(newStudent);
  renderStudents();
  renderConstraints();
}

function addConstraint() {
  if (state.students.length < 2) return;
  const [a, b] = state.students.slice(0,2);
  state.constraints.push([a.id, b.id, "hard"]);
  renderConstraints();
}

function getUnitCapacity() {
  return state.layout === "pairs" ? 2 : 5;
}

function buildUnits() {
  const units = [];
  if (state.layout === "pairs") {
    for (let i = 0; i < state.students.length; i += 2) {
      units.push(state.students.slice(i, i + 2));
    }
  } else {
    const sizes = groupSizes(state.students.length);
    let cursor = 0;
    sizes.forEach(size => {
      units.push(state.students.slice(cursor, cursor + size));
      cursor += size;
    });
  }
  return units;
}

function shuffle(array, rng = Math.random) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function valueScore(value) {
  return value === "low" ? 1 : value === "medium" ? 2 : 3;
}

function calculateSeatQuality(student, unitIndex, totalUnits) {
  // Unit 0 is closest to the board in this MVP.
  const normalizedPosition = totalUnits <= 1 ? 0 : unitIndex / (totalUnits - 1);
  const frontPreference = (4 - valueScore(student.visibility)) / 3;
  return 1 - Math.abs(normalizedPosition - frontPreference) * 0.55;
}

function arrangementPenalty(arrangement) {
  const unitMap = new Map();
  arrangement.forEach((unit, unitIndex) => {
    unit.forEach(s => unitMap.set(s.id, unitIndex));
  });

  let hardViolations = 0;
  let softViolations = 0;

  for (const [aId, bId, strength] of state.constraints) {
    if (!unitMap.has(aId) || !unitMap.has(bId)) continue;
    if (unitMap.get(aId) === unitMap.get(bId)) {
      if (strength === "hard") hardViolations++;
      else softViolations++;
    }
  }
  return { hardViolations, softViolations, unitMap };
}

function scoreArrangement(arrangement) {
  const totalUnits = arrangement.length;
  let visibility = 0;
  let behavior = 0;
  let locked = 0;

  arrangement.forEach((unit, unitIndex) => {
    unit.forEach(student => {
      visibility += calculateSeatQuality(student, unitIndex, totalUnits) * 100;
      const behaviorPenalty = (valueScore(student.behavior) - 1) * 8;
      behavior += 100 - behaviorPenalty;

      if (state.lockedStudents.has(student.id)) locked++;
    });
  });

  const n = Math.max(state.students.length, 1);
  visibility /= n;
  behavior /= n;

  const penalties = arrangementPenalty(arrangement);
  const score = Math.max(
    0,
    Math.round(
      visibility * 0.5 +
      behavior * 0.3 +
      (penalties.hardViolations === 0 ? 15 : Math.max(0, 15 - penalties.hardViolations * 7)) +
      Math.max(0, 5 - penalties.softViolations * 2)
    )
  );

  return {
    score,
    visibility: Math.round(visibility),
    behavior: Math.round(behavior),
    hardViolations: penalties.hardViolations,
    softViolations: penalties.softViolations,
    locked
  };
}

function createCandidate(seed) {
  let working = shuffle(state.students, () => seeded(seed));

  // Put high visibility students toward the front, but introduce controlled randomness.
  working.sort((a,b) => valueScore(b.visibility) - valueScore(a.visibility));

  const units = Array.from({ length: state.layout === "pairs"
    ? Math.ceil(working.length / 2)
    : groupSizes(working.length).length }, () => []);

  const lockedStudents = state.students.filter(s => state.lockedStudents.has(s.id));

  // Preserve locked student slots from the current arrangement where possible.
  const lockedPlacement = new Map();
  if (state.currentArrangement.length) {
    state.currentArrangement.forEach((unit, ui) => {
      unit.forEach((student, si) => {
        if (state.lockedStudents.has(student.id)) {
          lockedPlacement.set(student.id, [ui, si]);
        }
      });
    });
  }

  // Place locked students first.
  for (const student of lockedStudents) {
    const placement = lockedPlacement.get(student.id);
    if (placement) {
      const [ui, si] = placement;
      if (!units[ui]) units[ui] = [];
      units[ui][si] = student;
    }
  }

  const unplaced = working.filter(s => !lockedStudents.some(l => l.id === s.id));
  let cursor = 0;

  const capacities = state.layout === "pairs"
    ? units.map(() => 2)
    : groupSizes(state.students.length);

  // Greedy fill, preferring units with fewer high-behavior students and respecting hard constraints.
  for (const student of shuffle(unplaced, () => seeded(seed + student.id.length))) {
    const choices = units.map((unit, ui) => ({
      ui,
      unit,
      capacity: capacities[ui] || getUnitCapacity()
    })).filter(x => x.unit.filter(Boolean).length < x.capacity);

    choices.sort((a,b) => {
      const aHard = wouldCreateHardConflict(student, a.unit);
      const bHard = wouldCreateHardConflict(student, b.unit);
      if (aHard !== bHard) return aHard - bHard;

      const aHighBeh = a.unit.filter(Boolean).filter(s => s.behavior === "high").length;
      const bHighBeh = b.unit.filter(Boolean).filter(s => s.behavior === "high").length;
      if (aHighBeh !== bHighBeh) return aHighBeh - bHighBeh;

      return a.unit.filter(Boolean).length - b.unit.filter(Boolean).length;
    });

    const choice = choices[0];
    if (!choice) continue;
    const nextSlot = choice.unit.findIndex(s => !s);
    if (nextSlot >= 0) choice.unit[nextSlot] = student;
    else choice.unit.push(student);
  }

  return units.map(unit => unit.filter(Boolean));
}

function wouldCreateHardConflict(student, unit) {
  return state.constraints.some(([a,b,strength]) => {
    if (strength !== "hard") return false;
    const ids = new Set(unit.map(s => s.id));
    return (a === student.id && ids.has(b)) || (b === student.id && ids.has(a));
  });
}

function seeded(n) {
  const x = Math.sin(n * 999.91) * 10000;
  return x - Math.floor(x);
}

function generateCandidates() {
  if (!state.students.length) return;

  const candidates = [];
  for (let i = 0; i < 8; i++) {
    const arrangement = createCandidate(41 + i * 17);
    const metrics = scoreArrangement(arrangement);
    candidates.push({
      id: crypto.randomUUID(),
      name: `Option ${String.fromCharCode(65 + i)}`,
      arrangement,
      ...metrics
    });
  }

  candidates.sort((a,b) => b.score - a.score);
  state.candidates = candidates.slice(0, 5);
  state.selectedCandidate = state.candidates[0]?.id || null;
  state.currentArrangement = state.candidates[0]?.arrangement || [];
  renderCandidates();
  renderClassroom(state.currentArrangement);
  renderInsight(state.candidates[0]);
}

function renderCandidates() {
  const list = $("#candidateList");
  $("#candidateCount").textContent = `${state.candidates.length} options`;

  if (!state.candidates.length) {
    list.className = "candidate-list empty-state";
    list.innerHTML = `
      <div class="empty-icon">✦</div>
      <h3>No arrangements yet</h3>
      <p>Generate a few options, then compare their tradeoffs.</p>
    `;
    return;
  }

  list.className = "candidate-list";
  list.innerHTML = state.candidates.map(c => `
    <div class="candidate-card ${c.id === state.selectedCandidate ? "selected" : ""}" data-id="${c.id}">
      <div class="candidate-score">${c.score}</div>
      <div>
        <div class="candidate-title">${escapeHtml(c.name)}</div>
        <div class="candidate-detail">Visibility ${c.visibility}% · Behavior ${c.behavior}% · ${c.hardViolations} hard conflicts</div>
      </div>
      <div class="candidate-tag">${c.hardViolations === 0 ? "Clean" : "Review"}</div>
    </div>
  `).join("");

  list.querySelectorAll(".candidate-card").forEach(card => {
    card.addEventListener("click", () => {
      state.selectedCandidate = card.dataset.id;
      const candidate = state.candidates.find(c => c.id === state.selectedCandidate);
      state.currentArrangement = candidate.arrangement;
      renderCandidates();
      renderClassroom(candidate.arrangement);
      renderInsight(candidate);
    });
  });
}

function renderInsight(candidate) {
  const box = $("#insightBox");
  if (!candidate) {
    box.innerHTML = `<div class="insight-score"><span>—</span><small>/100</small></div><p>Select a candidate to see what the planner prioritized.</p>`;
    return;
  }

  const notes = [];
  notes.push(`${candidate.visibility}% visibility fit across the class.`);
  notes.push(`${candidate.behavior}% behavior-balancing score.`);
  notes.push(candidate.hardViolations === 0
    ? "All hard separation rules are satisfied."
    : `${candidate.hardViolations} hard separation conflict${candidate.hardViolations === 1 ? "" : "s"} remain.`);
  if (candidate.softViolations > 0) notes.push(`${candidate.softViolations} soft preference conflict${candidate.softViolations === 1 ? "" : "s"} remain.`);
  if (candidate.locked > 0) notes.push(`${candidate.locked} locked student${candidate.locked === 1 ? "" : "s"} were kept in place.`);

  box.innerHTML = `
    <div class="insight-score"><span>${candidate.score}</span><small>/100</small></div>
    <p>This is a starting recommendation, not a final judgment.</p>
    <ul class="insight-list">${notes.map(n => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
  `;
}

function renderClassroom(arrangement) {
  const classroom = $("#classroom");
  classroom.className = `classroom ${state.layout}`;
  classroom.innerHTML = "";

  if (!arrangement.length) {
    classroom.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#8a93a0;padding:80px 0;">Generate an arrangement to see the classroom.</div>`;
    return;
  }

  arrangement.forEach((unit, unitIndex) => {
    const desk = document.createElement("div");
    desk.className = "desk-unit";
    const label = document.createElement("div");
    label.className = "unit-label";
    label.textContent = state.layout === "pairs" ? `Desk ${unitIndex + 1}` : `Group ${unitIndex + 1}`;
    desk.appendChild(label);

    const seatRow = document.createElement("div");
    seatRow.className = "seat-row";

    unit.forEach(student => {
      const seat = document.createElement("div");
      seat.className = "seat";

      const name = document.createElement("div");
      name.className = "seat-name";
      name.textContent = normaliseName(student.name) || "Unnamed";

      const badges = document.createElement("div");
      badges.className = "seat-badges";

      if (state.lockedStudents.has(student.id)) {
        const locked = document.createElement("span");
        locked.className = "badge locked";
        locked.textContent = "LOCK";
        badges.appendChild(locked);
      }

      const visibility = document.createElement("span");
      visibility.className = "badge";
      visibility.textContent = student.visibility[0].toUpperCase();
      badges.appendChild(visibility);

      seat.append(name, badges);
      seatRow.appendChild(seat);
    });

    desk.appendChild(seatRow);
    classroom.appendChild(desk);
  });
}

function renderAll() {
  renderStudents();
  renderConstraints();
  renderClassTitle();
  renderStats();
  renderClassroom(state.currentArrangement);
}

document.querySelectorAll("#layoutPicker button").forEach(button => {
  button.addEventListener("click", () => {
    state.layout = button.dataset.layout;
    document.querySelectorAll("#layoutPicker button").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    state.currentArrangement = [];
    state.candidates = [];
    state.selectedCandidate = null;
    renderStats();
    renderCandidates();
    renderClassroom([]);
    renderInsight(null);
  });
});

$("#className").addEventListener("input", renderClassTitle);
$("#addStudentBtn").addEventListener("click", addStudent);
$("#addConstraintBtn").addEventListener("click", addConstraint);
$("#generateBtn").addEventListener("click", generateCandidates);

$("#loadDemoBtn").addEventListener("click", () => {
  state.students = demoNames.map((name, i) => ({
    id: crypto.randomUUID(),
    name,
    visibility: ["medium","high","medium","low","medium","high"][i % 6],
    behavior: ["low","medium","high","medium","low","medium"][i % 6]
  }));
  state.constraints = [
    [state.students[1].id, state.students[8].id, "hard"],
    [state.students[4].id, state.students[10].id, "soft"],
    [state.students[7].id, state.students[16].id, "hard"]
  ];
  state.lockedStudents = new Set();
  state.candidates = [];
  state.currentArrangement = [];
  renderAll();
  generateCandidates();
});

renderAll();
generateCandidates();
