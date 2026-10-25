import { useState, useEffect } from "../vendor/hooks.module.js";
import { state, dish, planOf, foodOn, newId, dayKey } from "../store.js";
import * as L from "../logic.js";
import {
  html, C, Icon, NeonButton, GhostButton, RoundIcon, Card, Label, Title, Badge, Segmented, Stepper, Chip, MacroBar, Ring,
  Dialog, Act, NumberDialog, Sheet, LineChart, fmtWeight, fmtNum, fmtBig, SLOT, slotColor,
} from "../ui.js";

const DAY = 864e5;

export function FoodTab() {
  const [section, setSection] = useState(0);
  return html`<div class="screen list fadein">
    <${Title}>Питание</${Title}>
    <${Segmented} options=${["День", "Блюда", "Вес"]} selected=${section} onSelect=${setSection} />
    ${section === 0 ? html`<${DayView} />` : section === 1 ? html`<${Dishes} />` : html`<${Weight} />`}
  </div>`;
}

// ---------- день ----------
function DayView() {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(null), [adding, setAdding] = useState(false), [custom, setCustom] = useState(false);
  const ts = Date.now() + offset * DAY, day = dayKey(ts);
  useEffect(() => { L.ensurePlan(day); }, [day]);
  const eaten = foodOn(day), plan = planOf(day), g = state.goals;
  const planned = plan ? Object.values(plan.dishes).map(dish).filter(Boolean) : [];
  const kcal = eaten.reduce((s, f) => s + f.kcal, 0), left = g.kcal - kcal;
  const sum = (k) => eaten.reduce((s, f) => s + f[k], 0);
  const d = new Date(ts);
  const extras = eaten.filter((f) => !f.planned);
  return html`
    <div class="row">
      <${RoundIcon} n="left" color=${C.text} onClick=${() => setOffset(offset - 1)} />
      <div class="grow col center">
        <span class="display" style=${{ fontSize: "17px" }}>${offset === 0 ? "Сегодня" : offset === -1 ? "Вчера" : offset === 1 ? "Завтра" : d.toLocaleDateString("ru-RU", { weekday: "long" })}</span>
        <span class="small muted">${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
      </div>
      <${RoundIcon} n="right" color=${C.text} onClick=${() => setOffset(offset + 1)} />
    </div>
    <${Card}>
      <div class="row gap14">
        <${Ring} progress=${kcal / g.kcal} size=${140} color=${left < 0 ? C.pink : C.lime}>
          <div class="display" style=${{ fontSize: "22px" }}>${fmtBig(kcal)}</div><div class="xs muted">из ${fmtBig(g.kcal)}</div>
        </${Ring}>
        <div class="grow list" style=${{ gap: "8px" }}>
          <div><${Label}>${left >= 0 ? "осталось" : "перебор"}</${Label}><div class="display" style=${{ fontSize: "18px", color: left >= 0 ? C.lime : C.pink }}>${fmtBig(Math.abs(left))} ккал</div></div>
          <${MacroBar} label="Белки" v=${sum("protein")} goal=${g.protein} color=${C.lime} />
          <${MacroBar} label="Жиры" v=${sum("fat")} goal=${g.fat} color=${C.pink} />
          <${MacroBar} label="Углеводы" v=${sum("carbs")} goal=${g.carbs} color=${C.cyan} />
        </div>
      </div>
      ${planned.length > 0 && html`<div class="small muted mt12">План дня: ${planned.reduce((s, x) => s + x.kcal, 0)} ккал · Б ${planned.reduce((s, x) => s + x.protein, 0)} · Ж ${planned.reduce((s, x) => s + x.fat, 0)} · У ${planned.reduce((s, x) => s + x.carbs, 0)}</div>`}
    </${Card}>
    ${L.SLOTS.map((slot) => {
      const ds = dish(plan?.dishes?.[slot]), done = eaten.some((f) => f.slot === slot && f.planned), c = slotColor(slot);
      return html`<${Card} p14 accent=${done ? c : null} onClick=${() => ds && setOpen(ds)}>
        <div class="row"><${Label} color=${c}>${SLOT[slot]}</${Label}><span class="grow"></span>${ds && html`<span class="small muted bold">${ds.kcal} ккал</span>`}</div>
        <div class="row gap8 mt8">
          <div class="grow"><div class="bold" style=${{ fontSize: "16px", color: done ? C.muted : C.text }}>${ds?.name || "—"}</div>
            ${ds && html`<div class="small muted mt4">Б ${ds.protein} · Ж ${ds.fat} · У ${ds.carbs} · ${ds.minutes} мин</div>`}</div>
          <span onClick=${(e) => e.stopPropagation()}><${RoundIcon} n="shuffle" size=${38} color=${C.muted} onClick=${() => L.swapDish(day, slot)} /></span>
          <button class=${`check ${done ? "on" : ""}`} style=${{ "--c": c }} onClick=${(e) => { e.stopPropagation(); L.togglePlannedEaten(day, slot); }}><${Icon} n="check" /></button>
        </div>
      </${Card}>`;
    })}
    ${extras.length > 0 && html`<${Label}>Дополнительно</${Label}>`}
    ${extras.map((f) => html`<${Card} p14><div class="row gap8">
      <div class="grow"><div class="semibold">${f.name}${f.portion !== 1 ? ` ×${fmtNum(f.portion)}` : ""}</div><div class="small muted">${f.kcal} ккал · Б ${f.protein} · Ж ${f.fat} · У ${f.carbs}</div></div>
      <button class="icon-btn" style=${{ color: C.pink }} onClick=${() => L.removeFood(f.id)}><${Icon} n="close" /></button></div></${Card}>`)}
    <div class="row gap10">
      <${GhostButton} text="Добавить еду" icon="add" color=${C.lime} grow onClick=${() => setAdding(true)} />
      <${GhostButton} text="Новый план" icon="refresh" grow onClick=${() => L.generatePlan(day)} />
    </div>
    <div class="small faint">Нажми ✓, когда съела блюдо. ⇄ — заменить на другое. Тап по карточке — рецепт.</div>
    ${adding && html`<${AddFood} onPick=${(x) => { setAdding(false); setOpen(x); }} onCustom=${() => { setAdding(false); setCustom(true); }} onClose=${() => setAdding(false)} />`}
    ${open && html`<${DishSheet} d=${open} onClose=${() => setOpen(null)} onAdd=${(p) => { L.addFood(day, open, p); setOpen(null); }} onPlan=${() => { L.setPlanDish(day, open.slot, open.id); setOpen(null); }} />`}
    ${custom && html`<${CustomFood} day=${day} onClose=${() => setCustom(false)} />`}`;
}

function DishSheet({ d, onClose, onAdd, onPlan, onDelete }) {
  const [portion, setPortion] = useState(1);
  const m = (v) => Math.round(v * portion);
  const tile = (label, v, color) => html`<div class="tile grow col center" style=${{ padding: "10px 4px", borderRadius: "14px" }}>
    <span class="display" style=${{ fontSize: "17px", color }}>${v}</span><span class="xs muted">${label}</span></div>`;
  return html`<${Sheet} onClose=${onClose}>
    <div class="row gap8"><${Badge} text=${SLOT[d.slot]} color=${slotColor(d.slot)} /><span class="small muted">${d.minutes} мин</span></div>
    <div class="display" style=${{ fontSize: "22px", lineHeight: 1.25, margin: "10px 0 14px" }}>${d.name}</div>
    <div class="row gap8">${tile("ккал", m(d.kcal), C.text)}${tile("белки", m(d.protein), C.lime)}${tile("жиры", m(d.fat), C.pink)}${tile("углев.", m(d.carbs), C.cyan)}</div>
    ${d.ingredients.length > 0 && html`<${Label} color=${C.lime} style=${{ margin: "18px 0 6px" }}>Ингредиенты</${Label}>
      ${d.ingredients.map((x) => html`<div class="row gap10" style=${{ padding: "3px 0" }}><span style=${{ width: "5px", height: "5px", borderRadius: "50%", background: C.lime, flex: "none" }}></span>${x}</div>`)}`}
    ${d.steps.length > 0 && html`<${Label} color=${C.lime} style=${{ margin: "16px 0 6px" }}>Приготовление</${Label}>
      ${d.steps.map((x, i) => html`<div class="row" style=${{ padding: "4px 0", alignItems: "flex-start" }}><span class="display lime" style=${{ width: "22px", flex: "none" }}>${i + 1}</span><span>${x}</span></div>`)}`}
    <${Label} style=${{ margin: "16px 0 8px" }}>Порция</${Label}>
    <div class="chips">${[[0.5, "½"], [1, "1"], [1.5, "1½"], [2, "2"]].map(([v, t]) => html`<${Chip} text=${t} on=${portion === v} onClick=${() => setPortion(v)} />`)}</div>
    <div class="list mt16" style=${{ gap: "10px" }}>
      <${NeonButton} text="Съела — в дневник" icon="check" height=${56} onClick=${() => onAdd(portion)} />
      <${GhostButton} text=${"Поставить в план на " + SLOT[d.slot].toLowerCase()} onClick=${onPlan} />
      ${onDelete && html`<${GhostButton} text="Удалить блюдо" color=${C.pink} onClick=${onDelete} />`}
    </div>
  </${Sheet}>`;
}

function AddFood({ onPick, onCustom, onClose }) {
  const [q, setQ] = useState(""), [filter, setFilter] = useState(null);
  const list = state.dishes.filter((d) => (!filter || d.slot === filter) && (!q.trim() || d.name.toLowerCase().includes(q.trim().toLowerCase())));
  return html`<${Sheet} onClose=${onClose}>
    <${NeonButton} text="Своя еда (ввести КБЖУ)" icon="add" height=${50} size=${13} onClick=${onCustom} />
    <div class="chips mt12"><${Chip} text="Все" on=${!filter} onClick=${() => setFilter(null)} />
      ${L.SLOTS.map((s) => html`<${Chip} text=${SLOT[s]} on=${filter === s} color=${slotColor(s)} onClick=${() => setFilter(s)} />`)}</div>
    <input class="input mt12" placeholder="Поиск блюда" value=${q} onInput=${(e) => setQ(e.target.value)} />
    ${L.SLOTS.map((s) => {
      const l = list.filter((d) => d.slot === s); if (!l.length) return null;
      return html`<div><${Label} color=${slotColor(s)} style=${{ margin: "16px 0 4px" }}>${SLOT[s]}</${Label}>
        ${l.map((d) => html`<div class="row" style=${{ padding: "11px 0" }} onClick=${() => onPick(d)}><span class="grow semibold">${d.name}</span><span class="small muted">${d.kcal} ккал</span></div>`)}</div>`;
    })}
  </${Sheet}>`;
}

const num = (v) => parseInt(v, 10) || 0;
function CustomFood({ day, onClose }) {
  const [f, setF] = useState({ name: "", kcal: "", p: "", fat: "", c: "", slot: "SNACK" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim() && f.kcal;
  return html`<${Dialog} title="Своя еда" onClose=${onClose} actions=${html`<${Act} text="Отмена" color=${C.muted} onClick=${onClose} />
    <${Act} text="Добавить" disabled=${!ok} onClick=${() => { L.addCustomFood({ id: newId(), day, slot: f.slot, name: f.name.trim(), kcal: num(f.kcal), protein: num(f.p), fat: num(f.fat), carbs: num(f.c), dishId: null, portion: 1, planned: false }); onClose(); }} />`}>
    <div class="field-label">Что съела</div><input class="input" value=${f.name} onInput=${set("name")} />
    <div class="field-label mt12">Калории</div><input class="input" inputmode="numeric" value=${f.kcal} onInput=${set("kcal")} />
    <div class="row gap8 mt12">
      <div class="grow"><div class="field-label">Б</div><input class="input" inputmode="numeric" value=${f.p} onInput=${set("p")} /></div>
      <div class="grow"><div class="field-label">Ж</div><input class="input" inputmode="numeric" value=${f.fat} onInput=${set("fat")} /></div>
      <div class="grow"><div class="field-label">У</div><input class="input" inputmode="numeric" value=${f.c} onInput=${set("c")} /></div>
    </div>
    <div class="chips wrap mt12">${L.SLOTS.map((s) => html`<${Chip} text=${SLOT[s]} on=${f.slot === s} color=${slotColor(s)} onClick=${() => setF({ ...f, slot: s })} />`)}</div>
  </${Dialog}>`;
}

// ---------- блюда ----------
function Dishes() {
  const [filter, setFilter] = useState(null), [q, setQ] = useState(""), [open, setOpen] = useState(null), [creating, setCreating] = useState(false);
  const today = dayKey();
  const list = state.dishes.filter((d) => (!filter || d.slot === filter) && (!q.trim() || d.name.toLowerCase().includes(q.trim().toLowerCase())));
  return html`
    <div class="chips"><${Chip} text=${"Все · " + state.dishes.length} on=${!filter} onClick=${() => setFilter(null)} />
      ${L.SLOTS.map((s) => html`<${Chip} text=${SLOT[s]} on=${filter === s} color=${slotColor(s)} onClick=${() => setFilter(s)} />`)}</div>
    <input class="input" placeholder="Поиск" value=${q} onInput=${(e) => setQ(e.target.value)} />
    ${list.map((d) => html`<${Card} p14 onClick=${() => setOpen(d)}><div class="row gap12">
      <span style=${{ width: "8px", height: "8px", borderRadius: "50%", background: slotColor(d.slot), flex: "none" }}></span>
      <div class="grow"><div class="bold">${d.name}</div><div class="small muted">${SLOT[d.slot]} · ${d.minutes} мин</div></div>
      <div class="col" style=${{ alignItems: "flex-end" }}><span class="display" style=${{ fontSize: "15px" }}>${d.kcal}</span><span class="small lime bold">Б ${d.protein}</span></div>
    </div></${Card}>`)}
    <${NeonButton} text="Своё блюдо" icon="add" height=${56} onClick=${() => setCreating(true)} />
    ${open && html`<${DishSheet} d=${open} onClose=${() => setOpen(null)} onAdd=${(p) => { L.addFood(today, open, p); setOpen(null); }}
      onPlan=${() => { L.setPlanDish(today, open.slot, open.id); setOpen(null); }} onDelete=${open.custom ? () => { L.deleteDish(open.id); setOpen(null); } : null} />`}
    ${creating && html`<${DishEdit} onClose=${() => setCreating(false)} />`}`;
}

function DishEdit({ onClose }) {
  const [f, setF] = useState({ name: "", kcal: "", p: "", fat: "", c: "", ingr: "", steps: "", slot: "LUNCH" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim() && f.kcal;
  const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  return html`<${Dialog} title="Своё блюдо" onClose=${onClose} actions=${html`<${Act} text="Отмена" color=${C.muted} onClick=${onClose} />
    <${Act} text="Сохранить" disabled=${!ok} onClick=${() => { L.saveDish({ id: newId(), name: f.name.trim(), slot: f.slot, kcal: num(f.kcal), protein: num(f.p), fat: num(f.fat), carbs: num(f.c), minutes: 15, ingredients: lines(f.ingr), steps: lines(f.steps), custom: true }); onClose(); }} />`}>
    <div class="field-label">Название</div><input class="input" value=${f.name} onInput=${set("name")} />
    <div class="chips wrap mt12">${L.SLOTS.map((s) => html`<${Chip} text=${SLOT[s]} on=${f.slot === s} color=${slotColor(s)} onClick=${() => setF({ ...f, slot: s })} />`)}</div>
    <div class="field-label mt12">Калории на порцию</div><input class="input" inputmode="numeric" value=${f.kcal} onInput=${set("kcal")} />
    <div class="row gap8 mt12">
      <div class="grow"><div class="field-label">Б</div><input class="input" inputmode="numeric" value=${f.p} onInput=${set("p")} /></div>
      <div class="grow"><div class="field-label">Ж</div><input class="input" inputmode="numeric" value=${f.fat} onInput=${set("fat")} /></div>
      <div class="grow"><div class="field-label">У</div><input class="input" inputmode="numeric" value=${f.c} onInput=${set("c")} /></div>
    </div>
    <div class="field-label mt12">Ингредиенты (каждый с новой строки)</div><textarea class="input" value=${f.ingr} onInput=${set("ingr")}></textarea>
    <div class="field-label mt12">Шаги (каждый с новой строки)</div><textarea class="input" value=${f.steps} onInput=${set("steps")}></textarea>
  </${Dialog}>`;
}

// ---------- вес и цели ----------
function Weight() {
  const [editW, setEditW] = useState(false), [edit, setEdit] = useState(null);
  const g = state.goals, ws = state.weights, cur = ws[ws.length - 1], start = ws[0];
  const ask = (title, v, apply) => setEdit({ title, v, apply });
  const G = (patch) => L.setGoals({ ...g, ...patch });
  const short = (d) => `${d.slice(8)}.${d.slice(5, 7)}`;
  const frac = start && cur ? Math.min(1, Math.max(0, (start.kg - cur.kg) / Math.max(0.1, start.kg - g.targetWeight))) : 0;
  return html`
    <${Card}>
      <${Label}>Текущий вес</${Label}>
      <div class="row mt8" style=${{ alignItems: "flex-end" }}>
        <span class="display lime" style=${{ fontWeight: 900, fontSize: "44px" }}>${cur ? fmtWeight(cur.kg) : "—"}</span><span class="muted" style=${{ margin: "0 0 8px 4px" }}>кг</span>
        <span class="grow"></span>
        <div class="col" style=${{ alignItems: "flex-end", marginBottom: "6px" }}><span class="small muted">цель</span><span class="display" style=${{ fontSize: "16px" }}>${fmtWeight(g.targetWeight)} кг</span></div>
      </div>
      ${start && html`<div class="bar mt12" style=${{ height: "8px" }}><div style=${{ width: frac * 100 + "%", "--c": C.lime }}></div></div>
        <div class="row small mt8"><span class="grow muted">старт ${fmtWeight(start.kg)}</span>
          <b style=${{ color: cur.kg - start.kg <= 0 ? C.lime : C.pink }}>${cur.kg - start.kg > 0 ? "+" : ""}${fmtNum(cur.kg - start.kg, 1)} кг · осталось ${fmtNum(Math.max(0, cur.kg - g.targetWeight), 1)}</b></div>`}
      <div class="mt16"><${NeonButton} text="Записать вес сегодня" icon="add" height=${54} onClick=${() => setEditW(true)} /></div>
      <div class="small faint mt12">Взвешивайся утром натощак. Смотри на тренд за неделю, а не на скачки за день.</div>
    </${Card}>
    ${ws.length >= 2 && html`<${Card}><div class="display" style=${{ fontSize: "16px", marginBottom: "12px" }}>Динамика веса</div>
      <${LineChart} values=${ws.slice(-30).map((w) => w.kg)} labels=${ws.slice(-30).map((w) => short(w.day))} fmt=${fmtWeight} /></${Card}>`}
    <${Card}>
      <div class="display" style=${{ fontSize: "16px" }}>Цели питания</div>
      <div class="small muted" style=${{ margin: "2px 0 12px" }}>Меняются под твою цель</div>
      <div class="row gap8">
        <${Stepper} big=${false} label="ккал" value=${String(g.kcal)} onMinus=${() => G({ kcal: g.kcal - 50 })} onPlus=${() => G({ kcal: g.kcal + 50 })} onEdit=${() => ask("Калории в день", g.kcal, (v) => G({ kcal: Math.round(v) }))} />
        <${Stepper} big=${false} label="цель, кг" value=${fmtWeight(g.targetWeight)} onMinus=${() => G({ targetWeight: g.targetWeight - 1 })} onPlus=${() => G({ targetWeight: g.targetWeight + 1 })} onEdit=${() => ask("Целевой вес, кг", g.targetWeight, (v) => G({ targetWeight: v }))} />
      </div>
      <div class="row gap8 mt8">
        <${Stepper} big=${false} label="белки" value=${String(g.protein)} onMinus=${() => G({ protein: g.protein - 5 })} onPlus=${() => G({ protein: g.protein + 5 })} onEdit=${() => ask("Белки, г", g.protein, (v) => G({ protein: Math.round(v) }))} />
        <${Stepper} big=${false} label="жиры" value=${String(g.fat)} onMinus=${() => G({ fat: g.fat - 5 })} onPlus=${() => G({ fat: g.fat + 5 })} onEdit=${() => ask("Жиры, г", g.fat, (v) => G({ fat: Math.round(v) }))} />
        <${Stepper} big=${false} label="углев." value=${String(g.carbs)} onMinus=${() => G({ carbs: g.carbs - 5 })} onPlus=${() => G({ carbs: g.carbs + 5 })} onEdit=${() => ask("Углеводы, г", g.carbs, (v) => G({ carbs: Math.round(v) }))} />
      </div>
    </${Card}>
    ${ws.length > 0 && html`<${Label}>Записи</${Label}>`}
    ${ws.slice().reverse().slice(0, 20).map((w) => html`<div class="row" style=${{ padding: "4px 0" }}>
      <span class="grow muted">${short(w.day)}.${w.day.slice(0, 4)}</span><b>${fmtWeight(w.kg)} кг</b>
      <button class="icon-btn" style=${{ marginLeft: "8px", color: C.faint }} onClick=${() => L.deleteWeight(w.day)}><${Icon} n="close" /></button></div>`)}
    ${editW && html`<${NumberDialog} title="Вес сегодня, кг" initial=${cur ? cur.kg : ""} onClose=${() => setEditW(false)} onOk=${(v) => L.logWeight(dayKey(), v)} />`}
    ${edit && html`<${NumberDialog} title=${edit.title} initial=${edit.v} onClose=${() => setEdit(null)} onOk=${edit.apply} />`}`;
}
