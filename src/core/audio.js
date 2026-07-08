// core/audio.js — Web Audio による効果音・音声アンロック。外部依存なし・自己完結（dash と同型）。
// 音声アンロック：iOS/Safari は初回ユーザー操作まで音が出ない。initAudioOnce() を最初のタップで呼ぶ。

let AC = null, master = null, sfxGain = null, audioReady = false, muted = false, sfxVolume = 0.8;

function initAudioOnce() {
  if (audioReady) { if (AC && AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = AC.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(AC.destination);
  sfxGain = AC.createGain(); sfxGain.gain.value = sfxVolume; sfxGain.connect(master);
  audioReady = true;
  // 無音を一発鳴らしてアンロックを確実に
  try { const b = AC.createBufferSource(); b.buffer = AC.createBuffer(1, 1, AC.sampleRate); b.connect(master); b.start(0); } catch (_) {}
}

function blip(o) {
  if (!audioReady) return;
  const t0 = AC.currentTime + (o.when || 0), dur = o.dur || 0.1;
  const osc = AC.createOscillator(), g = AC.createGain();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(o.f0 || 440, t0);
  if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0 + dur + 0.03);
}
function seq(notes, type, vol) { let w = 0; for (const n of notes) { blip({ type: type || 'square', f0: n[0], f1: n[0], dur: n[1] * 0.92, vol: vol || 0.26, when: w }); w += n[1]; } }

// 共通演出音（仕様§4）
const sfxTap = () => blip({ type: 'square', f0: 520, f1: 660, dur: 0.07, vol: 0.18 });     // ボタン
const sfxCorrect = () => seq([[784, 0.09], [1047, 0.16]], 'square', 0.26);                  // ピンポン♪
const sfxWrong = () => blip({ type: 'square', f0: 300, f1: 220, dur: 0.12, vol: 0.16 });    // 控えめ「ん?」
const sfxSparkle = () => seq([[1047, 0.05], [1319, 0.05], [1568, 0.1]], 'triangle', 0.2);   // キラキラ
const sfxHatch = () => seq([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.22]], 'square', 0.26); // 孵化

function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.9; return muted; }
function isMuted() { return muted; }
function setSfxVolume(v) { sfxVolume = Math.max(0, Math.min(1, v)); if (sfxGain) sfxGain.gain.value = sfxVolume; }

export { initAudioOnce, toggleMute, isMuted, setSfxVolume, sfxTap, sfxCorrect, sfxWrong, sfxSparkle, sfxHatch };
