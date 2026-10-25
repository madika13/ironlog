// Общие компоненты и форматирование.
import { h, render } from "./vendor/preact.module.js";
import { useEffect, useState, useRef } from "./vendor/hooks.module.js";
import htm from "./vendor/htm.module.js";

export const html = htm.bind(h);
export { render };

export const C = { lime: "#C6FF00", cyan: "#00E5FF", pink: "#FF2E88", violet: "#B388FF", text: "#F2F2F2", muted: "#8C8C8C", faint: "#4A4A4A", surface2: "#1B1B1B", stroke: "#262626" };

// ---------- форматирование ----------
const ru = (v, d) => v.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtWeight = (w) => (w % 1 === 0 ? String(w) : ru(w, 1));
export const fmtNum = (v, d = 1) => (v % 1 === 0 && d <= 1 ? String(v) : ru(v, d));
export const fmtBig = (v) => Math.round(v).toLocaleString("ru-RU");
export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
export const fmtRest = (sec) => (sec % 60 === 0 ? `${sec / 60} мин` : fmtClock(sec));
export const weightLabel = (w) => (w === 0 ? "свой вес" : `${fmtWeight(w)} кг`);
export const fitSize = (t, base) => (t.length <= 2 ? base : t.length === 3 ? base * 0.85 : t.length === 4 ? base * 0.72 : base * 0.62);
export const TYPE = { FULL_BODY: "Фулбади", SPLIT: "Сплит" };
export const WARM = { RUN: "Бег", BIKE: "Вело", NONE: "Без разминки" };
export const SLOT = { BREAKFAST: "Завтрак", LUNCH: "Обед", SNACK: "Перекус", DINNER: "Ужин" };
export const typeColor = (t) => (t === "FULL_BODY" ? C.lime : C.cyan);
export const warmColor = (k) => (k === "BIKE" ? C.cyan : C.lime);
export const slotColor = (s) => ({ BREAKFAST: C.lime, LUNCH: C.cyan, SNACK: C.pink, DINNER: C.violet })[s];
export const MUSCLES = ["Грудь", "Спина", "Ноги", "Ягодицы", "Плечи", "Бицепс", "Трицепс", "Предплечья", "Пресс", "Кардио"];

export function useNow(ms = 200) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setT(Date.now()), ms); return () => clearInterval(i); }, [ms]);
  return t;
}

// ---------- иконки (Material) ----------
const P = {
  play: "M8 5v14l11-7z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  remove: "M19 13H5v-2h14v2z",
  flag: "M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  left: "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  right: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  up: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
  down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
  search: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  shuffle: "M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z",
  refresh: "M17.65 6.35A7.96 7.96 0 0012 4a8 8 0 108 8h-2a6 6 0 11-1.76-4.24L13 11h7V4l-2.35 2.35z",
  pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
  stop: "M6 6h12v12H6z",
  timer: "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0012 4a9 9 0 109 9c0-2.12-.74-4.07-1.97-5.61zM12 20a7 7 0 110-14 7 7 0 010 14z",
  gym: "M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z",
  food: "M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",
  book: "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z",
  chart: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
  settings: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
  run: "M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z",
  bike: "M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z",
  sun: "M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5a6 6 0 100 12 6 6 0 000-12zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z",
  upload: "M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z",
};
export const Icon = ({ n, size, color }) =>
  html`<svg viewBox="0 0 24 24" width=${size} height=${size} fill=${color || "currentColor"} aria-hidden="true"><path d=${P[n]} /></svg>`;

// ---------- кнопки и карточки ----------
export const NeonButton = ({ text, onClick, disabled, color = C.lime, icon, height = 64, size = 15 }) => html`
  <button class="btn" disabled=${disabled} onClick=${onClick}
    style=${{ background: disabled ? undefined : color, "--c": color, height: height + "px", fontSize: size + "px", boxShadow: disabled ? "none" : `0 0 22px ${color}8c` }}>
    ${icon && html`<${Icon} n=${icon} />`}${text}
  </button>`;

export const GhostButton = ({ text, onClick, color = C.text, icon, height = 52, grow, style }) => html`
  <button class="ghost" onClick=${onClick} style=${{ color, height: height + "px", flex: grow ? 1 : undefined, ...style }}>
    ${icon && html`<${Icon} n=${icon} />`}<span class="ellipsis">${text}</span>
  </button>`;

export const RoundIcon = ({ n, onClick, size = 40, color = C.lime }) => html`
  <button class="round" onClick=${onClick} style=${{ width: size + "px", height: size + "px", color }}><${Icon} n=${n} /></button>`;

export const Card = ({ children, onClick, accent, p14, style, class: cls = "" }) => html`
  <div class=${`card ${onClick ? "tap" : ""} ${accent ? "accent" : ""} ${p14 ? "p14" : ""} ${cls}`}
       style=${{ "--acc": accent, ...style }} onClick=${onClick}>${children}</div>`;

export const Label = ({ children, color, style }) => html`<div class="label" style=${{ color, ...style }}>${children}</div>`;
export const Title = ({ children, style }) => html`<h1 class="title" style=${style}>${children}</h1>`;
export const Badge = ({ text, color }) => html`<span class="badge" style=${{ color }}>${text}</span>`;

export const Segmented = ({ options, selected, onSelect }) => html`
  <div class="seg">${options.map((o, i) => html`<button class=${i === selected ? "on" : ""} onClick=${() => onSelect(i)}>${o}</button>`)}</div>`;

export const Chip = ({ text, on, onClick, color }) => html`
  <button class=${`chip ${on ? "on" : ""}`} style=${{ "--c": color }} onClick=${onClick}>${text}</button>`;

/** Счётчик: большой — «− число +», компактный — число сверху, кнопки снизу. */
export const Stepper = ({ label, value, unit, onMinus, onPlus, onEdit, big = true }) => html`
  <div class="stepper grow" style=${{ padding: big ? "12px 8px" : "10px 8px" }}>
    <div class="label ellipsis" style=${{ maxWidth: "100%" }}>${label}</div>
    ${big
      ? html`<div class="row mt8">
          <${RoundIcon} n="remove" onClick=${onMinus} />
          <div class="grow col center" onClick=${onEdit}>
            <span class="val" style=${{ fontSize: fitSize(value, 28) + "px" }}>${value}</span>
            ${unit && html`<span class="xs muted">${unit}</span>`}
          </div>
          <${RoundIcon} n="add" onClick=${onPlus} />
        </div>`
      : html`<div class="row" style=${{ justifyContent: "center", padding: "6px 0", alignItems: "baseline", gap: "3px" }} onClick=${onEdit}>
            <span class="val" style=${{ fontSize: fitSize(value, 22) + "px" }}>${value}</span>${unit && html`<span class="xs muted">${unit}</span>`}
          </div>
          <div class="row" style=${{ justifyContent: "space-evenly" }}>
            <${RoundIcon} n="remove" onClick=${onMinus} size=${34} /><${RoundIcon} n="add" onClick=${onPlus} size=${34} />
          </div>`}
  </div>`;

export const StatTile = ({ label, value, unit, color = C.lime }) => html`
  <div class="tile grow">
    <div class="dot" style=${{ "--c": color }}></div>
    <div class="row mt12" style=${{ alignItems: "baseline", gap: "4px" }}><span class="v">${value}</span><span class="small muted">${unit}</span></div>
    <div class="small muted ellipsis">${label}</div>
  </div>`;

export const MacroBar = ({ label, v, goal, color }) => html`
  <div><div class="row small"><span class="grow muted">${label}</span><b>${v} / ${goal} г</b></div>
  <div class="bar mt4"><div style=${{ width: Math.min(100, (v / Math.max(goal, 1)) * 100) + "%", "--c": color }}></div></div></div>`;

/** Кольцо с делениями и свечением. */
export function Ring({ progress, size = 290, color = C.lime, pulse, children }) {
  const p = Math.max(0, Math.min(1, progress || 0));
  const stroke = size * 0.048, r = size / 2 - stroke - size * 0.05, c = size / 2, L = 2 * Math.PI * r;
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 - 90) * (Math.PI / 180), major = i % 5 === 0;
    const r1 = r + stroke / 2 + size * 0.02, r2 = r1 + size * (major ? 0.028 : 0.014);
    ticks.push(html`<line x1=${c + r1 * Math.cos(a)} y1=${c + r1 * Math.sin(a)} x2=${c + r2 * Math.cos(a)} y2=${c + r2 * Math.sin(a)}
      stroke=${i / 60 <= p ? color : C.stroke} stroke-opacity=${i / 60 <= p ? 0.55 : 1} stroke-width=${major ? 2.5 : 1.5} stroke-linecap="round" />`);
  }
  return html`<div class="ring-wrap" style=${{ width: size + "px", height: size + "px" }}>
    <svg viewBox=${`0 0 ${size} ${size}`}>
      ${ticks}
      <circle cx=${c} cy=${c} r=${r} fill="none" stroke=${C.surface2} stroke-width=${stroke} />
      ${p > 0.002 && html`<circle cx=${c} cy=${c} r=${r} fill="none" stroke=${color} stroke-width=${stroke} stroke-linecap="round"
        stroke-dasharray=${`${L * p} ${L}`} transform=${`rotate(-90 ${c} ${c})`}
        style=${{ filter: `drop-shadow(0 0 ${size * 0.04}px ${color})`, transition: "stroke-dasharray .25s", animation: pulse ? "pulse .7s ease-in-out infinite alternate" : "none" }} />`}
    </svg>
    <div class="inner">${children}</div>
  </div>`;
}

// ---------- графики ----------
export function BarChart({ values, labels, colors, color = C.lime, fmt = (v) => fmtNum(v), height = 170 }) {
  const W = 320, H = height, top = 22, bottom = 18, ch = H - top - bottom;
  const n = values.length; if (!n) return null;
  const max = Math.max(...values, 1e-6), slot = W / n, bw = Math.min(slot * 0.56, 26);
  const every = Math.max(1, Math.floor((n + 5) / 6));
  return html`<svg class="chart" viewBox=${`0 0 ${W} ${H}`} style=${{ height: H + "px" }}>
    ${[0, 1, 2, 3].map((i) => html`<line x1="0" x2=${W} y1=${top + (ch * i) / 3} y2=${top + (ch * i) / 3} stroke=${C.stroke} stroke-dasharray="3 4" />`)}
    ${values.map((v, i) => {
      const c = colors?.[i] || color, h = (v / max) * ch, x = slot * i + (slot - bw) / 2, y = top + ch - h, last = i === n - 1;
      return html`<g>
        <rect x=${x} y=${y} width=${bw} height=${Math.max(h, 0.1)} rx="7" fill=${c} fill-opacity=${last ? 1 : 0.4}
          style=${last ? { filter: `drop-shadow(0 0 7px ${c})` } : null} />
        ${last && html`<text x=${x + bw / 2} y=${y - 6} text-anchor="middle" style=${{ fill: c }}>${fmt(v)}</text>`}
        ${(i % every === 0 || last) && html`<text x=${x + bw / 2} y=${H - 3} text-anchor="middle">${labels[i]}</text>`}
      </g>`;
    })}
  </svg>`;
}

export function LineChart({ values, labels, color = C.lime, fmt = (v) => fmtNum(v), height = 190 }) {
  const W = 320, H = height, top = 24, bottom = 18, side = 10, ch = H - top - bottom;
  const n = values.length; if (!n) return null;
  const maxV = Math.max(...values), minV = Math.min(...values);
  const span = maxV - minV < 1e-6 ? Math.max(1, maxV * 0.2) : maxV - minV;
  const lo = minV - span * 0.25, hi = maxV + span * 0.25;
  const px = (i) => (n === 1 ? W / 2 : side + ((W - 2 * side) * i) / (n - 1));
  const py = (v) => top + ch - ((v - lo) / (hi - lo)) * ch;
  const pts = values.map((v, i) => [px(i), py(v)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < n; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
  const fill = `${d} L${pts[n - 1][0]},${top + ch} L${pts[0][0]},${top + ch} Z`;
  const gid = "g" + Math.random().toString(36).slice(2, 8);
  const maxI = values.indexOf(maxV), lastI = n - 1, every = Math.max(1, Math.floor((n + 4) / 5));
  return html`<svg class="chart" viewBox=${`0 0 ${W} ${H}`} style=${{ height: H + "px" }}>
    <defs><linearGradient id=${gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color=${color} stop-opacity=".35" /><stop offset="1" stop-color=${color} stop-opacity="0" /></linearGradient></defs>
    ${[0, 1, 2, 3].map((i) => html`<line x1="0" x2=${W} y1=${top + (ch * i) / 3} y2=${top + (ch * i) / 3} stroke=${C.stroke} stroke-dasharray="3 4" />`)}
    <path d=${fill} fill=${`url(#${gid})`} />
    <path d=${d} fill="none" stroke=${color} stroke-width="3" stroke-linecap="round" style=${{ filter: `drop-shadow(0 0 6px ${color})` }} />
    ${pts.map(([x, y], i) => html`<circle cx=${x} cy=${y} r=${i === lastI ? 5 : 3} fill=${color} stroke="#0A0A0A" stroke-width="2" />`)}
    ${[...new Set([maxI, lastI])].map((i) => html`<text x=${pts[i][0]} y=${pts[i][1] - 10} text-anchor="middle" style=${{ fill: i === lastI ? color : C.text }}>${fmt(values[i])}</text>`)}
    ${values.map((_, i) => (i % every === 0 || i === lastI) && html`<text x=${pts[i][0]} y=${H - 3} text-anchor="middle">${labels[i]}</text>`)}
  </svg>`;
}

// ---------- диалоги ----------
export const Dialog = ({ title, children, actions, onClose }) => html`
  <div class="overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
    <div class="dialog fadein">${title && html`<h3>${title}</h3>`}${children}<div class="actions">${actions}</div></div>
  </div>`;

export const Act = ({ text, onClick, color = C.lime, disabled }) => html`
  <button onClick=${onClick} disabled=${disabled} style=${{ color: disabled ? C.faint : color }}>${text}</button>`;

export function NumberDialog({ title, initial, decimal = true, onClose, onOk }) {
  const [v, setV] = useState(String(initial ?? ""));
  const ref = useRef();
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);
  const ok = () => { const n = parseFloat(v.replace(",", ".")); if (!isNaN(n)) onOk(n); onClose(); };
  return html`<${Dialog} title=${title} onClose=${onClose} actions=${html`<${Act} text="Отмена" color=${C.muted} onClick=${onClose} /><${Act} text="ОК" onClick=${ok} />`}>
    <input ref=${ref} class="input big" value=${v} inputmode=${decimal ? "decimal" : "numeric"}
      onInput=${(e) => setV(e.target.value)} onKeyDown=${(e) => e.key === "Enter" && ok()} />
  </${Dialog}>`;
}

export const ConfirmDialog = ({ title, text, confirm, danger, onClose, onOk }) => html`
  <${Dialog} title=${title} onClose=${onClose}
    actions=${html`<${Act} text="Отмена" color=${C.muted} onClick=${onClose} /><${Act} text=${confirm} color=${danger ? C.pink : C.lime} onClick=${() => { onOk(); onClose(); }} />`}>
    <div class="muted">${text}</div>
  </${Dialog}>`;

export const Sheet = ({ children, onClose }) => html`
  <div class="sheet-wrap" onClick=${(e) => e.target === e.currentTarget && onClose()}>
    <div class="sheet"><div class="grip"></div>${children}</div>
  </div>`;

let toastTimer;
export function toast(text) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

/** Поиск по справочнику упражнений, сгруппированный по мышцам. */
export function ExercisePicker({ exercises, onPick, onClose }) {
  const [q, setQ] = useState("");
  const list = exercises.filter((e) => !q.trim() || e.name.toLowerCase().includes(q.trim().toLowerCase()));
  const groups = [...new Set(list.map((e) => e.muscle))];
  return html`<${Sheet} onClose=${onClose}>
    <input class="input" placeholder="Поиск упражнения" value=${q} onInput=${(e) => setQ(e.target.value)} />
    ${groups.map((m) => html`<div>
      <${Label} color=${C.lime} style=${{ margin: "16px 0 4px" }}>${m}</${Label}>
      ${list.filter((e) => e.muscle === m).map((e) => html`<div class="semibold" style=${{ padding: "12px 0", fontSize: "16px" }} onClick=${() => onPick(e.id)}>${e.name}</div>`)}
    </div>`)}
  </${Sheet}>`;
}
