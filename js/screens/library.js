import { useState } from "../vendor/hooks.module.js";
import { state, exercise, newId, maxWeight } from "../store.js";
import * as L from "../logic.js";
import {
  html, C, Icon, NeonButton, GhostButton, RoundIcon, Card, Label, Title, Badge, Segmented, Stepper, Chip,
  Dialog, Act, NumberDialog, ConfirmDialog, ExercisePicker, fmtWeight, fmtNum, fmtClock, fmtRest, TYPE, typeColor, MUSCLES,
} from "../ui.js";

export function LibraryTab() {
  const [section, setSection] = useState(0);
  const [editing, setEditing] = useState(null);
  if (editing) return html`<${ProgramEditor} initial=${editing} onClose=${() => setEditing(null)} />`;
  return html`<div class="screen list fadein">
    <${Title}>Справочник</${Title}>
    <${Segmented} options=${["Программы", "Упражнения"]} selected=${section} onSelect=${setSection} />
    ${section === 0 ? html`<${Programs} onOpen=${(p) => setEditing(structuredClone(p))}
        onNew=${() => setEditing({ id: newId(), name: "", type: "SPLIT", restSetSec: 90, restExerciseSec: 120, warmup: "BIKE", warmupMin: 10, warmupKm: 3, exercises: [] })} />`
      : html`<${Exercises} />`}
  </div>`;
}

const Programs = ({ onOpen, onNew }) => html`
  ${state.programs.map((p) => html`<${Card} onClick=${() => onOpen(p)}>
    <div class="row"><${Badge} text=${TYPE[p.type]} color=${typeColor(p.type)} /><span class="grow"></span><span class="small muted">${p.exercises.length} упр.</span></div>
    <div class="display mt12" style=${{ fontSize: "18px" }}>${p.name || "Без названия"}</div>
    <div class="small muted mt4">Отдых: ${fmtRest(p.restSetSec)} между подходами · ${fmtRest(p.restExerciseSec)} между упр.</div>
  </${Card}>`)}
  <${NeonButton} text="Новая программа" icon="add" height=${58} onClick=${onNew} />`;

function ProgramEditor({ initial, onClose }) {
  const [p, setP] = useState(initial);
  const [picker, setPicker] = useState(false), [del, setDel] = useState(false), [edit, setEdit] = useState(null);
  const exists = state.programs.some((x) => x.id === p.id);
  const save = () => { if (p.name.trim()) L.saveProgram(p); onClose(); };
  const set = (patch) => setP({ ...p, ...patch });
  const upd = (i, patch) => setP({ ...p, exercises: p.exercises.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const move = (i, d) => { const l = [...p.exercises]; const [x] = l.splice(i, 1); l.splice(i + d, 0, x); set({ exercises: l }); };
  const ask = (title, initialV, apply) => setEdit({ title, initialV, apply });
  const W = ["RUN", "BIKE", "NONE"];
  return html`<div class="col" style=${{ flex: 1, minHeight: 0 }}>
    <div class="topbar">
      <${RoundIcon} n="back" color=${C.text} onClick=${save} />
      <span class="grow"></span>
      ${exists && html`<${RoundIcon} n="trash" color=${C.pink} onClick=${() => setDel(true)} />`}
      <div style=${{ width: "150px" }}><${NeonButton} text="Сохранить" height=${42} size=${12} disabled=${!p.name.trim()} onClick=${save} /></div>
    </div>
    <div class="screen list" style=${{ paddingTop: "4px" }}>
      <div><div class="field-label">Название программы</div><input class="input" style=${{ fontFamily: "var(--display)" }} value=${p.name} onInput=${(e) => set({ name: e.target.value })} /></div>
      <div><${Label} style=${{ marginBottom: "8px" }}>Тип тренировки</${Label}>
        <${Segmented} options=${["Фулбади", "Сплит"]} selected=${p.type === "SPLIT" ? 1 : 0} onSelect=${(i) => set({ type: i ? "SPLIT" : "FULL_BODY" })} /></div>
      <div><${Label} style=${{ marginBottom: "8px" }}>Отдых</${Label}><div class="row gap12">
        <${Stepper} big=${false} label="между подходами" value=${fmtClock(p.restSetSec)} onMinus=${() => set({ restSetSec: Math.max(15, p.restSetSec - 15) })} onPlus=${() => set({ restSetSec: p.restSetSec + 15 })}
          onEdit=${() => ask("Отдых между подходами, сек", p.restSetSec, (v) => set({ restSetSec: Math.max(5, Math.round(v)) }))} />
        <${Stepper} big=${false} label="между упр." value=${fmtClock(p.restExerciseSec)} onMinus=${() => set({ restExerciseSec: Math.max(15, p.restExerciseSec - 15) })} onPlus=${() => set({ restExerciseSec: p.restExerciseSec + 15 })}
          onEdit=${() => ask("Отдых между упражнениями, сек", p.restExerciseSec, (v) => set({ restExerciseSec: Math.max(5, Math.round(v)) }))} />
      </div></div>
      <div><${Label} style=${{ marginBottom: "8px" }}>Разминка · цель</${Label}>
        <${Segmented} options=${["Бег", "Вело", "Нет"]} selected=${W.indexOf(p.warmup)} onSelect=${(i) => set({ warmup: W[i] })} />
        ${p.warmup !== "NONE" && html`<div class="row gap12 mt12">
          <${Stepper} big=${false} label="цель, время" value=${String(p.warmupMin)} unit="мин" onMinus=${() => set({ warmupMin: Math.max(1, p.warmupMin - 1) })} onPlus=${() => set({ warmupMin: p.warmupMin + 1 })}
            onEdit=${() => ask("Цель разминки, мин", p.warmupMin, (v) => set({ warmupMin: Math.max(1, Math.round(v)) }))} />
          <${Stepper} big=${false} label="цель, дистанция" value=${fmtNum(p.warmupKm)} unit="км" onMinus=${() => set({ warmupKm: Math.max(0, p.warmupKm - 0.5) })} onPlus=${() => set({ warmupKm: p.warmupKm + 0.5 })}
            onEdit=${() => ask("Цель дистанции, км", p.warmupKm, (v) => set({ warmupKm: Math.max(0, v) }))} />
        </div>`}</div>
      <${Label}>Упражнения · ${p.exercises.length}</${Label}>
      ${p.exercises.map((pe, i) => {
        const ex = exercise(pe.exerciseId);
        return html`<${Card} p14>
          <div class="row gap6">
            <span class="display lime" style=${{ width: "26px" }}>${i + 1}</span>
            <div class="grow"><div class="bold">${ex?.name || "?"}</div><div class="small muted">${ex?.muscle || ""}</div></div>
            <button class="icon-btn" style=${{ opacity: i > 0 ? 1 : 0.3 }} onClick=${() => i > 0 && move(i, -1)}><${Icon} n="up" /></button>
            <button class="icon-btn" style=${{ opacity: i < p.exercises.length - 1 ? 1 : 0.3 }} onClick=${() => i < p.exercises.length - 1 && move(i, 1)}><${Icon} n="down" /></button>
            <button class="icon-btn" style=${{ color: C.pink }} onClick=${() => set({ exercises: p.exercises.filter((_, j) => j !== i) })}><${Icon} n="close" /></button>
          </div>
          <div class="row gap8 mt12">
            <${Stepper} big=${false} label="подходы" value=${String(pe.sets)} onMinus=${() => upd(i, { sets: Math.max(1, pe.sets - 1) })} onPlus=${() => upd(i, { sets: pe.sets + 1 })} onEdit=${() => ask("Подходы", pe.sets, (v) => upd(i, { sets: Math.max(1, Math.round(v)) }))} />
            <${Stepper} big=${false} label=${ex?.timed ? "секунды" : "повторы"} value=${String(pe.reps)} onMinus=${() => upd(i, { reps: Math.max(1, pe.reps - 1) })} onPlus=${() => upd(i, { reps: pe.reps + 1 })} onEdit=${() => ask(ex?.timed ? "Секунды" : "Повторы", pe.reps, (v) => upd(i, { reps: Math.max(1, Math.round(v)) }))} />
            <${Stepper} big=${false} label="вес, кг" value=${fmtWeight(pe.weight)} onMinus=${() => upd(i, { weight: Math.max(0, pe.weight - 2.5) })} onPlus=${() => upd(i, { weight: pe.weight + 2.5 })} onEdit=${() => ask("Вес, кг", pe.weight, (v) => upd(i, { weight: Math.max(0, v) }))} />
          </div>
          <div class="small mt12" style=${{ color: pe.restSec ? C.cyan : C.muted }}
            onClick=${() => ask("Отдых для этого упражнения, сек (0 — как в программе)", pe.restSec ?? p.restSetSec, (v) => upd(i, { restSec: v > 0 ? Math.round(v) : null }))}>
            Отдых между подходами: ${pe.restSec ? fmtClock(pe.restSec) : "как в программе"}</div>
        </${Card}>`;
      })}
      <${GhostButton} text="Добавить упражнение" icon="add" color=${C.lime} onClick=${() => setPicker(true)} />
    </div>
    ${picker && html`<${ExercisePicker} exercises=${state.exercises} onClose=${() => setPicker(false)}
      onPick=${(id) => { setPicker(false); set({ exercises: [...p.exercises, { exerciseId: id, sets: 3, reps: 10, weight: 20, restSec: null }] }); }} />`}
    ${edit && html`<${NumberDialog} title=${edit.title} initial=${edit.initialV} onClose=${() => setEdit(null)} onOk=${edit.apply} />`}
    ${del && html`<${ConfirmDialog} title="Удалить программу?" text=${`«${p.name}» исчезнет из справочника. История останется.`} confirm="Удалить" danger
      onClose=${() => setDel(false)} onOk=${() => { L.deleteProgram(p.id); onClose(); }} />`}
  </div>`;
}

function Exercises() {
  const [editing, setEditing] = useState(null);
  const groups = [...MUSCLES, ...new Set(state.exercises.map((e) => e.muscle).filter((m) => !MUSCLES.includes(m)))];
  return html`
    <${NeonButton} text="Новое упражнение" icon="add" height=${58} onClick=${() => setEditing({ id: newId(), name: "", muscle: "Ноги", timed: false, isNew: true })} />
    ${groups.map((m) => {
      const list = state.exercises.filter((e) => e.muscle === m);
      if (!list.length) return null;
      return html`<div class="list" style=${{ gap: "8px" }}>
        <${Label} color=${C.lime} style=${{ marginTop: "8px" }}>${m}</${Label}>
        ${list.map((e) => {
          const pr = Math.max(0, ...state.history.flatMap((w) => w.exercises.filter((x) => x.exerciseId === e.id).map(maxWeight)));
          return html`<${Card} p14 onClick=${() => setEditing({ ...e })}><div class="row gap8"><span class="grow semibold">${e.name}</span>
            ${e.timed && html`<${Badge} text="⏱" color=${C.cyan} />`}${pr > 0 && html`<${Badge} text=${`PR ${fmtWeight(pr)} кг`} color=${C.lime} />`}</div></${Card}>`;
        })}
      </div>`;
    })}
    ${editing && html`<${ExerciseDialog} e=${editing} onClose=${() => setEditing(null)} />`}`;
}

function ExerciseDialog({ e, onClose }) {
  const [name, setName] = useState(e.name), [muscle, setMuscle] = useState(e.muscle), [timed, setTimed] = useState(!!e.timed), [perSide, setPerSide] = useState(!!e.perSide);
  const ok = name.trim().length > 0;
  return html`<${Dialog} title=${e.isNew ? "Новое упражнение" : "Упражнение"} onClose=${onClose} actions=${html`
    ${!e.isNew && html`<${Act} text="Удалить" color=${C.pink} onClick=${() => { L.deleteExercise(e.id); onClose(); }} />`}
    <${Act} text="Отмена" color=${C.muted} onClick=${onClose} />
    <${Act} text="Сохранить" disabled=${!ok} onClick=${() => { L.saveExercise({ ...e, isNew: undefined, id: e.id, name: name.trim(), muscle, timed, perSide }); onClose(); }} />`}>
    <div class="field-label">Название</div><input class="input" value=${name} onInput=${(ev) => setName(ev.target.value)} />
    <${Label} style=${{ margin: "14px 0 8px" }}>Группа мышц</${Label}>
    <div class="chips wrap">${MUSCLES.map((m) => html`<${Chip} text=${m} on=${m === muscle} onClick=${() => setMuscle(m)} />`)}</div>
    <div class="mt12"><${Chip} text="⏱ На время (секунды вместо повторов)" on=${timed} color=${C.cyan} onClick=${() => setTimed(!timed)} /></div>
    <div class="mt8"><${Chip} text="⇄ На каждую сторону" on=${perSide} color=${C.cyan} onClick=${() => setPerSide(!perSide)} /></div>
  </${Dialog}>`;
}
