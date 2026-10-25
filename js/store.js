// Хранилище: одно JSON-состояние в localStorage, формат совместим с Android-версией IronLog.
import { useEffect, useRef, useState } from "./vendor/hooks.module.js";
import { EXERCISES, DISHES } from "./seed-data.js";
import { WEB_SEEDS } from "./programs.js";

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
