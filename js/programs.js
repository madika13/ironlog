// Встроенные программы веб-версии. Каждая запись применяется один раз (по version).
// Личные программы сюда не кладём: репозиторий публичный. Их загружают файлом-пакетом
// (Настройки → «Загрузить из файла», формат { kind: "ironlog-programs", exercises, programs }).
const PER_SIDE = ["боковая планка", "паллоф", "грушевидн", "птица-собака", "ракушка", "одной рукой", "каждую руку", "гантели с упором", "выпады", "наружная ротация"];
export const isPerSideName = (name) => PER_SIDE.some((w) => name.toLowerCase().includes(w));

export const WEB_SEEDS = [
  // v1: упражнения «на каждую сторону» — таймер со сменой стороны, повторы на сторону
  { version: 1, apply(d) { d.exercises.forEach((e) => { if (isPerSideName(e.name)) e.perSide = true; }); } },
];
