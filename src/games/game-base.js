// games/game-base.js — 全ミニゲーム共通インターフェース（仕様§8.3）。
// 注：仕様書は `export default class` だが、本プロジェクトのビルド規約（末尾の単一行 export { ... }）
// に合わせ、named export に変換して定義する（連結ビルドの都合。公開contractの中身は仕様どおり）。
class GameBase {
  init(ctx, services, params, question) {}  // services:{audio,speech,input,storage}
  update(dt) {}
  render(ctx) {}
  onPointerDown(x, y) {}
  onPointerMove(x, y) {}
  onPointerUp(x, y) {}
  isComplete() { return false; }
  getResult() { return { correctCount: 0, mistakes: 0, itemsPracticed: [] }; }
  dispose() {}
}

export { GameBase };
