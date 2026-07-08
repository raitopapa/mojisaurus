// ui/button.js — 再利用可能な角丸ボタン。矩形＋ラベル＋押下演出＋ヒットテストを1つにまとめる。
// 描画は core/canvas.js の pill() に委譲（見た目の一貫性を1箇所に集約）。
import { pill } from '../core/canvas.js';
import { pointInRect } from '../core/utils.js';

class Button {
  constructor(o = {}) {
    this.x = o.x || 0; this.y = o.y || 0; this.w = o.w || 200; this.h = o.h || 72;
    this.label = o.label || ''; this.fill = o.fill || '#57c06a'; this.top = o.top || '#8fe19a';
    this.labelColor = o.labelColor || '#ffffff'; this.labelSize = o.labelSize || 30;
    this.radius = o.radius; this.disabled = !!o.disabled; this.onTap = o.onTap || null;
    this._pressed = false;
  }
  setRect(x, y, w, h) { this.x = x; this.y = y; if (w != null) this.w = w; if (h != null) this.h = h; return this; }
  hitTest(x, y) { return !this.disabled && pointInRect(x, y, this); }
  press() { if (!this.disabled) this._pressed = true; }
  release() { this._pressed = false; }
  // ヒット→押下演出→(遅延後)コールバック、を一括で行うヘルパ。各シーンの定型処理を削減。
  tap(delayMs = 120) {
    this.press();
    const cb = this.onTap;
    setTimeout(() => { this.release(); if (cb) cb(); }, delayMs);
  }
  render() {
    pill(this, { fill: this.fill, top: this.top, label: this.label, labelSize: this.labelSize, labelColor: this.labelColor, pressed: this._pressed, radius: this.radius });
  }
}

export { Button };
