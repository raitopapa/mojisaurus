// ui/gao.js — ナビキャラ「ガオ」の再利用ウィジェット。待機ボブ＋ムード切替（一定時間で normal に自動復帰）。
import { drawGao } from '../core/canvas.js';

class Gao {
  constructor(o = {}) {
    this.x = o.x || 0; this.y = o.y || 0; this.size = o.size || 60;
    this.mood = o.mood || 'normal'; this.t = 0;
    this.bobSpeed = o.bobSpeed ?? 2.4; this.bobAmp = o.bobAmp ?? 6;
    this._moodUntil = 0;
  }
  setMood(mood, holdSeconds) { this.mood = mood; this._moodUntil = holdSeconds ? this.t + holdSeconds : 0; }
  update(dt) { this.t += dt; if (this._moodUntil && this.t > this._moodUntil) { this.mood = 'normal'; this._moodUntil = 0; } }
  render() { const bob = Math.sin(this.t * this.bobSpeed) * this.bobAmp; drawGao(this.x, this.y + bob, this.size, this.mood); }
}

export { Gao };
