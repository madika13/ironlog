import { useState } from "../vendor/hooks.module.js";
import { state, lastSet, volume, maxWeight, workoutVolume, workoutMinutes } from "../store.js";
import * as L from "../logic.js";
import {
  html, C, Icon, GhostButton, Card, Label, Title, Badge, Segmented, Chip, StatTile, BarChart, LineChart, ConfirmDialog, Dialog, Act, ExercisePicker,
  fmtWeight, fmtNum, fmtBig, fmtClock, TYPE, WARM, typeColor, warmColor,
} from "../ui.js";

const short = (ts) => { const d = new Date(ts); return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`; };

export function StatsTab() {
  const [period, setPeriod] = useState(0);
  const from = period === 0 ? Date.now() - 30 * 864e5 : period === 1 ? Date.now() - 90 * 864e5 : 0;
  const list = state.history.filter((w) => w.startedAt >= from).sort((a, b) => a.startedAt - b.startedAt);
  return html`<div class="screen list fadein" style=${{ gap: "14px" }}>
    <${Title}>Аналитика</${Title}>
    <${Segmented} options=${["30 дней", "90 дней", "Всё время"]} selected=${period} onSelect=${setPeriod} />
    ${!list.length ? html`<${Card}><div class="col center" style=${{ padding: "24px 0" }}>
        <span style=${{ filter: `drop-shadow(0 0 12px ${C.lime})` }}><${Icon} n="chart" size=${48} color=${C.lime} /></span>
        <div class="display mt12" style=${{ fontSize: "18px" }}>Пока пусто</div>
        <div class="muted mt8">Заверши первую тренировку — здесь появятся графики веса, времени и дистанции.</div></div></${Card}>`
      : html`
        <div class="row gap12"><${StatTile} label="тренировок" value=${list.length} unit="" /><${StatTile} label="в зале" value=${fmtNum(list.reduce((s, w) => s + workoutMinutes(w), 0) / 60, 1)} unit="ч" color=${C.cyan} /></div>
        <div class="row gap12"><${StatTile} label="поднято" value=${fmtNum(list.reduce((s, w) => s + workoutVolume(w), 0) / 1000, 1)} unit="т" color=${C.pink} />
          <${StatTile} label="разминка" value=${fmtNum(list.reduce((s, w) => s + (w.warmup?.km || 0), 0), 1)} unit="км" /></div>
        <${ChartCard} title="Время тренировки" sub=${"в среднем " + Math.round(list.reduce((s, w) => s + workoutMinutes(w), 0) / list.length) + " мин"}>
          <${BarChart} values=${list.slice(-14).map(workoutMinutes)} labels=${list.slice(-14).map((w) => short(w.startedAt))} colors=${list.slice(-14).map((w) => typeColor(w.type))} fmt=${(v) => Math.round(v) + " мин"} />
        </${ChartCard}>
        <${ChartCard} title="Тоннаж за тренировку" sub=${"рекорд " + fmtBig(Math.max(...list.map(workoutVolume))) + " кг"}>
          <${LineChart} values=${list.slice(-14).map(workoutVolume)} labels=${list.slice(-14).map((w) => short(w.startedAt))} color=${C.pink} fmt=${fmtBig} />
        </${ChartCard}>
        <${WarmupCard} list=${list} />
        <${Progress} list=${list} />
        <${Label} style=${{ marginTop: "6px" }}>История</${Label}>
        ${list.slice().reverse().map((w) => html`<${HistoryRow} w=${w} key=${w.id} />`)}`}
  </div>`;
}

const ChartCard = ({ title, sub, children }) => html`<${Card}>
  <div class="display" style=${{ fontSize: "16px" }}>${title}</div><div class="small muted" style=${{ margin: "2px 0 14px" }}>${sub}</div>${children}</${Card}>`;

const Mini = ({ label, value, unit }) => html`<div class="grow"><div class="row" style=${{ alignItems: "baseline", gap: "3px" }}>
  <span class="display" style=${{ fontSize: "18px" }}>${value}</span><span class="xs muted">${unit}</span></div><div class="xs muted">${label}</div></div>`;

function WarmupCard({ list }) {
  const [k, setK] = useState(0);
  const kind = k ? "BIKE" : "RUN", items = list.filter((w) => w.warmup?.kind === kind);
  const km = items.reduce((s, w) => s + w.warmup.km, 0), min = items.reduce((s, w) => s + w.warmup.minutes, 0);
  return html`<${Card}>
    <div class="display" style=${{ fontSize: "16px", marginBottom: "10px" }}>Разминка</div>
    <${Segmented} options=${["Бег", "Велосипед"]} selected=${k} onSelect=${setK} />
    ${!items.length ? html`<div class="muted" style=${{ padding: "20px 0" }}>Нет записей</div>` : html`
      <div class="row gap10 mt12"><${Mini} label="всего" value=${fmtNum(km, 1)} unit="км" /><${Mini} label="время" value=${Math.round(min)} unit="мин" />
        ${kind === "RUN" ? html`<${Mini} label="темп" value=${fmtClock(km ? (min / km) * 60 : 0)} unit="/км" />` : html`<${Mini} label="скорость" value=${fmtNum(min ? km / (min / 60) : 0, 1)} unit="км/ч" />`}</div>
      <div class="mt12"><${BarChart} values=${items.slice(-14).map((w) => w.warmup.km)} labels=${items.slice(-14).map((w) => short(w.startedAt))} color=${warmColor(kind)} fmt=${(v) => fmtNum(v, 1) + " км"} height=${150} /></div>`}
  </${Card}>`;
}

function Progress({ list }) {
  const counts = {};
  list.forEach((w) => w.exercises.forEach((e) => { counts[e.exerciseId] = counts[e.exerciseId] || { n: 0, name: e.name }; counts[e.exerciseId].n++; counts[e.exerciseId].name = e.name; }));
  const names = Object.entries(counts).sort((a, b) => b[1].n - a[1].n);
  const [sel, setSel] = useState(null), [metric, setMetric] = useState(0);
  if (!names.length) return null;
  const id = names.some(([x]) => x === sel) ? sel : names[0][0];
  const sets = list.flatMap((w) => w.exercises.filter((e) => e.exerciseId === id).flatMap((e) => e.sets));
  const noW = sets.every((s) => s.weight === 0), timed = state.exercises.find((e) => e.id === id)?.timed;
  const unit = !noW ? "кг" : timed ? "с" : "повт.";
  const sessions = list.map((w) => {
    const logs = w.exercises.filter((e) => e.exerciseId === id && e.sets.length);
    if (!logs.length) return null;
    const best = noW ? Math.max(...logs.flatMap((l) => l.sets.map((s) => s.reps))) : Math.max(...logs.map(maxWeight));
    const total = noW ? logs.reduce((s, l) => s + l.sets.reduce((x, y) => x + y.reps, 0), 0) : logs.reduce((s, l) => s + volume(l), 0);
    return [w.startedAt, best, total];
  }).filter(Boolean);
  const first = sessions[0][1], best = Math.max(...sessions.map((s) => s[1])), now = sessions[sessions.length - 1][1];
  const oneRm = Math.max(0, ...sets.map((s) => s.weight * (1 + s.reps / 30)));
  const last = sessions.slice(-16);
  return html`<${Card}>
    <div class="display" style=${{ fontSize: "16px", marginBottom: "12px" }}>Прогресс в весах</div>
    <div class="chips">${names.map(([x, v]) => html`<${Chip} text=${v.name} on=${x === id} onClick=${() => setSel(x)} />`)}</div>
    <div class="row gap10 mt12"><${Mini} label="рекорд" value=${fmtWeight(best)} unit=${unit} /><${Mini} label="прирост" value=${(now - first >= 0 ? "+" : "") + fmtWeight(now - first)} unit=${unit} />
      ${!noW && html`<${Mini} label="1ПМ ≈" value=${fmtNum(oneRm, 1)} unit="кг" />`}</div>
    <div class="mt12"><${Segmented} options=${noW ? ["Лучший подход", "Сумма"] : ["Макс. вес", "Объём"]} selected=${metric} onSelect=${setMetric} /></div>
    <div class="mt12"><${LineChart} values=${last.map((s) => (metric ? s[2] : s[1]))} labels=${last.map((s) => short(s[0]))} color=${metric ? C.cyan : C.lime}
      fmt=${(v) => (metric ? fmtBig(v) : fmtWeight(v) + " " + unit)} /></div>
  </${Card}>`;
}

function HistoryRow({ w }) {
  const [open, setOpen] = useState(false), [confirm, setConfirm] = useState(false);
  const [picking, setPicking] = useState(false), [adding, setAdding] = useState(null), [removeIdx, setRemoveIdx] = useState(null);
  const d = new Date(w.startedAt);
  return html`<${Card} p14 onClick=${() => setOpen(!open)}>
    <div class="row gap8">
      <div class="grow"><div class="row gap8"><${Badge} text=${TYPE[w.type]} color=${typeColor(w.type)} />
        <span class="small muted">${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="bold mt8">${w.programName}</div></div>
      <div class="col" style=${{ alignItems: "flex-end" }}><span class="display" style=${{ fontSize: "14px" }}>${Math.round(workoutMinutes(w))} мин</span><span class="small muted">${fmtBig(workoutVolume(w))} кг</span></div>
    </div>
    ${open && html`<div class="mt12">
      ${w.warmup && html`<div class="small semibold" style=${{ color: warmColor(w.warmup.kind) }}>${WARM[w.warmup.kind]}: ${fmtNum(w.warmup.minutes, 1)} мин · ${fmtNum(w.warmup.km, 2)} км</div>`}
      ${w.exercises.map((e, i) => html`<div class="row mt8"><div class="grow"><div class="semibold">${e.name}</div>
        <div class="small muted">${e.sets.map((s) => `${fmtWeight(s.weight)}×${s.reps}`).join("   ")}</div></div>
        <button class="icon-btn" style=${{ color: C.faint }} aria-label="Убрать" onClick=${(ev) => { ev.stopPropagation(); setRemoveIdx(i); }}><${Icon} n="close" /></button></div>`)}
      <div class="row gap8 mt12" onClick=${(e) => e.stopPropagation()}>
        <${GhostButton} text="Упражнение" icon="add" color=${C.lime} height=${40} grow onClick=${() => setPicking(true)} />
        <${GhostButton} text="Удалить" icon="trash" color=${C.pink} height=${40} onClick=${() => setConfirm(true)} />
      </div>
    </div>`}
    <span onClick=${(e) => e.stopPropagation()}>
      ${removeIdx != null && html`<${ConfirmDialog} title=${`Убрать «${w.exercises[removeIdx]?.name || ""}»?`} text="Упражнение и его подходы пропадут из этой тренировки."
        confirm="Убрать" danger onClose=${() => setRemoveIdx(null)} onOk=${() => L.removeFromHistory(w.id, removeIdx)} />`}
      ${picking && html`<${ExercisePicker} exercises=${state.exercises} onClose=${() => setPicking(false)} onPick=${(id) => { setPicking(false); setAdding(id); }} />`}
      ${adding && html`<${AddSetsDialog} exerciseId=${adding} onClose=${() => setAdding(null)} onSave=${(sets) => L.addToHistory(w.id, adding, sets)} />`}
    </span>
    ${confirm && html`<span onClick=${(e) => e.stopPropagation()}><${ConfirmDialog} title="Удалить тренировку?" text="Она пропадёт из истории и аналитики." confirm="Удалить" danger onClose=${() => setConfirm(false)} onOk=${() => L.deleteWorkout(w.id)} /></span>`}
  </${Card}>`;
}

/** Добавить упражнение в прошедшую тренировку: каждый подход — свой вес и повторы. */
function AddSetsDialog({ exerciseId, onClose, onSave }) {
  const ex = state.exercises.find((e) => e.id === exerciseId), last = lastSet(exerciseId);
  const w0 = String(last?.weight ?? 0), r0 = String(last?.reps ?? 10);
  const [rows, setRows] = useState([[w0, r0], [w0, r0], [w0, r0]]);
  const parsed = rows.map(([w, r]) => [parseFloat(String(w).replace(",", ".")), parseInt(r, 10)]);
  const ok = rows.length > 0 && parsed.every(([w, r]) => !isNaN(w) && r > 0);
  const set = (i, j, v) => setRows((rs) => rs.map((row, k) => (k === i ? (j ? [row[0], v] : [v, row[1]]) : row)));
  return html`<${Dialog} title=${ex?.name || ""} onClose=${onClose} actions=${html`
    <${Act} text="Отмена" color=${C.muted} onClick=${onClose} />
    <${Act} text="Добавить" disabled=${!ok} onClick=${() => { onSave(parsed.map(([weight, reps]) => ({ weight, reps }))); onClose(); }} />`}>
    ${rows.map(([w, r], i) => html`<div class="row gap8" style=${{ marginBottom: "8px" }}>
      <span class="display lime" style=${{ width: "18px" }}>${i + 1}</span>
      <div class="grow"><div class="field-label">Вес, кг</div><input class="input" inputmode="decimal" value=${w} onInput=${(e) => set(i, 0, e.target.value)} /></div>
      <div class="grow"><div class="field-label">${ex?.timed ? "Секунды" : "Повторы"}</div><input class="input" inputmode="numeric" value=${r} onInput=${(e) => set(i, 1, e.target.value)} /></div>
      <button class="icon-btn" style=${{ color: C.faint, marginTop: "18px" }} onClick=${() => setRows(rows.filter((_, k) => k !== i))}><${Icon} n="close" /></button>
    </div>`)}
    <${GhostButton} text="Подход" icon="add" height=${40} style=${{ width: "100%" }} onClick=${() => setRows([...rows, rows[rows.length - 1] || [w0, r0]])} />
  </${Dialog}>`;
}
