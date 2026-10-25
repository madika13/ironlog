import { useState, useEffect } from "./vendor/hooks.module.js";
import { useStore, state } from "./store.js";
import { html, render, Icon } from "./ui.js";
import { TrainTab } from "./screens/train.js";
import { FoodTab } from "./screens/food.js";
import { LibraryTab } from "./screens/library.js";
import { StatsTab } from "./screens/stats.js";
import { SettingsScreen } from "./screens/settings.js";

const TABS = [
  ["train", "Тренировка", "gym"],
  ["food", "Питание", "food"],
  ["library", "Справочник", "book"],
  ["stats", "Аналитика", "chart"],
];

// реальная высота экрана: на iPhone в режиме «На экран Домой» vh/% врут, а innerHeight — нет
function syncHeight() { document.documentElement.style.setProperty("--app-h", window.innerHeight + "px"); }
syncHeight();
window.addEventListener("resize", syncHeight);
window.addEventListener("orientationchange", () => setTimeout(syncHeight, 300));

// не даём экрану гаснуть во время тренировки
let lock = null;
async function syncWakeLock() {
  const want = !!state.active && state.keepScreenOn && document.visibilityState === "visible";
  try {
    if (want && !lock && "wakeLock" in navigator) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => { lock = null; }); }
    if (!want && lock) { await lock.release(); lock = null; }
  } catch (_) {}
}
document.addEventListener("visibilitychange", syncWakeLock);

function App() {
  useStore();
  const [tab, setTab] = useState(() => sessionStorage.getItem("tab") || "train");
  const [settings, setSettings] = useState(false);
  useEffect(() => { syncWakeLock(); });
  useEffect(() => { try { sessionStorage.setItem("tab", tab); } catch (_) {} }, [tab]);
  let body;
  if (settings) body = html`<${SettingsScreen} onBack=${() => setSettings(false)} />`;
  else if (tab === "train") body = html`<${TrainTab} onSettings=${() => setSettings(true)} />`;
  else if (tab === "food") body = html`<${FoodTab} />`;
  else if (tab === "library") body = html`<${LibraryTab} />`;
  else body = html`<${StatsTab} />`;
  return html`
    <div class="col" style=${{ flex: 1, minHeight: 0 }} key=${settings ? "settings" : tab}>${body}</div>
    <nav class="tabbar"><div>${TABS.map(([id, title, icon]) => html`
      <button class=${tab === id && !settings ? "on" : ""} onClick=${() => { setTab(id); setSettings(false); }}>
        <${Icon} n=${icon} />${title}${id === "train" && state.active && html`<span class="badge-dot"></span>`}
      </button>`)}</div></nav>`;
}

render(html`<${App} />`, document.getElementById("app"));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
