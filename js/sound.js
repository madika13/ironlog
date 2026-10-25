// Звук вместо вибрации (Safari на iPhone не умеет вибрировать). Аудио включается после первого касания.
let ctx = null;
function unlock() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback"; // звучит и в беззвучном режиме (iOS 17+)
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch (_) {}
}
["pointerdown", "touchend", "keydown"].forEach((e) => window.addEventListener(e, unlock, { passive: true }));

function tone(freq, start, dur, vol = 0.25) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sound = {
  tick() { tone(880, 0, 0.08, 0.18); navigator.vibrate?.(35); },
  tap() { tone(660, 0, 0.06, 0.12); navigator.vibrate?.(50); },
  done() { tone(988, 0, 0.18); tone(988, 0.25, 0.18); tone(1319, 0.5, 0.45); navigator.vibrate?.([350, 150, 350, 150, 600]); },
};
