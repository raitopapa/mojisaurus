// ui/egg-gauge.js — たまごゲージ（0..max）。値はイージングで滑らかに追従、満タン到達で onHatch を一度だけ発火。
import { ctx, rrPath, label } from '../core/canvas.js';
import { COLORS } from '../core/constants.js';

class EggGauge {
  constructor(o = {}) {
    this.max = o.max || 22; this.value = o.value || 0; this.display = this.value;
    this.onHatch = o.onHatch || null; this._hatchFiredAt = -1;
  }
  setValue(v) { this.value = Math.max(0, v); }
  add(n) { this.setValue(this.value + n); }
  update(dt) {
    this.display += (this.value - this.display) * Math.min(1, dt * 6);
    if (Math.abs(this.value - this.display) < 0.02) this.display = this.value;
    if (this.value >= this.max && this.display >= this.max - 0.05 && this._hatchFiredAt !== this.value) {
      this._hatchFiredAt = this.value; if (this.onHatch) this.onHatch();
    }
  }
  render(x, y, w, h) {
    const p = Math.max(0, Math.min(1, this.display / this.max));
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; rrPath(x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = COLORS.accent; rrPath(x + 3, y + 3, Math.max(0, (w - 6) * p), h - 6, (h - 6) / 2); ctx.fill();
    label('🥚', x + w + 22, y + h / 2, { size: h * 1.3 });
  }
}

export { EggGauge };
