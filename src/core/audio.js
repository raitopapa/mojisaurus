// core/audio.js — Web Audio による効果音・音声アンロック。外部依存なし・自己完結（dash と同型）。
// 音声アンロック：iOS/Safari は初回ユーザー操作まで音が出ない。initAudioOnce() を最初のタップで呼ぶ。

let AC = null, master = null, sfxGain = null, bgmGain = null, audioReady = false, muted = false, sfxVolume = 0.8, bgmVolume = 0.35;

function initAudioOnce() {
  if (audioReady) { if (AC && AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = AC.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(AC.destination);
  sfxGain = AC.createGain(); sfxGain.gain.value = sfxVolume; sfxGain.connect(master);
  bgmGain = AC.createGain(); bgmGain.gain.value = bgmVolume; bgmGain.connect(master);
  audioReady = true;
  // 無音を一発鳴らしてアンロックを確実に
  try { const b = AC.createBufferSource(); b.buffer = AC.createBuffer(1, 1, AC.sampleRate); b.connect(master); b.start(0); } catch (_) {}
  if (_bgmWanted) startBgm();
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

// ===== BGM（合成音・やさしいループ。音源ファイル不要）=====
// C→G→Am→F 進行の4小節を、控えめな三角波のベース＋やわらかいメロディで淡々とループ。
let _bgmWanted = false, _bgmTimer = null, _bgmNextTime = 0, _bgmStep = 0;
const _BEAT = 0.5;  // 1拍の秒数（テンポ ≒ 120bpm だが音は伸ばして眠くならない程度に穏やか）
// 各小節：ベース音(Hz)と、その小節で使うメロディ音の候補
const _BGM_BARS = [
  { bass: 130.81, mel: [523.25, 659.25, 783.99] },  // C
  { bass: 196.00, mel: [587.33, 783.99, 587.33] },  // G
  { bass: 220.00, mel: [523.25, 659.25, 880.00] },  // Am
  { bass: 174.61, mel: [698.46, 523.25, 659.25] },  // F
];

function _bgmNote(freq, t0, dur, vol, type) {
  const osc = AC.createOscillator(), g = AC.createGain();
  osc.type = type || 'triangle';
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(bgmGain); osc.start(t0); osc.stop(t0 + dur + 0.05);
}

// 先読みスケジューラ：タイマーで少し先の音を予約し続ける（タブが裏でも破綻しにくい）
function _bgmSchedule() {
  if (!audioReady || !_bgmWanted) return;
  const ahead = 0.7;
  while (_bgmNextTime < AC.currentTime + ahead) {
    const bar = _BGM_BARS[Math.floor(_bgmStep / 4) % _BGM_BARS.length];
    const beatInBar = _bgmStep % 4;
    if (beatInBar === 0) _bgmNote(bar.bass, _bgmNextTime, _BEAT * 3.6, 0.16, 'triangle');       // ベース（小節頭・長め）
    if (beatInBar === 0 || beatInBar === 2) _bgmNote(bar.bass * 2, _bgmNextTime, _BEAT * 0.9, 0.05, 'sine'); // 薄いオクターブ
    // メロディ（1拍おきに、候補から順に）
    if (beatInBar % 2 === 1) {
      const note = bar.mel[Math.floor(_bgmStep / 2) % bar.mel.length];
      _bgmNote(note, _bgmNextTime, _BEAT * 1.1, 0.06, 'triangle');
    }
    _bgmNextTime += _BEAT;
    _bgmStep++;
  }
  _bgmTimer = setTimeout(_bgmSchedule, 200);
}

function startBgm() {
  _bgmWanted = true;
  if (!audioReady) return;   // アンロック後に initAudioOnce から再度呼ばれる
  if (_bgmTimer) return;     // 既に鳴っている
  _bgmNextTime = AC.currentTime + 0.1; _bgmStep = 0;
  _bgmSchedule();
}
function stopBgm() { _bgmWanted = false; if (_bgmTimer) { clearTimeout(_bgmTimer); _bgmTimer = null; } }
function isBgmOn() { return _bgmWanted; }
function setBgmVolume(v) { bgmVolume = Math.max(0, Math.min(1, v)); if (bgmGain) bgmGain.gain.value = bgmVolume; }
function getBgmVolume() { return bgmVolume; }

export { initAudioOnce, toggleMute, isMuted, setSfxVolume, sfxTap, sfxCorrect, sfxWrong, sfxSparkle, sfxHatch, startBgm, stopBgm, isBgmOn, setBgmVolume, getBgmVolume };
