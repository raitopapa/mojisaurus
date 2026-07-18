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

// ===== BGM（合成音・シーン別ループ。音源ファイル不要）=====
// setBgmTrack(name) でトラック切替（曲中でも次の拍から自然に切り替わる）。
// 各トラック: beat=1拍の秒数, bars=4小節（bass基音＋拍ごとのメロディ）, drums=キック/ハット, stab=裏拍の和音スタブ(ポップ感)。
let _bgmWanted = false, _bgmTimer = null, _bgmNextTime = 0, _bgmStep = 0, _bgmTrack = 'home';
const _BGM_TRACKS = {
  // ホーム：やさしい C-G-Am-F（従来曲）
  home: { beat: 0.5, drums: false, stab: false, mvol: 0.06, bars: [
    { bass: 130.81, mel: [523.25, 659.25, 783.99] },
    { bass: 196.00, mel: [587.33, 783.99, 587.33] },
    { bass: 220.00, mel: [523.25, 659.25, 880.00] },
    { bass: 174.61, mel: [698.46, 523.25, 659.25] },
  ] },
  // タイトル：あかるいファンファーレ調
  title: { beat: 0.42, drums: true, stab: false, mvol: 0.07, bars: [
    { bass: 174.61, mel: [698.46, 880.00, 1046.5, 880.00] },
    { bass: 196.00, mel: [783.99, 987.77, 1174.7, 987.77] },
    { bass: 130.81, mel: [1046.5, 783.99, 659.25, 783.99] },
    { bass: 196.00, mel: [987.77, 1174.7, 1568.0, 1174.7] },
  ] },
  // かく（W1）：おちついた集中系
  focus: { beat: 0.62, drums: false, stab: false, mvol: 0.05, bars: [
    { bass: 146.83, mel: [587.33, 698.46] },
    { bass: 110.00, mel: [440.00, 523.25] },
    { bass: 174.61, mel: [698.46, 880.00] },
    { bass: 130.81, mel: [523.25, 659.25] },
  ] },
  // ことばあそび系（しりとり/なかま/もじならべ）：はずむポップ
  pop: { beat: 0.30, drums: true, stab: true, mvol: 0.065, bars: [
    { bass: 130.81, mel: [523.25, 659.25, 783.99, 659.25] },
    { bass: 174.61, mel: [698.46, 880.00, 1046.5, 880.00] },
    { bass: 196.00, mel: [783.99, 987.77, 783.99, 587.33] },
    { bass: 220.00, mel: [880.00, 659.25, 523.25, 659.25] },
  ] },
  // もじめいろ：わくわく冒険（短調寄り）
  adventure: { beat: 0.36, drums: true, stab: false, mvol: 0.06, bars: [
    { bass: 110.00, mel: [440.00, 523.25, 659.25, 523.25] },
    { bass:  98.00, mel: [392.00, 493.88, 587.33, 493.88] },
    { bass: 130.81, mel: [523.25, 622.25, 783.99, 622.25] },
    { bass: 146.83, mel: [587.33, 440.00, 349.23, 440.00] },
  ] },
};

function _bgmNote(freq, t0, dur, vol, type) {
  const osc = AC.createOscillator(), g = AC.createGain();
  osc.type = type || 'triangle';
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(bgmGain); osc.start(t0); osc.stop(t0 + dur + 0.05);
}

// キック：サイン波の急降下（150→45Hz）。ポップ/冒険トラックの土台。
function _bgmKick(t0) {
  const osc = AC.createOscillator(), g = AC.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t0);
  osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.11);
  g.gain.setValueAtTime(0.22, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
  osc.connect(g); g.connect(bgmGain); osc.start(t0); osc.stop(t0 + 0.16);
}

// ハット：短いノイズ（バッファは初回生成して使い回し）
let _noiseBuf = null;
function _bgmHat(t0, vol) {
  try {
    if (!_noiseBuf) {
      const len = Math.max(1, Math.floor(AC.sampleRate * 0.05));
      _noiseBuf = AC.createBuffer(1, len, AC.sampleRate);
      const ch = _noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    }
    const src = AC.createBufferSource(); src.buffer = _noiseBuf;
    const g = AC.createGain();
    g.gain.setValueAtTime(vol || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    src.connect(g); g.connect(bgmGain); src.start(t0); src.stop(t0 + 0.06);
  } catch (_) {}
}

// 先読みスケジューラ：タイマーで少し先の音を予約し続ける（タブが裏でも破綻しにくい）
function _bgmSchedule() {
  if (!audioReady || !_bgmWanted) return;
  const ahead = 0.7;
  while (_bgmNextTime < AC.currentTime + ahead) {
    const tr = _BGM_TRACKS[_bgmTrack] || _BGM_TRACKS.home;
    const BEAT = tr.beat;
    const bar = tr.bars[Math.floor(_bgmStep / 4) % tr.bars.length];
    const beatInBar = _bgmStep % 4;
    if (beatInBar === 0) _bgmNote(bar.bass, _bgmNextTime, BEAT * 3.6, 0.15, 'triangle');
    if (beatInBar === 0 || beatInBar === 2) _bgmNote(bar.bass * 2, _bgmNextTime, BEAT * 0.9, 0.045, 'sine');
    // メロディ：拍ごと（トラックのmel配列を循環）
    const note = bar.mel[beatInBar % bar.mel.length];
    if (note) _bgmNote(note, _bgmNextTime, BEAT * 1.05, tr.mvol, 'triangle');
    // 裏拍スタブ（ポップ）：和音の5度/オクターブを裏で短く
    if (tr.stab) {
      _bgmNote(bar.bass * 3, _bgmNextTime + BEAT * 0.5, BEAT * 0.28, 0.035, 'square');
      _bgmNote(bar.bass * 4, _bgmNextTime + BEAT * 0.5, BEAT * 0.28, 0.025, 'square');
    }
    // ドラム
    if (tr.drums) {
      if (beatInBar === 0 || beatInBar === 2) _bgmKick(_bgmNextTime);
      _bgmHat(_bgmNextTime + (tr.stab ? BEAT * 0.5 : 0), 0.045);
    }
    _bgmNextTime += BEAT;
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
// トラック切替：曲中でも次の拍から新トラックに（stepを0に戻し小節頭から）
function setBgmTrack(name) { if (_BGM_TRACKS[name] && _bgmTrack !== name) { _bgmTrack = name; _bgmStep = 0; } }

export { initAudioOnce, toggleMute, isMuted, setSfxVolume, sfxTap, sfxCorrect, sfxWrong, sfxSparkle, sfxHatch, startBgm, stopBgm, isBgmOn, setBgmVolume, getBgmVolume, setBgmTrack };
