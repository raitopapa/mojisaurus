// scenes/lesson.js — レッスン司会。「かく」(write→ひらがな)・「カタカナ・とくべつ」(katakana)でW1を実行。
// 出題は「まだ練習が少ない字」を優先しつつランダム性を持たせて選ぶ（mastery.seenを軽い進捗指標として使用）。
// 正解ごとに星を集計 → セッション終了時にまとめてstorageへ確定。「ことばあそび」は次バッチ。
// reward.js（本格な孵化演出シーン）は次バッチで切り出す想定。今回は孵化処理をここに簡易実装する。
import { COLORS, SCENE, STARS_PER_EGG } from '../core/constants.js';
import { view, ctx, fillBg, label, rrPath } from '../core/canvas.js';
import { scenes } from '../core/scene-manager.js';
import { sfxTap, sfxSparkle, sfxCorrect, sfxWrong, sfxHatch, setBgmTrack } from '../core/audio.js';
import { speak } from '../core/speech.js';
import { loadSave, updateSave } from '../core/storage.js';
import { Button } from '../ui/button.js';
import { Gao } from '../ui/gao.js';
import { EggGauge } from '../ui/egg-gauge.js';
import { StarField } from '../ui/star-fx.js';
import { W1NazoriHira } from '../games/w1-nazori-hira.js';
import { L1Shiritori } from '../games/l1-shiritori.js';
import { L2Nakama } from '../games/l2-nakama.js';
import { G1Anagram } from '../games/g1-anagram.js';
import { G2Maze } from '../games/g2-maze.js';
import { KANA_DATA } from '../data/kana-data.js';
import { SAMPLE_CREATURES, CATEGORY_ORDER } from '../data/sample-creatures.js';
import { WORD_DATA } from '../data/word-data.js';
import { getEmoji, drawIcon } from '../core/assets.js';

const STAR_PER_CORRECT = 1;
const MODE_TO_POOL = { write: 'hiragana', katakana: 'katakana' };

function pickUnclaimed(collection) {
  for (const cat of CATEGORY_ORDER) {
    const have = collection[cat] || [];
    const found = SAMPLE_CREATURES[cat].find(c => !have.includes(c.id));
    if (found) return { cat, creature: found };
  }
  return null;
}

// 「まだ練習が少ない字」を優先しつつ、同点はランダムに並べて選ぶ（軽量な進捗管理・仕様§9のprogress.jsの簡易版）。
function pickQuestions(order, n, masteryForPool) {
  const scored = order.map(k => ({ k, seen: (masteryForPool[k] && masteryForPool[k].seen) || 0, r: Math.random() }));
  scored.sort((a, b) => (a.seen - b.seen) || (a.r - b.r));
  return scored.slice(0, n).map(s => s.k);
}

class LessonScene {
  enter(params) {
    this.mode = (params && params.mode) || 'write';
    this.kanaMode = (params && params.kanaMode) || 'hiragana';   // しりとりのひらがな/カタカナ
    this.save = loadSave();
    this.gao = new Gao({ x: view.w * 0.09, y: view.h * 0.16, size: Math.min(view.w * 0.05, 40) });
    this.backBtn = new Button({ label: 'もどる', fill: COLORS.btnZukan, top: '#a6e2ff', labelSize: 24, onTap: () => scenes.set(SCENE.HOME) });
    this.stars = new StarField();
    this.homeBtn = new Button({ label: 'ホームへ', fill: COLORS.btnKaku, top: '#ffb190', labelSize: 26, onTap: () => scenes.set(SCENE.HOME) });
    this.zukanBtn = new Button({ label: 'ずかんへ', fill: COLORS.btnZukan, top: '#a6e2ff', labelSize: 24, onTap: () => scenes.set(SCENE.ZUKAN) });

    this.pool = MODE_TO_POOL[this.mode];

    // シーン別BGM：かく系=集中 / めいろ=冒険 / ことば系=ポップ
    setBgmTrack(this.mode === 'maze' ? 'adventure' : (this.mode === 'write' || this.mode === 'katakana') ? 'focus' : 'pop');

    // 単体ミニゲームモード（しりとり／なかまあつめ）：1ゲームだけ回す
    const MINI = { shiritori: 'L1', nakama: 'L2', anagram: 'G1', maze: 'G2' };
    if (MINI[this.mode]) {
      this.queue = [MINI[this.mode]];
      this.qIndex = 0; this.sessionStars = 0; this._wasComplete = false;
      this.state = 'playing';
      this._startVocabGame();
      return;
    }

    if (!this.pool) { this.state = 'unsupported'; return; }

    const poolData = KANA_DATA[this.pool];
    const masteryForPool = (this.save.mastery && this.save.mastery[this.pool]) || {};
    const n = Math.max(1, Math.min(this.save.settings.sessionLength || 4, poolData.order.length));
    this.queue = pickQuestions(poolData.order, n, masteryForPool);
    this.qIndex = 0; this.sessionStars = 0; this._wasComplete = false;
    this.state = 'playing';
    this._startQuestion();
  }

  _startQuestion() {
    const kana = this.queue[this.qIndex];
    this.charCenter = { x: view.w / 2, y: view.h * 0.56 };
    const boxSize = Math.min(view.w, view.h) * 0.5;
    this.game = new W1NazoriHira();
    this.game.init(ctx, { audio: { sfxTap, sfxSparkle, sfxCorrect }, speech: { speak } },
      { centerX: this.charCenter.x, centerY: this.charCenter.y, boxSize, toleranceR: 26 },
      { kana, data: KANA_DATA[this.pool].characters[kana], viewBox: KANA_DATA.viewBox });
    this._wasComplete = false;
  }

  _startVocabGame() {
    const type = this.queue[this.qIndex];
    this.charCenter = { x: view.w / 2, y: view.h * 0.5 };
    const area = { x: view.w * 0.02, y: view.h * 0.12, w: view.w * 0.96, h: view.h * 0.84 };
    const GAME_CLASSES = { L1: L1Shiritori, L2: L2Nakama, G1: G1Anagram, G2: G2Maze };
    this.game = new GAME_CLASSES[type]();
    this.game.init(ctx, { audio: { sfxTap, sfxSparkle, sfxCorrect, sfxWrong }, speech: { speak } },
      { area, kanaMode: this.kanaMode }, {});
    this._wasComplete = false;
  }

  _onQuestionComplete() {
    const res = this.game.getResult();
    this.sessionStars += (res.correctCount || 0) * STAR_PER_CORRECT;
    this.gao.setMood('cheer', 1.4);
    this.stars.spawn(this.charCenter.x, this.charCenter.y, view.w - 60, 46, { count: Math.min(3, res.correctCount || 1), stagger: 0.12, onArrive: () => {} });

    if (this.mode === 'shiritori' || this.mode === 'nakama' || this.mode === 'anagram' || this.mode === 'maze') {
      // ことばあそび：単語カードは無し（語彙自体がゲーム）。完成演出を見せてから次ゲームへ（update駆動）。
      this.state = 'vocabclear'; this._vocabClearT = 0;
      return;
    }

    // ごほうび：なぞった文字で始まる単語カードを表示
    const kana = this.queue[this.qIndex];
    const w = WORD_DATA[this.pool][kana];
    this._wordCard = w ? { kana, ...w } : null;
    this._wordCardT = 0;
    this.state = 'wordcard';
    if (this._wordCard) {
      speak(`${kana}。${this._wordCard.reading}の ${kana}`);
    }
  }

  _advanceAfterCard() {
    this._wordCard = null;
    this.state = 'playing';
    this.qIndex++;
    if (this.qIndex >= this.queue.length) this._finishSession();
    else this._startQuestion();
  }

  _finishSession() {
    const oldEgg = this.save.eggProgress || 0, oldStars = this.save.stars || 0;
    const totalEgg = oldEgg + this.sessionStars;
    const hatchCount = Math.floor(totalEgg / STARS_PER_EGG);
    const newEggProgress = totalEgg % STARS_PER_EGG;
    let collection = { ...this.save.collection };
    const hatchedList = [];
    for (let i = 0; i < hatchCount; i++) {
      const picked = pickUnclaimed(collection);
      if (!picked) break;
      collection = { ...collection, [picked.cat]: [...(collection[picked.cat] || []), picked.creature.id] };
      hatchedList.push(picked);
    }
    // 練習した字の既習カウントを更新（かき/カタカナのみ。ことばあそびのqueueはゲーム種別なので対象外）
    const mastery = { ...this.save.mastery };
    if (this.pool) {
      const poolMastery = { ...(mastery[this.pool] || {}) };
      for (const kana of this.queue) poolMastery[kana] = { seen: ((poolMastery[kana] && poolMastery[kana].seen) || 0) + 1 };
      mastery[this.pool] = poolMastery;
    }
    updateSave({ stars: oldStars + this.sessionStars, eggProgress: newEggProgress, collection, mastery });
    this.save = loadSave();
    this.hatchedList = hatchedList; this._finalEggProgress = newEggProgress;
    this.egg = new EggGauge({ max: STARS_PER_EGG, value: oldEgg, onHatch: () => this._revealHatch() });
    this.egg.setValue(hatchedList.length ? STARS_PER_EGG : newEggProgress);
    this._revealStage = null;
    this.state = 'summary';
  }

  _revealHatch() {
    this._revealStage = 'card'; this._revealCreature = this.hatchedList[0] || null;
    this._extraCount = Math.max(0, this.hatchedList.length - 1);
    sfxHatch();
    if (this._revealCreature) speak(`たまごが われたよ！ ${this._revealCreature.creature.name} が なかまに なった！`);
    else speak('たまごが われたよ！');
    setTimeout(() => { if (this.egg) this.egg.setValue(this._finalEggProgress); }, 1300);
  }

  update(dt) {
    this.gao.update(dt); this.stars.update(dt);
    if ((this.state === 'playing' || this.state === 'vocabclear') && this.game) this.game.update(dt);
    if (this.state === 'playing' && this.game) {
      if (!this._wasComplete && this.game.isComplete()) { this._wasComplete = true; this._onQuestionComplete(); }
    }
    if (this.state === 'vocabclear') {
      this._vocabClearT += dt;
      if (this._vocabClearT >= 1.6) {
        this.qIndex++;
        if (this.qIndex >= this.queue.length) this._finishSession();
        else { this.state = 'playing'; this._startVocabGame(); }
      }
    }
    if (this.state === 'wordcard') { this._wordCardT += dt; if (this._wordCardT >= 2.4) this._advanceAfterCard(); }
    if (this.state === 'summary' && this.egg) this.egg.update(dt);
  }

  render() {
    fillBg();
    if (this.state === 'unsupported') { this._renderUnsupported(); return; }
    if (this.state === 'playing') { this._renderPlaying(); return; }
    if (this.state === 'vocabclear') { this._renderPlaying(); return; }
    if (this.state === 'wordcard') { this._renderPlaying(); this._renderWordCard(); return; }
    if (this.state === 'summary') { this._renderSummary(); return; }
  }

  _renderUnsupported() {
    label('このモードは', view.w / 2, view.h * 0.38, { size: Math.min(view.w * 0.06, 38), color: COLORS.ink, weight: 800 });
    label('じゅんびちゅう だよ', view.w / 2, view.h * 0.46, { size: Math.min(view.w * 0.07, 44), color: COLORS.ink, weight: 800, shadow: 2 });
    label('（つぎのアップデートで あそべるようになるよ）', view.w / 2, view.h * 0.55, { size: Math.min(view.w * 0.04, 22), color: COLORS.ink, weight: 600 });
    this.backBtn.setRect(view.w * 0.04, view.h * 0.04, Math.min(view.w * 0.28, 190), Math.min(view.h * 0.11, 66));
    this.backBtn.render();
  }

  _renderPlaying() {
    // プレイ中の戻るボタン（左上・小さめ・なぞり領域から離す）
    const bw = Math.min(view.w * 0.2, 120), bh = Math.min(view.h * 0.085, 52);
    this.backBtn.setRect(view.w * 0.03, view.h * 0.03, bw, bh);
    this.backBtn.labelSize = 20;
    this.backBtn.render();
    // ガオは戻るボタンと被らないよう少し右へ（ミニゲームはゲーム側が自前で描くので省略）
    const isMiniGame = (this.mode === 'shiritori' || this.mode === 'nakama' || this.mode === 'anagram' || this.mode === 'maze');
    if (!isMiniGame) {
      this.gao.x = view.w * 0.03 + bw + Math.min(view.w * 0.06, 44);
      this.gao.render();
    }
    const MINI_LABEL = { nakama: 'なかまあつめ', anagram: 'もじならべ', maze: 'もじめいろ' };
    const headerText = isMiniGame
      ? (this.mode === 'shiritori' ? (this.kanaMode === 'katakana' ? 'カタカナ しりとり' : 'ひらがな しりとり') : MINI_LABEL[this.mode])
      : `${this.qIndex + 1} / ${this.queue.length} もんめ`;
    if (isMiniGame) {
      // ミニゲームはヘッダを「もどる」の右に小さく＝中央上をゲームのお題表示に開放
      label(headerText, view.w * 0.03 + bw + 10, view.h * 0.03 + bh / 2, { size: Math.max(13, Math.min(18, bh * 0.36)), align: 'left', color: COLORS.ink, weight: 700 });
    } else {
      label(headerText, view.w / 2, view.h * 0.08, { size: 22, color: COLORS.ink, weight: 700 });
    }
    // セッション中のほしバッジ（右上のミュート/全画面アイコンと重ならない高さに）
    label('⭐', view.w - 60, 78, { size: 30 });
    label(String(this.sessionStars), view.w - 30, 82, { size: 24, color: COLORS.ink, weight: 800, align: 'left' });
    if (this.game) this.game.render(ctx);
    this.stars.render();
  }

  _renderWordCard() {
    if (!this._wordCard) return;
    const c = this._wordCard;
    // 半透明の覆い＋ポップイン
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, 0, view.w, view.h); ctx.restore();
    const pop = Math.min(1, this._wordCardT / 0.28);
    const ease = 1 - Math.pow(1 - pop, 3);
    const scale = 0.6 + 0.4 * ease;
    const boxW = Math.min(view.w * 0.72, 480) * scale, boxH = Math.min(view.h * 0.5, 360) * scale;
    const bx = (view.w - boxW) / 2, by = (view.h - boxH) / 2;
    ctx.save(); ctx.globalAlpha = ease;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 5;
    rrPath(bx, by, boxW, boxH, 28 * scale); ctx.fill(); ctx.stroke();
    // 大きな絵（画像があれば画像、無ければ単語データ内のemojiにフォールバック）
    // asset キーは「かなのローマ字」でひらがな/カタカナ間衝突しうるため、pool を前置した複合キーで解決する
    const imgKey = c.asset ? `${this.pool}_${c.asset}` : '';
    drawIcon(ctx, imgKey, view.w / 2, by + boxH * 0.36, boxH * 0.34, c.emoji);
    // 単語（大きく）
    label(c.word, view.w / 2, by + boxH * 0.68, { size: boxH * 0.16, color: COLORS.ink, weight: 800 });
    // 「〇〇の し」の補足
    label(`「${c.kana}」の ことば`, view.w / 2, by + boxH * 0.86, { size: boxH * 0.075, color: COLORS.ink, weight: 700 });
    ctx.restore();
    // タップで先へ（点滅ヒント）
    if (this._wordCardT > 0.8) {
      const a = 0.5 + 0.5 * Math.sin(this._wordCardT * 4);
      label('タップで つぎへ →', view.w / 2, by + boxH + 30, { size: 18, color: `rgba(43,58,103,${a.toFixed(2)})`, weight: 700 });
    }
  }
  _renderSummary() {
    label('よくできました！', view.w / 2, view.h * 0.16, { size: Math.min(view.w * 0.07, 44), color: COLORS.ink, weight: 800, shadow: 2 });
    label(`⭐ ${this.sessionStars}こ ふえたよ`, view.w / 2, view.h * 0.25, { size: Math.min(view.w * 0.045, 26), color: COLORS.ink, weight: 700 });
    const gw = Math.min(view.w * 0.55, 420), gh = 26, gx = (view.w - gw) / 2, gy = view.h * 0.34;
    if (this.egg) this.egg.render(gx, gy, gw, gh);
    this.gao.x = view.w * 0.5; this.gao.y = view.h * 0.56; this.gao.size = Math.min(view.w * 0.09, 66);
    this.gao.render();

    if (this._revealStage === 'card') {
      const c = this._revealCreature;
      const boxW = Math.min(view.w * 0.7, 460), boxH = view.h * 0.24, bx = (view.w - boxW) / 2, by = view.h * 0.68;
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 4;
      const r = 24; ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.arcTo(bx + boxW, by, bx + boxW, by + boxH, r); ctx.arcTo(bx + boxW, by + boxH, bx, by + boxH, r); ctx.arcTo(bx, by + boxH, bx, by, r); ctx.arcTo(bx, by, bx + boxW, by, r); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      if (c) {
        label(getEmoji(c.cat), view.w / 2, by + boxH * 0.38, { size: 56 });
        label(`${c.creature.name} が なかまに なった！`, view.w / 2, by + boxH * 0.78, { size: Math.min(view.w * 0.04, 22), color: COLORS.ink, weight: 700 });
      } else {
        label('たまごが われたよ！', view.w / 2, by + boxH * 0.5, { size: 24, color: COLORS.ink, weight: 700 });
      }
      if (this._extraCount > 0) label(`（ほかにも ${this._extraCount}ひき！）`, view.w / 2, by + boxH * 0.95, { size: 16, color: COLORS.ink, weight: 600 });
    }

    const bw = Math.min(view.w * 0.36, 220), bh = Math.min(view.h * 0.1, 64), by2 = view.h * 0.94 - bh, gap = 20;
    const showZukan = this.hatchedList && this.hatchedList.length > 0;
    if (showZukan) { this.zukanBtn.setRect(view.w / 2 - bw - gap / 2, by2, bw, bh); this.zukanBtn.render(); this.homeBtn.setRect(view.w / 2 + gap / 2, by2, bw, bh); this.homeBtn.render(); }
    else { this.homeBtn.setRect((view.w - bw) / 2, by2, bw, bh); this.homeBtn.render(); }
    this._btnRects = showZukan ? [this.zukanBtn, this.homeBtn] : [this.homeBtn];
  }

  onPointerDown(x, y) {
    if (this.state === 'unsupported') { if (this.backBtn.hitTest(x, y)) { sfxTap(); this.backBtn.tap(); } return; }
    if (this.state === 'playing') {
      if (this.backBtn.hitTest(x, y)) { sfxTap(); this.backBtn.tap(); return; }  // 戻るを優先
      if (this.game) this.game.onPointerDown(x, y);
      return;
    }
    if (this.state === 'wordcard') {
      if (this.backBtn.hitTest(x, y)) { sfxTap(); this.backBtn.tap(); return; }
      if (this._wordCardT > 0.6) { sfxTap(); this._advanceAfterCard(); }
      return;
    }
    if (this.state === 'vocabclear') { if (this.backBtn.hitTest(x, y)) { sfxTap(); this.backBtn.tap(); } return; }
    if (this.state === 'summary') { for (const b of (this._btnRects || [])) if (b.hitTest(x, y)) { sfxTap(); b.tap(); return; } }
  }
  onPointerMove(x, y) { if (this.state === 'playing' && this.game) this.game.onPointerMove(x, y); }
  onPointerUp(x, y) { if (this.state === 'playing' && this.game) this.game.onPointerUp(x, y); }
}

export { LessonScene };
