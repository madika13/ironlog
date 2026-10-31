// Хранилище: одно JSON-состояние в localStorage, формат совместим с Android-версией IronLog.
import { useEffect, useRef, useState } from "./vendor/hooks.module.js";
import { EXERCISES, DISHES } from "./seed-data.js";
import { WEB_SEEDS, isPerSideName } from "./programs.js";

const KEY = "ironlog";
const subs = new Set();

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function seed() {
  return {
    exercises: structuredClone(EXERCISES),
    programs: [],
    history: [],
    active: null,
    keepScreenOn: true,
    seedVersion: 0,
    dishes: structuredClone(DISHES),
    goals: { kcal: 1800, protein: 120, fat: 60, carbs: 190, targetWeight: 60 },
    food: [],
    plans: [],
    weights: [],
    lastAutoBackup: "",
  };
}

/** Дополняет отсутствующие поля и применяет встроенные наборы программ (WEB_SEEDS). */
export function migrate(d) {
  const base = seed();
  for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
  if (!d.dishes.length) d.dishes = base.dishes;
  for (const s of WEB_SEEDS) {
    if ((d.webSeed || 0) >= s.version) continue;
    s.apply(d);
    d.webSeed = s.version;
  }
  return d;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    try { localStorage.setItem(KEY + ".broken", localStorage.getItem(KEY)); } catch (_) {}
  }
  return migrate(seed());
}

export let state = load();
save();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
}

/** Изменяет состояние (мутацией) и перерисовывает интерфейс. */
export function update(fn) {
  const r = fn(state);
  if (r && r !== state) state = r;
  save();
  subs.forEach((f) => f());
}

export function replaceState(next) {
  state = migrate(next);
  state.active = null;
  save();
  subs.forEach((f) => f());
}

/**
 * Загружает пакет: программы (упражнения сопоставляются по названию), блюда, цели питания, стартовый вес.
 * replaceDishes — заменить встроенные блюда пакетными (свои блюда остаются). Возвращает, что добавлено.
 */
export function mergePack(pack) {
  const res = { programs: 0, dishes: 0, goals: false };
  update((s) => {
    const idMap = {};
    for (const e of pack.exercises || []) {
      let mine = s.exercises.find((x) => x.name.toLowerCase() === e.name.toLowerCase());
      if (!mine) { mine = { ...e, perSide: e.perSide || isPerSideName(e.name) }; s.exercises.push(mine); }
      else { if (e.note) mine.note = e.note; if (e.timed) mine.timed = true; if (e.perSide) mine.perSide = true; }
      idMap[e.id] = mine.id;
    }
    for (const p of pack.programs || []) {
      const prog = { ...p, exercises: p.exercises.map((x) => ({ ...x, exerciseId: idMap[x.exerciseId] || x.exerciseId })) };
      const i = s.programs.findIndex((x) => x.name === p.name);
      if (i >= 0) { prog.id = s.programs[i].id; s.programs[i] = prog; } else { s.programs.push(prog); res.programs++; }
    }
    if (pack.dishes?.length) {
      if (pack.replaceDishes) s.dishes = s.dishes.filter((d) => d.custom);
      for (const d of pack.dishes) if (!s.dishes.some((x) => x.name === d.name)) { s.dishes.push({ ...d }); res.dishes++; }
      // планы на сегодня и вперёд пересоберутся из новых блюд
      const today = dayKey();
      s.plans = s.plans.filter((p) => p.day < today);
    }
    if (pack.goals) { s.goals = { ...s.goals, ...pack.goals }; res.goals = true; }
    // дописать упражнение в прошедшую тренировку (день yyyy-MM-dd + программа), один раз
    for (const h of pack.historyAdd || []) {
      const ex = s.exercises.find((x) => x.name.toLowerCase() === h.exercise.toLowerCase());
      if (!ex) continue;
      for (const w of s.history) {
        if (w.programName !== h.programName || dayKey(w.startedAt) !== h.day || w.exercises.some((e) => e.exerciseId === ex.id)) continue;
        w.exercises.push({ exerciseId: ex.id, name: ex.name, sets: h.sets.map((x) => ({ weight: x.weight, reps: x.reps, doneAt: w.finishedAt })) });
        res.history = (res.history || 0) + 1;
      }
    }
    if (pack.weight && !s.weights.length) s.weights.push({ day: dayKey(), kg: pack.weight });
  });
  return res;
}

export function useStore() {
  const [, force] = useState(0);
  // подписываемся сразу при первом рендере: эффекты дочерних экранов срабатывают раньше родительских
  const ref = useRef(null);
  if (!ref.current) { ref.current = () => force((x) => x + 1); subs.add(ref.current); }
  useEffect(() => () => subs.delete(ref.current), []);
  return state;
}

// ---------- выборки ----------
export const exercise = (id) => state.exercises.find((e) => e.id === id);
export const dish = (id) => state.dishes.find((d) => d.id === id);
export const planOf = (day) => state.plans.find((p) => p.day === day);
export const foodOn = (day) => state.food.filter((f) => f.day === day);

export function lastSet(exerciseId) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const logs = state.history[i].exercises.filter((e) => e.exerciseId === exerciseId && e.sets.length);
    if (logs.length) { const l = logs[logs.length - 1]; return l.sets[l.sets.length - 1]; }
  }
  return null;
}

export const volume = (log) => log.sets.reduce((s, x) => s + x.weight * x.reps, 0);
export const maxWeight = (log) => log.sets.reduce((m, x) => Math.max(m, x.weight), 0);
export const workoutVolume = (w) => w.exercises.reduce((s, e) => s + volume(e), 0);
export const workoutMinutes = (w) => (w.finishedAt - w.startedAt) / 60000;

export function exportJson() { return JSON.stringify(state); }

// постоянное хранилище, чтобы Safari не чистил данные
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
