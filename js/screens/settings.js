import { state, exportJson, replaceState, dayKey } from "../store.js";
import * as L from "../logic.js";
import { useState } from "../vendor/hooks.module.js";
import { html, C, NeonButton, GhostButton, RoundIcon, Card, Badge, Title, ConfirmDialog, toast } from "../ui.js";

/** Сохранить копию: на iPhone открывается меню «Поделиться» → «Сохранить в Файлы» (iCloud Drive). */
async function backup() {
  const name = `ironlog-backup-${dayKey()}.json`;
  const file = new File([exportJson()], name, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast("Файл сохранён в «Загрузки»");
}

export function SettingsScreen({ onBack }) {
  const [pending, setPending] = useState(null);
  const pick = () => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = "application/json,.json";
    i.onchange = async () => { const f = i.files[0]; if (f) setPending(await f.text()); };
    i.click();
  };
  const installed = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  return html`<div class="col" style=${{ flex: 1, minHeight: 0 }}>
    <div class="topbar"><${RoundIcon} n="back" color=${C.text} onClick=${onBack} /><${Title} style=${{ marginLeft: "6px" }}>Настройки</${Title}></div>
    <div class="screen list" style=${{ paddingTop: "8px", gap: "14px" }}>
      ${!installed && html`<${Card} accent=${C.lime}>
        <div class="display" style=${{ fontSize: "16px" }}>Установи на экран «Домой»</div>
        <div class="small muted mt8">В Safari нажми «Поделиться» (квадрат со стрелкой) → «На экран Домой». Так приложение откроется на весь экран, будет работать без интернета, и iPhone не удалит твои данные.</div>
      </${Card}>`}
      <${Card}>
        <div class="display" style=${{ fontSize: "16px" }}>Резервная копия</div>
        <div class="small muted" style=${{ margin: "4px 0 14px" }}>Все тренировки, программы, питание и вес — в одном файле. Нажми «Сохранить копию» → «Сохранить в Файлы» → iCloud Drive. Делай раз в неделю.</div>
        <${NeonButton} text="Сохранить копию" icon="upload" height=${54} size=${13} onClick=${backup} />
        <div class="mt12"><${GhostButton} text="Восстановить из файла" icon="refresh" style=${{ width: "100%" }} onClick=${pick} /></div>
      </${Card}>
      <${Card} onClick=${L.toggleKeepScreen}>
        <div class="row"><div class="grow"><div class="bold">Не гасить экран на тренировке</div><div class="small muted">Чтобы таймер отдыха всегда звенел вовремя</div></div>
          <${Badge} text=${state.keepScreenOn ? "вкл" : "выкл"} color=${state.keepScreenOn ? C.lime : C.faint} /></div>
      </${Card}>
      <${Card}>
        <div class="bold">Звук таймера</div>
        <div class="small muted mt4">В конце отдыха — сигнал, за 3 секунды — короткие щелчки. Если не слышно, проверь громкость и что приложение не свёрнуто.</div>
      </${Card}>
      <div class="small faint">IronLog web · данные хранятся только на этом телефоне</div>
    </div>
    ${pending && html`<${ConfirmDialog} title="Восстановить?" text="Текущие данные заменятся данными из файла." confirm="Восстановить" danger
      onClose=${() => setPending(null)} onOk=${() => { try { replaceState(JSON.parse(pending)); toast("Данные восстановлены"); } catch (e) { toast("Файл не подходит"); } }} />`}
  </div>`;
}
