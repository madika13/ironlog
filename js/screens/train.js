import { useState, useEffect } from "../vendor/hooks.module.js";
import { state, exercise, lastSet, volume, maxWeight, workoutVolume, workoutMinutes } from "../store.js";
import * as L from "../logic.js";
import { sound } from "../sound.js";
import {
  html, C, Icon, NeonButton, GhostButton, RoundIcon, Card, Label, Title, Badge, Segmented, Stepper, StatTile, Ring,
  Dialog, Act, NumberDialog, ExercisePicker, useNow, fmtWeight, fmtNum, fmtBig, fmtClock, fmtRest, weightLabel,
  TYPE, WARM, typeColor, warmColor,
} from "../ui.js";

const warmIcon = (k) => (k === "BIKE" ? "bike" : "run");

export function TrainTab({ onSettings }) {
  const a = state.active;
  if (a) return html`<${Active} a=${a} />`;
  if (L.lastSummary) return html`<${Summary} w=${L.lastSummary} />`;
  return html`<${Start} onSettings=${onSettings} />`;
}

// ---------------- старт ----------------
function relativeDay(ts) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  if (ts >= t0.getTime()) return "сегодня";
  const diff = Math.floor((t0.getTime() - ts) / 864e5);
  return diff === 0 ? "вчера" : `${diff + 1} дн. назад`;
}

function Start({ onSettings }) {
  const last = state.history[state.history.length - 1];
  const ws = new Date(); ws.setHours(0, 0, 0, 0); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
  const week = state.history.filter((w) => w.startedAt >= ws.getTime()).length;
  return html`<div class="screen list fadein">
    <div class="row gap10">
      <span class="display" style=${{ fontWeight: 900, letterSpacing: "3px" }}>IRON<span class="lime">LOG</span></span>
      <span class="grow"></span>
      <span class="small muted">${new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</span>
      <${RoundIcon} n="settings" size=${36} color=${C.muted} onClick=${onSettings} />
    </div>
    <${Title} style=${{ marginTop: "6px" }}>Готова<br />к тренировке?</${Title}>
    ${last && html`<div class="row gap12">
      <${StatTile} label="на этой неделе" value=${week} unit="трен." />
      <${StatTile} label=${"последняя · " + relativeDay(last.startedAt)} value=${fmtBig(workoutVolume(last))} unit="кг" color=${typeColor(last.type)} />
    </div>`}
    <${Label} style=${{ marginTop: "6px" }}>Выбери программу</${Label}>
    ${!state.programs.length && html`<${Card}><div class="muted">Программа готовится — скоро появится здесь. Пока можно создать свою в «Справочнике».</div></${Card}>`}
    ${state.programs.map((p) => html`<${ProgramCard} p=${p} />`)}
  </div>`;
}

function ProgramCard({ p }) {
  const c = typeColor(p.type);
  const names = p.exercises.map((x) => exercise(x.exerciseId)?.name).filter(Boolean);
  return html`<${Card} onClick=${() => L.startWorkout(p)}>
    <div class="row gap12">
      <div class="grow">
        <${Badge} text=${TYPE[p.type]} color=${c} />
        <div class="display" style=${{ fontSize: "19px", marginTop: "10px" }}>${p.name}</div>
        <div class="small muted mt8">${p.exercises.length} упр. · отдых ${fmtRest(p.restSetSec)} / ${fmtRest(p.restExerciseSec)}</div>
        ${p.warmup !== "NONE" && html`<div class="row gap6 small muted mt4"><${Icon} n=${warmIcon(p.warmup)} size=${16} color=${warmColor(p.warmup)} />${WARM[p.warmup]} · цель ${p.warmupMin} мин / ${fmtNum(p.warmupKm)} км</div>`}
        ${names.length > 0 && html`<div class="small faint mt8" style=${{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>${names.join(" · ")}</div>`}
      </div>
      <div style=${{ width: "52px", height: "52px", borderRadius: "50%", background: c, boxShadow: `0 0 16px ${c}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <${Icon} n="play" size=${30} color="#000" />
      </div>
    </div>
  </${Card}>`;
}

// ---------------- активная тренировка ----------------
function Active({ a }) {
  const now = useNow(200);
  const [finish, setFinish] = useState(false);
  const onFinish = () => setFinish(true);
  const P = { a, now, onFinish };
  return html`<div class="col" style=${{ flex: 1, minHeight: 0 }}>
    <div class="topbar">
      <div class="grow">
        <div class="row gap8"><div class="live"></div><span class="display lime" style=${{ fontSize: "15px" }}>${fmtClock((now - a.startedAt) / 1000)}</span></div>
        <div class="small muted ellipsis">${a.programName}</div>
      </div>
      <${RoundIcon} n="sun" onClick=${L.toggleKeepScreen} color=${state.keepScreenOn ? C.lime : C.faint} />
      <${RoundIcon} n="flag" onClick=${onFinish} color=${C.pink} />
    </div>
    <div class="col fadein" key=${a.phase} style=${{ flex: 1, minHeight: 0 }}>
      ${a.phase === "WARMUP" ? html`<${Warmup} ...${P} />`
        : a.phase === "PICK" ? html`<${Pick} ...${P} />`
        : a.phase === "SET" ? html`<${SetPhase} ...${P} />`
        : a.phase === "REST_SET" ? html`<${RestSet} ...${P} />`
        : html`<${RestExercise} ...${P} />`}
    </div>
    ${finish && html`<${Dialog} title="Завершить тренировку?" onClose=${() => setFinish(false)} actions=${html`
      <${Act} text="Удалить" color=${C.pink} onClick=${() => { setFinish(false); L.discardWorkout(); }} />
      <${Act} text="Отмена" color=${C.muted} onClick=${() => setFinish(false)} />
      <${Act} text="Завершить" onClick=${() => { setFinish(false); L.finishWorkout(); }} />`}>
      <div class="muted">Все сделанные подходы сохранятся в аналитике.</div>
    </${Dialog}>`}
  </div>`;
}

const Phase = ({ bottom, children }) => html`<div class="phase"><div class="phase-body">${children}</div><div class="phase-bottom">${bottom}</div></div>`;

// ---------- разминка ----------
function Warmup({ a, now }) {
  const [dialog, setDialog] = useState(null); // true — после секундомера, false — вручную
  const running = !!a.warmupStartedAt;
  const ms = L.warmupElapsedMs(a, now), el = Math.floor(ms / 1000);
  const tracked = running || ms > 0;
  const goal = Math.max(1, a.warmupPlanMin * 60), reached = el >= goal, color = warmColor(a.warmupKind);
  return html`<${Phase} bottom=${html`
    ${!tracked ? html`<${NeonButton} text="Старт" icon="play" color=${color} onClick=${L.startWarmupClock} />`
      : running ? html`<div class="row gap10"><${GhostButton} text="Пауза" icon="pause" grow height=${64} onClick=${L.pauseWarmupClock} />
          <div style=${{ flex: 1.4 }}><${NeonButton} text="Стоп" icon="stop" color=${color} onClick=${() => { L.pauseWarmupClock(); setDialog(true); }} /></div></div>`
      : html`<div class="row gap10"><${GhostButton} text="Продолжить" icon="play" grow height=${64} onClick=${L.startWarmupClock} />
          <div style=${{ flex: 1.4 }}><${NeonButton} text="Готово" icon="check" color=${color} onClick=${() => setDialog(true)} /></div></div>`}
    <div class="row gap10">
      ${!tracked && html`<${GhostButton} text="Записать вручную" grow onClick=${() => setDialog(false)} />`}
      <${GhostButton} text="Пропустить" grow color=${C.muted} onClick=${L.skipWarmup} />
    </div>`}>
    <${Title}>Разминка</${Title}>
    <div class="mt16"><${Segmented} options=${["Бег", "Велосипед"]} selected=${a.warmupKind === "BIKE" ? 1 : 0} onSelect=${(i) => L.setWarmupKind(i ? "BIKE" : "RUN")} /></div>
    <div class="row gap10 mt12">
      <${Goal} label="цель · время" value=${a.warmupPlanMin + " мин"} done=${reached} color=${color} />
      <${Goal} label="цель · дистанция" value=${fmtNum(a.warmupPlanKm) + " км"} color=${color} />
    </div>
    <div class="mt16"><${Ring} progress=${el / goal} color=${color} pulse=${tracked && !running}>
      <${Icon} n=${warmIcon(a.warmupKind)} size=${30} color=${color} />
      <div class="display" style=${{ fontSize: "52px" }}>${fmtClock(el)}</div>
      <div class="small" style=${{ color: reached && running ? color : C.muted }}>
        ${!tracked ? "секундомер" : !running ? "пауза" : reached ? "цель достигнута ✓" : "до цели " + fmtClock(goal - el)}</div>
    </${Ring}></div>
    ${dialog !== null && html`<${WarmupDialog} a=${a} clockMin=${dialog ? ms / 60000 : null} onClose=${() => setDialog(null)} />`}
  </${Phase}>`;
}

const Goal = ({ label, value, done, color }) => html`
  <div class="tile grow" style=${{ padding: "10px 14px", borderRadius: "16px", borderColor: done ? color : undefined }}>
    <div class="label ellipsis">${label}</div>
    <div class="display mt4" style=${{ fontSize: "18px", color: done ? color : C.text }}>${value}${done ? " ✓" : ""}</div>
  </div>`;

function WarmupDialog({ a, clockMin, onClose }) {
  const [min, setMin] = useState(clockMin == null ? String(a.warmupPlanMin) : "");
  const [km, setKm] = useState("");
  const kmV = parseFloat(km.replace(",", ".")), minV = clockMin ?? parseFloat(min.replace(",", "."));
  const ok = !isNaN(kmV) && !isNaN(minV);
  return html`<${Dialog} title=${WARM[a.warmupKind] + ": итог"} onClose=${onClose} actions=${html`
    <${Act} text="Назад" color=${C.muted} onClick=${onClose} />
    <${Act} text="Сохранить" disabled=${!ok} onClick=${() => { L.finishWarmup(minV, kmV); onClose(); }} />`}>
    ${clockMin != null
      ? html`<div class="row" style=${{ alignItems: "baseline", gap: "8px" }}><span class="display" style=${{ fontSize: "30px", color: warmColor(a.warmupKind) }}>${fmtClock(clockMin * 60)}</span><span class="muted">время</span></div>`
      : html`<div class="field-label">Время, мин</div><input class="input" inputmode="decimal" value=${min} onInput=${(e) => setMin(e.target.value)} />`}
    <div class="field-label mt12">Сколько проехала/пробежала, км</div>
    <input class="input" inputmode="decimal" placeholder=${"цель " + fmtNum(a.warmupPlanKm)} value=${km} onInput=${(e) => setKm(e.target.value)} />
  </${Dialog}>`;
}

// ---------- выбор упражнения ----------
function ChoiceList({ a, selected, onPick }) {
  const planIds = a.plan.map((p) => p.exerciseId);
  const extra = [...new Set(a.logs.map((l) => l.exerciseId))].filter((id) => !planIds.includes(id));
  const rows = [...a.plan.map((p) => [p.exerciseId, p]), ...extra.map((id) => [id, null])];
  rows.sort((x, y) => (L.setsDone(a, x[0]) >= (x[1]?.sets ?? 1)) - (L.setsDone(a, y[0]) >= (y[1]?.sets ?? 1)));
  return html`<div class="list" style=${{ gap: "10px" }}>${rows.map(([id, pe]) => {
    const ex = exercise(id); if (!ex) return null;
    const done = L.setsDone(a, id), target = pe?.sets ?? done, finished = done >= target && done > 0, sel = id === selected;
    const sub = pe ? (ex.timed ? `${pe.sets} × ${pe.reps} с` : `${pe.sets} × ${pe.reps} · ${weightLabel(lastSet(id)?.weight ?? pe.weight)}`) : "вне программы";
    return html`<${Card} p14 accent=${sel ? C.lime : null} onClick=${() => onPick(id)}>
      <div class="row gap14">
        <div class="check" style=${{ width: "40px", height: "40px", background: finished ? C.lime : undefined, color: finished ? "#000" : done ? C.lime : C.muted, borderColor: sel ? C.lime : undefined, fontSize: "12px", fontWeight: 700 }}>
          ${finished ? html`<${Icon} n="check" />` : `${done}/${target}`}</div>
        <div class="grow"><div class="bold" style=${{ fontSize: "16px", color: finished && !sel ? C.muted : C.text }}>${ex.name}</div>
          <div class="small muted">${ex.muscle} · ${sub}</div></div>
        ${sel && html`<${Icon} n="check" size=${22} color=${C.lime} />`}
      </div>
    </${Card}>`;
  })}</div>`;
}

function Pick({ a, onFinish }) {
  const [lib, setLib] = useState(false);
  const done = a.plan.filter((p) => L.setsDone(a, p.exerciseId) >= p.sets).length;
  return html`<${Phase} bottom=${html`<${GhostButton} text="Завершить тренировку" icon="flag" color=${C.pink} onClick=${onFinish} />`}>
    <${Title}>Выбери<br />упражнение</${Title}>
    <div class="row gap10" style=${{ margin: "8px 0 16px" }}>
      <span class="muted">Выполнено ${done} из ${a.plan.length}</span>
      ${a.warmup && html`<${Badge} text=${`${WARM[a.warmup.kind]} ${fmtNum(a.warmup.km)} км ✓`} color=${warmColor(a.warmup.kind)} />`}
    </div>
    <${ChoiceList} a=${a} onPick=${L.pickExercise} />
    <div class="mt12"><${GhostButton} text="Другое из справочника" icon="add" color=${C.lime} style=${{ width: "100%" }} onClick=${() => setLib(true)} /></div>
    ${lib && html`<${ExercisePicker} exercises=${state.exercises} onPick=${(id) => { setLib(false); L.pickExercise(id); }} onClose=${() => setLib(false)} />`}
  </${Phase}>`;
}

// ---------- подход ----------
function SetPhase({ a }) {
  const cur = L.currentLog(a);
  const [editW, setEditW] = useState(false), [editR, setEditR] = useState(false), [timer, setTimer] = useState(null);
  if (!cur) return null;
  const ex = exercise(cur.exerciseId), timed = !!ex?.timed, last = lastSet(cur.exerciseId);
  if (timer) return html`<${TimedRunner} a=${a} name=${cur.name} start=${timer} onDone=${() => setTimer(null)} />`;
  return html`<${Phase} bottom=${html`
    ${timed ? html`<${NeonButton} text=${`Старт · ${a.reps} с`} icon="timer" height=${76} onClick=${() => { sound.tap(); setTimer(Date.now()); }} />`
      : html`<${NeonButton} text="Подход готов" icon="check" height=${76} onClick=${() => { sound.tap(); L.completeSet(); }} />`}
    <div class="row gap10">
      <${GhostButton} text="Ещё подход" icon="add" grow onClick=${() => L.setTargetSets(a.targetSets + 1)} />
      <${GhostButton} text="Закончить упр." grow color=${C.muted} onClick=${L.finishExercise} />
    </div>`}>
    <${Label} color=${C.lime}>${ex?.muscle || ""}</${Label}>
    <div class="display mt4" style=${{ fontWeight: 900, fontSize: "28px", lineHeight: 1.15 }}>${cur.name}</div>
    ${ex?.note && html`<${TechNote} text=${ex.note} />`}
    <div class="row mt16" style=${{ alignItems: "flex-end" }}>
      <span class="display lime" style=${{ fontWeight: 900, fontSize: "64px", lineHeight: 1 }}>${cur.sets.length + 1}</span>
      <span class="display faint" style=${{ fontSize: "26px", marginBottom: "6px" }}> / ${a.targetSets}</span>
      <span class="grow"></span><${Label} style=${{ marginBottom: "10px" }}>подход</${Label}>
    </div>
    <div class="dots mt12">${Array.from({ length: a.targetSets }, (_, i) => html`<div class=${i < cur.sets.length ? "done" : i === cur.sets.length ? "cur" : ""}></div>`)}</div>
    <div class="row gap12 mt20">
      <${Stepper} label="Вес" value=${fmtWeight(a.weight)} unit="кг" onMinus=${() => L.setWeight(a.weight - 2.5)} onPlus=${() => L.setWeight(a.weight + 2.5)} onEdit=${() => setEditW(true)} />
      ${timed
        ? html`<${Stepper} label="Время" value=${String(a.reps)} unit="сек" onMinus=${() => L.setReps(a.reps - 5)} onPlus=${() => L.setReps(a.reps + 5)} onEdit=${() => setEditR(true)} />`
        : html`<${Stepper} label="Повторы" value=${String(a.reps)} unit="раз" onMinus=${() => L.setReps(a.reps - 1)} onPlus=${() => L.setReps(a.reps + 1)} onEdit=${() => setEditR(true)} />`}
    </div>
    ${last && html`<div class="small muted mt12">Прошлый раз: ${timed ? `${last.reps} с` : `${weightLabel(last.weight)} × ${last.reps}`}</div>`}
    ${cur.sets.length > 0 && html`<div class="mt20"><${Label}>Сделано</${Label}>
      ${cur.sets.map((s, i) => html`<div class="row gap12" style=${{ padding: "5px 0" }}>
        <span style=${{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--lime-deep)", color: C.lime, fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>${i + 1}</span>
        <span class="semibold">${timed ? `${s.reps} с` : `${weightLabel(s.weight)} × ${s.reps}`}</span></div>`)}</div>`}
    ${editW && html`<${NumberDialog} title="Вес, кг" initial=${a.weight} onClose=${() => setEditW(false)} onOk=${L.setWeight} />`}
    ${editR && html`<${NumberDialog} title=${timed ? "Секунды" : "Повторы"} initial=${a.reps} decimal=${false} onClose=${() => setEditR(false)} onOk=${L.setReps} />`}
  </${Phase}>`;
}

/** Подсказка по технике (свёрнута до двух строк, тап — раскрыть). */
function TechNote({ text }) {
  const [open, setOpen] = useState(false);
  return html`<div class="card p14 mt12" onClick=${() => setOpen(!open)} style=${{ borderColor: "color-mix(in srgb, var(--cyan) 40%, transparent)" }}>
    <div class="label" style=${{ color: C.cyan }}>Как делать</div>
    <div class="small mt4" style=${open ? null : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>${text}</div>
  </div>`;
}

/** Обратный отсчёт для планки и прочих упражнений на время. */
function TimedRunner({ a, name, start, onDone }) {
  const now = useNow(100);
  const total = Math.max(1, a.reps) * 1000, el = now - start, left = total - el, leftSec = Math.max(0, Math.ceil(left / 1000));
  useEffect(() => {
    if (leftSec >= 1 && leftSec <= 3) sound.tick();
    if (left <= 0) { sound.done(); L.completeSet(); onDone(); }
  }, [leftSec]);
  return html`<${Phase} bottom=${html`
    <${NeonButton} text=${`Стоп — засчитать ${Math.floor(el / 1000)} с`} icon="check" color=${C.pink}
      onClick=${() => { L.setReps(Math.max(1, Math.floor(el / 1000))); L.completeSet(); onDone(); }} />
    <${GhostButton} text="Отменить подход" color=${C.muted} onClick=${onDone} />`}>
    <div class="col center">
      <${Label} color=${C.lime}>Держим!</${Label}>
      <div class="muted" style=${{ margin: "4px 0 10px" }}>${name}</div>
      <${Ring} progress=${left / total} size=${300}>
        <div class="display" style=${{ fontWeight: 900, fontSize: "84px" }}>${leftSec}</div>
        <div class="small muted">из ${a.reps} сек</div>
      </${Ring}>
      <div class="small faint mt8" style=${{ textAlign: "center" }}>${exercise(L.currentLog(a)?.exerciseId)?.note || "Дыши ровно, пресс напряжён, поясница не провисает."}</div>
    </div>
  </${Phase}>`;
}

// ---------- отдых между подходами ----------
function RestSet({ a, now }) {
  const cur = L.currentLog(a);
  const [editW, setEditW] = useState(false), [editR, setEditR] = useState(false);
  const total = Math.max(1, a.restEndsAt - a.restStartedAt), left = a.restEndsAt - now, leftSec = Math.max(0, Math.ceil(left / 1000));
  useEffect(() => {
    if (leftSec >= 1 && leftSec <= 3) sound.tick();
    if (left <= 0) { sound.done(); L.endRest(); }
  }, [leftSec]);
  if (!cur) return null;
  const timed = !!exercise(cur.exerciseId)?.timed;
  return html`<${Phase} bottom=${html`<${NeonButton} text="Начать подход" icon="play" onClick=${L.endRest} />`}>
    <div class="col center">
      <${Label} color=${C.lime}>Отдых</${Label}>
      <div class="muted" style=${{ margin: "4px 0 8px" }}>${cur.name}</div>
      <${Ring} progress=${left / total}>
        <${Icon} n="timer" size=${22} color=${C.muted} />
        <div class="display" style=${{ fontSize: "60px" }}>${fmtClock(leftSec)}</div>
        <div class="small muted">далее подход ${cur.sets.length + 1} / ${a.targetSets}</div>
      </${Ring}>
      <div class="row gap10" style=${{ width: "100%" }}>
        <${GhostButton} text="−15 с" grow onClick=${() => L.addRest(-15)} />
        <${GhostButton} text="+15 с" grow onClick=${() => L.addRest(15)} />
        <${GhostButton} text="+30 с" grow onClick=${() => L.addRest(30)} />
      </div>
    </div>
    <${Label} style=${{ margin: "18px 0 8px" }}>Следующий подход</${Label}>
    <div class="row gap12">
      <${Stepper} big=${false} label="Вес" value=${fmtWeight(a.weight)} unit="кг" onMinus=${() => L.setWeight(a.weight - 2.5)} onPlus=${() => L.setWeight(a.weight + 2.5)} onEdit=${() => setEditW(true)} />
      <${Stepper} big=${false} label=${timed ? "Секунды" : "Повторы"} value=${String(a.reps)} unit="" onMinus=${() => L.setReps(a.reps - (timed ? 5 : 1))} onPlus=${() => L.setReps(a.reps + (timed ? 5 : 1))} onEdit=${() => setEditR(true)} />
    </div>
    ${editW && html`<${NumberDialog} title="Вес, кг" initial=${a.weight} onClose=${() => setEditW(false)} onOk=${L.setWeight} />`}
    ${editR && html`<${NumberDialog} title=${timed ? "Секунды" : "Повторы"} initial=${a.reps} decimal=${false} onClose=${() => setEditR(false)} onOk=${L.setReps} />`}
  </${Phase}>`;
}

// ---------- отдых между упражнениями ----------
function RestExercise({ a, now, onFinish }) {
  const [lib, setLib] = useState(false);
  const total = Math.max(1, a.restEndsAt - a.restStartedAt), left = a.restEndsAt - now, leftSec = Math.max(0, Math.ceil(left / 1000)), over = left <= 0;
  useEffect(() => {
    if (leftSec >= 1 && leftSec <= 3) sound.tick();
    if (leftSec === 0 && left > -1500) sound.done();
  }, [leftSec]);
  const last = L.currentLog(a);
  return html`<${Phase} bottom=${html`
    <${NeonButton} text=${a.nextExerciseId ? "Поехали" : "Выбери упражнение"} icon="play" disabled=${!a.nextExerciseId} onClick=${L.goNext} />
    <div class="row gap10">
      <${GhostButton} text="Ещё подход" icon="add" grow onClick=${L.extraSet} />
      <${GhostButton} text="Финиш" icon="flag" grow color=${C.pink} onClick=${onFinish} />
    </div>`}>
    <div class="row gap14">
      <${Ring} progress=${over ? 1 : left / total} size=${150} pulse=${over}>
        <div class="display" style=${{ fontSize: over ? "30px" : "26px", color: over ? C.lime : C.text }}>${over ? "GO" : fmtClock(leftSec)}</div>
      </${Ring}>
      <div class="grow">
        <${Label} color=${C.lime}>Отдых между упр.</${Label}>
        ${last && html`<div class="bold mt4">${last.name}</div><div class="small muted">${last.sets.length} подх. · ${fmtBig(volume(last))} кг</div>`}
        <div class="row gap8 mt8"><${GhostButton} text="−15" grow height=${38} onClick=${() => L.addRest(-15)} /><${GhostButton} text="+30" grow height=${38} onClick=${() => L.addRest(30)} /></div>
      </div>
    </div>
    <div class="row mt20"><${Label}>Следующее упражнение</${Label}><span class="pink bold"> *</span></div>
    <div class="small faint" style=${{ margin: "2px 0 10px" }}>Выбор обязателен, чтобы продолжить</div>
    <${ChoiceList} a=${a} selected=${a.nextExerciseId} onPick=${L.pickExercise} />
    <div class="mt12"><${GhostButton} text="Другое из справочника" icon="add" color=${C.lime} style=${{ width: "100%" }} onClick=${() => setLib(true)} /></div>
    ${lib && html`<${ExercisePicker} exercises=${state.exercises} onPick=${(id) => { setLib(false); L.pickExercise(id); }} onClose=${() => setLib(false)} />`}
  </${Phase}>`;
}

// ---------------- итоги ----------------
function Summary({ w }) {
  const wu = w.warmup;
  return html`<div class="phase" style=${{ paddingTop: "calc(var(--safe-top) + 24px)" }}>
    <div class="phase-body fadein">
      <div style=${{ width: "72px", height: "72px", borderRadius: "50%", background: C.lime, boxShadow: `0 0 26px ${C.lime}`, display: "flex", alignItems: "center", justifyContent: "center" }}><${Icon} n="check" size=${40} color="#000" /></div>
      <${Title} style=${{ marginTop: "18px" }}>Тренировка<br />завершена</${Title}>
      <div class="muted" style=${{ margin: "4px 0 18px" }}>${w.programName}</div>
      <div class="row gap12"><${StatTile} label="время" value=${Math.round(workoutMinutes(w))} unit="мин" /><${StatTile} label="тоннаж" value=${fmtBig(workoutVolume(w))} unit="кг" color=${C.cyan} /></div>
      <div class="row gap12 mt12"><${StatTile} label="подходов" value=${w.exercises.reduce((s, e) => s + e.sets.length, 0)} unit="" color=${C.pink} />
        <${StatTile} label=${wu ? WARM[wu.kind].toLowerCase() : "разминка"} value=${wu ? fmtNum(wu.km, 2) : "—"} unit=${wu ? "км" : ""} color=${wu ? warmColor(wu.kind) : C.faint} /></div>
      <div class="list mt16" style=${{ gap: "10px" }}>${w.exercises.map((e) => html`<${Card} p14>
        <div class="row"><b class="grow">${e.name}</b><span class="small lime bold">макс ${weightLabel(maxWeight(e))}</span></div>
        <div class="small muted mt4">${e.sets.map((s) => `${fmtWeight(s.weight)}×${s.reps}`).join("   ")}</div></${Card}>`)}</div>
    </div>
    <div class="phase-bottom"><${NeonButton} text="Готово" onClick=${L.dismissSummary} /></div>
  </div>`;
}
