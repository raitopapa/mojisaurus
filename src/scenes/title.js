// scenes/title.js — 起動画面。ここで音声アンロック（input.js 経由）→ home へ。
// タイトルは1文字ずつ「文字数×サイズから計算した位置」に描く（固定オフセット禁止＝どのサイズでも重ならない）。
import { COLORS, SCENE } from '../core/constants.js';
import { view, ctx, fillBg, label, textWidth, drawGao } from '../core/canvas.js';
import { scenes } from '../core/scene-manager.js';
import { sfxTap, setBgmTrack } from '../core/audio.js';
import { speak } from '../core/speech.js';

const TITLE_CHARS = [...'もじざうるす'];
const TITLE_COLORS = ['#ff8a5c', '#ffc53a', '#57c06a', '#5cc8ff', '#b58cff', '#ff9ec6'];

class TitleScene {
  enter() { this.t = 0; this.started = false; setBgmTrack('title'); }
  update(dt) { this.t += dt; }
  render() {
    fillBg();
    const W = view.w, H = view.h;
    // タイトル文字：measureText の実測幅で累積配置（フォント差・端末差があっても物理的に重ならない）
    const n = TITLE_CHARS.length;
    let size = Math.min((W * 0.84) / n, H * 0.2, 96);
    let pad = size * 0.06;
    let widths = TITLE_CHARS.map(ch => textWidth(ch, size, 800));
    let total = widths.reduce((a, b) => a + b, 0) + pad * (n - 1);
    const maxW = W * 0.88;
    if (total > maxW) {                      // 実測が想定より広いフォントでも1回の縮小で必ず収める
      const k = maxW / total;
      size *= k; pad *= k;
      widths = TITLE_CHARS.map(ch => textWidth(ch, size, 800));
      total = widths.reduce((a, b) => a + b, 0) + pad * (n - 1);
    }
    const baseY = H * 0.22;
    let cx = (W - total) / 2;
    TITLE_CHARS.forEach((ch, i) => {
      const bob = Math.sin(this.t * 2.2 + i * 0.7) * size * 0.07;
      label(ch, cx + widths[i] / 2, baseY + bob, { size, color: TITLE_COLORS[i % TITLE_COLORS.length], weight: 800, shadow: 3 });
      cx += widths[i] + pad;
    });
    label('ひらがな・カタカナで あそぼう！', W / 2, baseY + size * 0.85, { size: Math.min(W * 0.035, H * 0.045, 20), color: COLORS.ink, weight: 700 });
    // ガオ（ぴょこぴょこ）
    const gbob = Math.sin(this.t * 3) * H * 0.014;
    drawGao(W / 2, H * 0.56 + gbob, Math.min(W * 0.11, H * 0.15, 72), 'happy');
    // 「タップしてスタート」点滅
    const a = 0.55 + 0.45 * Math.sin(this.t * 4);
    ctx.save(); ctx.globalAlpha = a;
    label('タップして スタート', W / 2, H * 0.84, { size: Math.min(W * 0.05, H * 0.065, 34), color: COLORS.ink, weight: 800, shadow: 1.5 });
    ctx.restore();
  }
  onPointerDown() {
    if (this.started) return; this.started = true;   // 二度押し防止
    sfxTap();
    speak('もじざうるすへ ようこそ！');
    scenes.set(SCENE.HOME);
  }
}

export { TitleScene };
