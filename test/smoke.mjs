// test/smoke.mjs — ヘッドレス起動テスト（ブラウザ不要）。
//   Part A: dev の ES モジュールを実際に import して起動し、title→(タップ)→home→(タップ)→lesson→(もどる)→home を検証。
//   Part B: ビルド済み index.html の IIFE を DOM/Canvas/Audio/Speech スタブ下で実行し、起動＋タップで無例外を確認。
// exit 0 = green。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
let failures = 0;
const ok = (c, m) => { if (c) console.log('  \u2713', m); else { console.error('  \u2717', m); failures++; } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------------- 環境スタブ ---------------- */
function makeEnv() {
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(t, p) {
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern') return () => grad;
      if (p === 'measureText') return () => ({ width: 10 });
      return (t[p] !== undefined) ? t[p] : () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
  const els = {};
  function makeEl(id) {
    const L = {};
    return {
      id, width: 0, height: 0, style: {}, clientWidth: 960, clientHeight: 540, parentElement: null,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
      set textContent(_v) {}, get textContent() { return ''; },
      getContext() { return ctx; },
      getBoundingClientRect() { return { left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight, width: this.clientWidth, height: this.clientHeight }; },
      setPointerCapture() {}, releasePointerCapture() {},
      requestFullscreen() { return Promise.resolve(); }, webkitRequestFullscreen() {},
      addEventListener(type, fn) { (L[type] || (L[type] = [])).push(fn); },
      removeEventListener(type, fn) { const a = L[type]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
      _emit(type, evt) { (L[type] || []).slice().forEach(fn => fn(evt)); },
    };
  }
  const document = {
    fullscreenElement: null, exitFullscreen() {},
    getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
    addEventListener() {}, removeEventListener() {}, createElement() { return makeEl('x'); },
  };
  // rAF はキュー式（step で決定的に進める）
  const rafQ = []; let rafT = 0;
  const requestAnimationFrame = (cb) => { rafQ.push(cb); return rafQ.length; };
  const step = (n = 1, dtMs = 16) => { for (let i = 0; i < n; i++) { const cb = rafQ.shift(); if (cb) { rafT += dtMs; cb(rafT); } } };

  function AudioContext() {
    const node = () => ({ gain: { value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, type: '', connect() {}, start() {}, stop() {} });
    return { currentTime: 0, sampleRate: 44100, state: 'running', destination: {}, resume() { this.state = 'running'; return Promise.resolve(); },
      createGain: node, createOscillator: node, createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }), createBuffer: () => ({ getChannelData: () => new Float32Array(1) }), createBiquadFilter: () => ({ type: '', frequency: { value: 0 }, connect() {} }) };
  }
  const speechSynthesis = { getVoices: () => [{ lang: 'ja-JP', name: 'Kyoko' }], speak() {}, cancel() {}, onvoiceschanged: null };
  function SpeechSynthesisUtterance(text) { this.text = text; this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; }
  function ResizeObserver() { return { observe() {}, disconnect() {}, unobserve() {} }; }
  const store = new Map();
  const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
  const window = { devicePixelRatio: 1, AudioContext, webkitAudioContext: AudioContext, requestAnimationFrame, speechSynthesis, SpeechSynthesisUtterance, ResizeObserver, localStorage,
    addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }), setTimeout, clearTimeout };
  window.window = window;
  return { document, window, requestAnimationFrame, speechSynthesis, SpeechSynthesisUtterance, ResizeObserver, localStorage, AudioContext, step, els, ctx };
}

const pd = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, preventDefault() {}, button: 0 });
const tap = (canvas, x, y) => { canvas._emit('pointerdown', pd(x, y)); canvas._emit('pointerup', pd(x, y)); };

/* ---------------- Part A: dev モジュール ---------------- */
async function partA() {
  console.log('Part A — dev ES modules boot & navigation');
  const env = makeEnv();
  Object.assign(globalThis, {
    document: env.document, window: env.window, requestAnimationFrame: env.requestAnimationFrame,
    speechSynthesis: env.speechSynthesis, SpeechSynthesisUtterance: env.SpeechSynthesisUtterance,
    ResizeObserver: env.ResizeObserver, localStorage: env.localStorage,
    AudioContext: env.AudioContext, webkitAudioContext: env.AudioContext,
    devicePixelRatio: 1, matchMedia: env.window.matchMedia,
  });
  let booted = true;
  try { await import(new URL('../src/main.js', import.meta.url).href); }
  catch (e) { booted = false; console.error(e); }
  ok(booted, 'main.js が例外なく起動');

  const { scenes } = await import(new URL('../src/core/scene-manager.js', import.meta.url).href);
  ok(scenes.currentName === 'title', `起動シーンが title（実際: ${scenes.currentName}）`);

  let threw = false;
  try { env.step(3); } catch (e) { threw = true; console.error(e); }
  ok(!threw, 'title の update/render が無例外（3フレーム）');

  const canvas = env.els['game'];
  tap(canvas, 120, 120);
  ok(scenes.currentName === 'home', `タップで home へ遷移（実際: ${scenes.currentName}）`);

  let homeThrew = false;
  try { env.step(2); } catch (e) { homeThrew = true; console.error(e); }
  ok(!homeThrew, 'home の update/render が無例外');

  // --- 星22個ぶんの猶予でスタート：4問(仮データ全4文字)×1星=4星 → 19+4=23 で孵化確定 ---
  const { updateSave, loadSave } = await import(new URL('../src/core/storage.js', import.meta.url).href);
  updateSave({ eggProgress: 19, stars: 0, collection: { dino: [], insect: [], ghost: [] } });

  let home = scenes.current;
  const kakuBtn = home.buttons[0];
  tap(canvas, kakuBtn.x + kakuBtn.w / 2, kakuBtn.y + kakuBtn.h / 2);
  await sleep(180);
  ok(scenes.currentName === 'lesson', `「かく」で lesson へ（実際: ${scenes.currentName}）`);

  let lesson = scenes.current;
  ok(lesson.mode === 'write' && lesson.state === 'playing', `lessonがwriteモードで再生中（mode=${lesson.mode}, state=${lesson.state}）`);
  ok(Array.isArray(lesson.queue) && lesson.queue.length === 4, `出題キューが4問（実際: ${lesson.queue && lesson.queue.length}）`);

  // --- なぞり判定を実際にシミュレートしてW1を全問解く（サンプル4文字＝し・く・こ・い） ---
  console.log('  … W1トレースを' + lesson.queue.length + '問シミュレート中（実時間で数秒かかります）');
  let allStrokesOk = true;
  for (let q = 0; q < lesson.queue.length; q++) {
    const game = lesson.game;
    if (!game || !Array.isArray(game.strokes)) { allStrokesOk = false; break; }
    for (const stroke of game.strokes) {
      const pts = stroke.points;
      canvas._emit('pointerdown', pd(pts[0].x, pts[0].y));
      for (let k = 1; k < pts.length; k++) canvas._emit('pointermove', pd(pts[k].x, pts[k].y));
      canvas._emit('pointerup', pd(pts[pts.length - 1].x, pts[pts.length - 1].y));
    }
    if (!game.isComplete()) { allStrokesOk = false; }
    env.step(2);                    // lesson.update() が isComplete を検知して次問へのタイマーを仕込む
    await sleep(950);               // 900ms後の自動遷移(_advance)を実時間で待つ
    lesson = scenes.current;        // 参照を更新（qIndex/game が変わっている）
  }
  ok(allStrokesOk, 'なぞり判定シミュレートで全問 isComplete() = true');
  ok(lesson.state === 'summary', `全問終了後 summary 状態（実際: ${lesson.state}）`);

  env.step(90); // たまごゲージのイージング収束＋孵化コールバック発火を待つ（フレーム進行）
  const afterSession = loadSave();
  ok(afterSession.stars === 4, `セッション終了でstarsが4に（実際: ${afterSession.stars}）`);
  ok(afterSession.eggProgress === 1, `22個孵化後の残りeggProgressが1（実際: ${afterSession.eggProgress}）`);
  ok((afterSession.collection.dino || []).includes('dino_01'), `孵化でdino_01がcollectionに追加（実際: ${JSON.stringify(afterSession.collection.dino)}）`);
  ok(lesson._revealStage === 'card', `孵化リビール表示状態（実際: ${lesson._revealStage}）`);

  await sleep(1350); // リビール内の1300ms後スナップを待つ
  ok(lesson.egg && lesson.egg.value === 1, `リビール後にゲージ値が最終値1へスナップ（実際: ${lesson.egg && lesson.egg.value}）`);

  const zukanBtn = lesson.zukanBtn;
  tap(canvas, zukanBtn.x + zukanBtn.w / 2, zukanBtn.y + zukanBtn.h / 2);
  await sleep(160); // Button.tapは120ms後にonTapを実行するため待つ
  ok(scenes.currentName === 'zukan', `ずかんへボタンで zukan へ（実際: ${scenes.currentName}）`);

  env.step(2);
  let zukan = scenes.current;
  ok(zukan.tab === 'dino', 'ずかんの既定タブが きょうりゅう(dino)');
  const dinoSlot = (zukan.slots || []).find(s => s.creature.id === 'dino_01');
  ok(!!dinoSlot, 'ずかんグリッドに dino_01 のスロットが存在');
  let zukanThrew = false;
  try { if (dinoSlot) tap(canvas, dinoSlot.x + dinoSlot.w / 2, dinoSlot.y + dinoSlot.h / 2); } catch (e) { zukanThrew = true; console.error(e); }
  ok(!zukanThrew, '取得済みスロットのタップ（名前読み上げ）が無例外');

  tap(canvas, zukan.backBtn.x + zukan.backBtn.w / 2, zukan.backBtn.y + zukan.backBtn.h / 2);
  await sleep(160);
  ok(scenes.currentName === 'home', `ずかんの もどる で home へ（実際: ${scenes.currentName}）`);

  // --- 保護者ゲート：おうちのかた → 誤入力は無視 → 正しい 3→1→5 で解錠 → 設定 → リセット(二重確認) ---
  env.step(2);
  home = scenes.current;
  const parentBtn = home.buttons[4];
  tap(canvas, parentBtn.x + parentBtn.w / 2, parentBtn.y + parentBtn.h / 2);
  await sleep(160);
  ok(scenes.currentName === 'parent', `「おうちのかた」で parent へ（実際: ${scenes.currentName}）`);

  env.step(2);
  let parent = scenes.current;
  const nb = (d) => parent.numButtons[d - 1];
  const pressNum = async (d) => { const b = nb(d); canvas._emit('pointerdown', pd(b.x + b.w / 2, b.y + b.h / 2)); canvas._emit('pointerup', pd(b.x + b.w / 2, b.y + b.h / 2)); await sleep(160); };
  await pressNum(9); // 誤入力
  ok(parent.state === 'gate' && parent.gateProgress.length === 0, '誤入力ではゲートは進まない');
  await pressNum(3); await pressNum(1); await pressNum(5); // 正しい並び
  ok(parent.state === 'panel', `正しい並び(3→1→5)で panel が開く（実際: ${parent.state}）`);
  env.step(2); // パネル側ボタン（resetBtn等）を _renderPanel() でレイアウトさせる

  const resetBeforeSave = loadSave();
  ok(resetBeforeSave.stars === 4, `parentパネルの進捗が反映（stars=${resetBeforeSave.stars}）`);

  const pressBtn = async (btn) => { canvas._emit('pointerdown', pd(btn.x + btn.w / 2, btn.y + btn.h / 2)); canvas._emit('pointerup', pd(btn.x + btn.w / 2, btn.y + btn.h / 2)); await sleep(160); };
  await pressBtn(parent.resetBtn);
  ok(parent._confirming === true, 'リセットボタンで二重確認画面が出る');
  env.step(2); // 確認ダイアログのボタン(resetYes/resetNo)は_confirming時のみレイアウトされるため
  await pressBtn(parent.resetNo);
  ok(parent._confirming === false, 'キャンセルで確認が閉じる（未リセット）');
  ok(loadSave().stars === 4, 'キャンセル後もデータは保持されたまま');

  await pressBtn(parent.resetBtn);
  ok(parent._confirming === true, 'もう一度リセットボタンで二重確認画面が出る');
  env.step(2);
  await pressBtn(parent.resetYes);
  ok(parent._confirming === false, '確定後は確認画面が閉じる');
  const afterReset = loadSave();
  ok(afterReset.stars === 0 && (afterReset.collection.dino || []).length === 0, `二重確認の末リセット完了（stars=${afterReset.stars}）`);

  await pressBtn(parent.backPanel);
  ok(scenes.currentName === 'home', `parentの もどる で home へ（実際: ${scenes.currentName}）`);

}

/* ---------------- Part B: built index.html IIFE ---------------- */
function partB() {
  console.log('Part B — built index.html IIFE under stubs');
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  ok(!!m, 'index.html に IIFE スクリプトが埋め込まれている');
  ok(!html.includes('<!--BUNDLE-->'), '<!--BUNDLE--> マーカーが置換済み');
  if (!m) return;
  const env = makeEnv();
  const sandbox = { document: env.document, window: env.window, console,
    requestAnimationFrame: env.requestAnimationFrame, setTimeout, clearTimeout,
    speechSynthesis: env.speechSynthesis, SpeechSynthesisUtterance: env.SpeechSynthesisUtterance,
    ResizeObserver: env.ResizeObserver, localStorage: env.localStorage,
    AudioContext: env.AudioContext, webkitAudioContext: env.AudioContext, devicePixelRatio: 1, matchMedia: env.window.matchMedia };
  let threw = false;
  try {
    vm.runInNewContext(m[1], sandbox, { timeout: 4000 });
    env.step(3);
    tap(env.els['game'], 120, 120); // title→home
    env.step(3);
  } catch (e) { threw = true; console.error(e); }
  ok(!threw, 'ビルド版の起動＋タップが無例外');
}

/* ---------------- run ---------------- */
(async () => {
  await partA();
  partB();
  console.log(failures === 0 ? '\nSMOKE: GREEN \u2705' : `\nSMOKE: ${failures} FAIL \u274c`);
  process.exit(failures === 0 ? 0 : 1);
})();
