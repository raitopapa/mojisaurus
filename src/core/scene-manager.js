// core/scene-manager.js — シーンの登録/切替と、update/render/ポインタの現在シーンへの委譲。
// シーン契約：任意で enter()/update(dt)/render()/onPointerDown(x,y)/onPointerMove(x,y)/onPointerUp(x,y)/dispose()。
// scene クラスの import はしない（登録は main.js。連結順の依存を避けるため）。

class SceneManager {
  constructor() { this.scenes = {}; this.current = null; this.currentName = null; }
  register(name, scene) { this.scenes[name] = scene; scene.manager = this; return this; }
  set(name, params) {
    const s = this.scenes[name]; if (!s) { console.warn('[scene] unknown:', name); return; }
    if (this.current && this.current.dispose) { try { this.current.dispose(); } catch (_) {} }
    this.currentName = name; this.current = s;
    if (s.enter) { try { s.enter(params); } catch (e) { console.error('[scene enter]', name, e); } }
  }
  update(dt) { const c = this.current; if (c && c.update) c.update(dt); }
  render() { const c = this.current; if (c && c.render) c.render(); }
  onPointerDown(x, y) { const c = this.current; if (c && c.onPointerDown) c.onPointerDown(x, y); }
  onPointerMove(x, y) { const c = this.current; if (c && c.onPointerMove) c.onPointerMove(x, y); }
  onPointerUp(x, y) { const c = this.current; if (c && c.onPointerUp) c.onPointerUp(x, y); }
}

const scenes = new SceneManager();

export { SceneManager, scenes };
