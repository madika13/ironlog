// Действия: тренировка, справочник, питание. Перенесено из AppViewModel Android-версии.
import { state, update, newId, dayKey, exercise, dish, planOf, lastSet } from "./store.js";

const now = () => Date.now();
const A = () => state.active;
export const setsDone = (a, id) => a.logs.filter((l) => l.exerciseId === id).reduce((s, l) => s + l.sets.length, 0);
export const currentLog = (a) => (a && a.currentLog >= 0 ? a.logs[a.currentLog] : null);
export const warmupElapsedMs = (a, t = now()) => a.warmupAccumMs + (a.warmupStartedAt ? t - a.warmupStartedAt : 0);

// ---------- справочник ----------
export function saveProgram(p) {
  update((s) => {
    const i = s.programs.findIndex((x) => x.id === p.id);
    const old = i >= 0 ? s.programs[i] : null;
    if (i >= 0) s.programs[i] = p; else s.programs.push(p);
    // если по этой программе идёт тренировка — правки сразу применяются к ней
    const a = s.active;
    if (a && (a.programName === old?.name || a.programName === p.name)) {
      a.plan = structuredClone(p.exercises); a.programName = p.name; a.restSetSec = p.restSetSec; a.restExerciseSec = p.restExerciseSec;
    }
  });
}
export const deleteProgram = (id) => update((s) => { s.programs = s.programs.filter((p) => p.id !== id); });
export function saveExercise(e) {
  update((s) => { const i = s.exercises.findIndex((x) => x.id === e.id); if (i >= 0) s.exercises[i] = e; else s.exercises.push(e); });
}
export const deleteExercise = (id) => update((s) => {
  s.exercises = s.exercises.filter((e) => e.id !== id);
  s.programs.forEach((p) => { p.exercises = p.exercises.filter((x) => x.exerciseId !== id); });
});
export const toggleKeepScreen = () => update((s) => { s.keepScreenOn = !s.keepScreenOn; });

// ---------- тренировка ----------
export function startWorkout(p) {
  update((s) => {
    s.active = {
      programName: p.name, type: p.type, restSetSec: p.restSetSec, restExerciseSec: p.restExerciseSec,
      startedAt: now(), phase: p.warmup === "NONE" ? "PICK" : "WARMUP",
      plan: structuredClone(p.exercises),
      warmupKind: p.warmup === "NONE" ? "RUN" : p.warmup, warmupPlanMin: p.warmupMin, warmupPlanKm: p.warmupKm,
      warmupStartedAt: null, warmupAccumMs: 0, warmup: null,
      logs: [], currentLog: -1, targetSets: 3, weight: 20, reps: 10,
      restStartedAt: 0, restEndsAt: 0, nextExerciseId: null,
    };
  });
}
const act = (fn) => update((s) => { if (s.active) fn(s.active); });

export const setWarmupKind = (k) => act((a) => { a.warmupKind = k; });
export const startWarmupClock = () => act((a) => { if (!a.warmupStartedAt) a.warmupStartedAt = now(); });
export const pauseWarmupClock = () => act((a) => { if (a.warmupStartedAt) { a.warmupAccumMs = warmupElapsedMs(a); a.warmupStartedAt = null; } });
export const finishWarmup = (minutes, km) => act((a) => { a.warmup = { kind: a.warmupKind, minutes, km }; a.phase = "PICK"; a.warmupStartedAt = null; });
export const skipWarmup = () => act((a) => { a.phase = "PICK"; a.warmupStartedAt = null; a.warmupAccumMs = 0; });

function beginExercise(a, id) {
  const plan = a.plan.find((p) => p.exerciseId === id);
  const last = lastSet(id);
  const sets = plan ? plan.sets : 3;
  const reps = last ? last.reps : plan ? plan.reps : 10;
  const weight = last ? last.weight : plan ? plan.weight : 20;
  const left = Math.max(1, sets - setsDone(a, id));
  const cur = currentLog(a);
  const reuse = cur && cur.exerciseId === id;
  if (!reuse) { a.logs.push({ exerciseId: id, name: exercise(id)?.name || "Упражнение", sets: [] }); a.currentLog = a.logs.length - 1; }
  a.phase = "SET";
  a.targetSets = reuse ? cur.sets.length + left : left;
  a.reps = reps; a.weight = weight; a.nextExerciseId = null;
}

export function pickExercise(id) {
  act((a) => { if (a.phase === "REST_EXERCISE") a.nextExerciseId = id; else beginExercise(a, id); });
}
export const goNext = () => act((a) => { if (a.nextExerciseId) beginExercise(a, a.nextExerciseId); });
export const setWeight = (w) => act((a) => { a.weight = Math.min(999, Math.max(0, Math.round(w * 100) / 100)); });
export const setReps = (r) => act((a) => { a.reps = Math.min(999, Math.max(0, Math.round(r))); });
export const setTargetSets = (n) => act((a) => { a.targetSets = Math.min(30, Math.max((currentLog(a)?.sets.length || 0) + 1, n)); });

export function completeSet() {
  act((a) => {
    const cur = currentLog(a); if (!cur) return;
    const t = now();
    cur.sets.push({ weight: a.weight, reps: a.reps, doneAt: t });
    const between = cur.sets.length < a.targetSets;
    const own = a.plan.find((p) => p.exerciseId === cur.exerciseId)?.restSec;
    const sec = between ? own ?? a.restSetSec : a.restExerciseSec;
    a.phase = between ? "REST_SET" : "REST_EXERCISE";
    a.restStartedAt = t; a.restEndsAt = t + sec * 1000; a.nextExerciseId = null;
  });
}
export const addRest = (sec) => act((a) => { a.restEndsAt = Math.max(now() + 1000, a.restEndsAt + sec * 1000); });
export const endRest = () => act((a) => { if (a.phase === "REST_SET") a.phase = "SET"; });
export const extraSet = () => act((a) => { if (!currentLog(a)) return; a.phase = "SET"; a.targetSets = currentLog(a).sets.length + 1; });

/** Убрать упражнение из идущей тренировки (вместе с его подходами). */
export function removeFromWorkout(id) {
  act((a) => {
    const cur = currentLog(a);
    a.plan = a.plan.filter((p) => p.exerciseId !== id);
    a.logs = a.logs.filter((l) => l.exerciseId !== id);
    a.currentLog = !cur || cur.exerciseId === id ? -1 : a.logs.indexOf(cur);
    if (a.nextExerciseId === id) a.nextExerciseId = null;
  });
}

export const setActiveStart = (ts) => act((a) => { a.startedAt = ts; });

// ---------- правка истории ----------
export const editWorkoutTime = (workoutId, startedAt, durationMin) => update((s) => {
  const w = s.history.find((x) => x.id === workoutId);
  if (w) { w.startedAt = startedAt; w.finishedAt = startedAt + durationMin * 60000; }
});
/** sets — [{ weight, reps }]. */
export function addToHistory(workoutId, exerciseId, sets) {
  update((s) => {
    const w = s.history.find((x) => x.id === workoutId), ex = exercise(exerciseId);
    if (w && ex) w.exercises.push({ exerciseId, name: ex.name, sets: sets.map((x) => ({ weight: x.weight, reps: x.reps, doneAt: w.finishedAt })) });
  });
}
export const removeFromHistory = (workoutId, index) => update((s) => {
  const w = s.history.find((x) => x.id === workoutId);
  if (w) w.exercises.splice(index, 1);
});

export function finishExercise() {
  act((a) => {
    const cur = currentLog(a);
    if (!cur || !cur.sets.length) {
      if (cur) a.logs.splice(a.currentLog, 1);
      a.currentLog = -1; a.phase = "PICK"; return;
    }
    const t = now();
    a.phase = "REST_EXERCISE"; a.targetSets = cur.sets.length;
    a.restStartedAt = t; a.restEndsAt = t + a.restExerciseSec * 1000; a.nextExerciseId = null;
  });
}

export let lastSummary = null;
export function finishWorkout() {
  const a = A(); if (!a) return;
  const log = {
    id: newId(), programName: a.programName, type: a.type, startedAt: a.startedAt, finishedAt: now(),
    warmup: a.warmup, exercises: a.logs.filter((l) => l.sets.length),
  };
  const keep = log.exercises.length || log.warmup;
  lastSummary = keep ? log : null;
  update((s) => { s.active = null; if (keep) s.history.push(log); });
}
export const dismissSummary = () => { lastSummary = null; update(() => {}); };
export const discardWorkout = () => update((s) => { s.active = null; });
export const deleteWorkout = (id) => update((s) => { s.history = s.history.filter((w) => w.id !== id); });

// ---------- питание ----------
const SLOTS = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"];
/** Приёмы пищи, которые человек использует (в целях можно выбрать 3 или 4). */
export const activeSlots = () => SLOTS.filter((k) => (state.goals.slots || SLOTS).includes(k));
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function toEntry(d, day, slot, portion, planned) {
  return {
    id: newId(), day, slot, name: d.name, dishId: d.id, portion, planned,
    kcal: Math.round(d.kcal * portion), protein: Math.round(d.protein * portion),
    fat: Math.round(d.fat * portion), carbs: Math.round(d.carbs * portion),
  };
}

export function generatePlan(day) {
  update((s) => {
    const slots = activeSlots().filter((k) => s.dishes.some((d) => d.slot === k));
    const by = Object.fromEntries(slots.map((k) => [k, s.dishes.filter((d) => d.slot === k)]));
    if (!slots.length) return;
    const g = s.goals;
    let best = null, bestScore = Infinity;
    for (let i = 0; i < 400; i++) {
      const pick = Object.fromEntries(slots.map((k) => [k, pickRandom(by[k])]));
      const v = Object.values(pick);
      const kcal = v.reduce((x, d) => x + d.kcal, 0), prot = v.reduce((x, d) => x + d.protein, 0);
      const score = Math.abs(kcal - g.kcal) / 10 + Math.max(0, g.protein - prot) * 1.5 + Math.random() * 4;
      if (score < bestScore) { bestScore = score; best = pick; }
    }
    s.plans = s.plans.filter((p) => p.day !== day);
    s.plans.push({ day, dishes: Object.fromEntries(slots.map((k) => [k, best[k].id])) });
  });
}
export function ensurePlan(day) { if (!planOf(day) && state.dishes.length) generatePlan(day); }

function setPlan(s, day, slot, dishId) {
  let p = s.plans.find((x) => x.day === day);
  if (!p) { p = { day, dishes: {} }; s.plans.push(p); }
  p.dishes[slot] = dishId;
  const d = s.dishes.find((x) => x.id === dishId);
  s.food = s.food.map((f) => (f.day === day && f.slot === slot && f.planned && d ? { ...toEntry(d, day, slot, 1, true), id: f.id } : f));
}
export const setPlanDish = (day, slot, id) => update((s) => setPlan(s, day, slot, id));
export function swapDish(day, slot) {
  update((s) => {
    const cur = s.plans.find((p) => p.day === day); if (!cur) return;
    const opts = s.dishes.filter((d) => d.slot === slot && d.id !== cur.dishes[slot]);
    if (opts.length) setPlan(s, day, slot, pickRandom(opts).id);
  });
}
export function togglePlannedEaten(day, slot) {
  update((s) => {
    const ex = s.food.find((f) => f.day === day && f.slot === slot && f.planned);
    if (ex) { s.food = s.food.filter((f) => f !== ex); return; }
    const d = dish(planOf(day)?.dishes?.[slot]);
    if (d) s.food.push(toEntry(d, day, slot, 1, true));
  });
}
export const addFood = (day, d, portion) => update((s) => { s.food.push(toEntry(d, day, d.slot, portion, false)); });
export const addCustomFood = (e) => update((s) => { s.food.push(e); });
export const removeFood = (id) => update((s) => { s.food = s.food.filter((f) => f.id !== id); });
export const saveDish = (d) => update((s) => { const i = s.dishes.findIndex((x) => x.id === d.id); if (i >= 0) s.dishes[i] = d; else s.dishes.push(d); });
export const deleteDish = (id) => update((s) => {
  s.dishes = s.dishes.filter((d) => d.id !== id);
  s.plans.forEach((p) => { for (const k in p.dishes) if (p.dishes[k] === id) delete p.dishes[k]; });
});
export const setGoals = (g) => update((s) => { s.goals = g; });
export function setMealCount(n) {
  update((s) => {
    s.goals = { ...s.goals, slots: n === 3 ? ["BREAKFAST", "LUNCH", "DINNER"] : SLOTS };
    const today = dayKey();
    s.plans = s.plans.filter((p) => p.day < today);
  });
}
export const logWeight = (day, kg) => update((s) => {
  s.weights = s.weights.filter((w) => w.day !== day).concat({ day, kg }).sort((a, b) => a.day.localeCompare(b.day));
});
export const deleteWeight = (day) => update((s) => { s.weights = s.weights.filter((w) => w.day !== day); });

export { SLOTS, dayKey };
