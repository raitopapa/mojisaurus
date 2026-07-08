// scenes/title.js — 起動画面。「タップしてスタート」。ここで音声アンロック（input.js が実行）→ home へ。
import { COLORS } from '../core/constants.js';
import { SCENE } from '../core/constants.js';
import { view, ctx, fillBg, label, drawGao } from '../core/canvas.js';
import { scenes } from '../core/scene-manager.js';
import { sfxTap } from '../core/audio.js';
import { speak } from '../core/speech.js';

class TitleScene {
  enter() { this.t = 0; this.started = false; }
  update(dt) { this.t += dt; }
  render() {
    fillBg();
    const cx = view.w / 2;
    // タイトル
    label('もじ', cx - 92, view.h * 0.28, { size: Math.min(view.w * 0.16, 120), color: COLORS.accent, weight: 800, shadow: 3 });
    label('ざうるす', cx + 74, view.h * 0.28, { size: Math.min(view.w * 0.16, 120), color: '#ff8a5c', weight: 800, shadow: 3 });
    // ガオ（ぴょこぴょこ）
    const bob = Math.sin(this.t * 3) * 8;
    drawGao(cx, view.h * 0.55 + bob, Math.min(view.w * 0.12, 78), 'happy');
    // 「タップしてスタート」点滅
    const a = 0.55 + 0.45 * Math.sin(this.t * 4);
    ctx.save(); ctx.globalAlpha = a;
    label('タップして スタート', cx, view.h * 0.82, { size: Math.min(view.w * 0.055, 40), color: COLORS.ink, weight: 800, shadow: 1.5 });
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
