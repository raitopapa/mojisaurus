// build.mjs — src/ の ES モジュールを ORDER 順に連結し、単一ファイル index.html と
// dev 用 index.dev.html を build.shell.html から生成する（Bramble系と同方式・外部依存なし）。
//   node build.mjs
// 制約: 連結後は単一 IIFE スコープ＝全モジュールのトップレベル名は一意であること。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// 依存の土台から順に。副作用を持つ input.js は canvas/scene-manager/audio/speech の後、main.js は必ず最後。
const ORDER = [
  'core/constants.js',
  'core/utils.js',
  'core/svg-path.js',
  'core/canvas.js',
  'core/audio.js',
  'core/speech.js',
  'core/storage.js',
  'core/assets.js',
  'data/sample-strokes.js',
  'data/sample-creatures.js',
  'ui/button.js',
  'ui/gao.js',
  'ui/star-fx.js',
  'ui/egg-gauge.js',
  'games/game-base.js',
  'games/w1-nazori-hira.js',
  'core/scene-manager.js',
  'core/game-loop.js',
  'scenes/title.js',
  'scenes/home.js',
  'scenes/lesson.js',
  'scenes/game-select.js',
  'scenes/reward.js',
  'scenes/zukan.js',
  'scenes/parent.js',
  'core/input.js',
  'main.js',
];

// 行頭が import / export の行を除去。原則は単一行 `export { ... };` だが、
// 複数行に跨る import/export も（; で閉じるまで読み飛ばして）安全に除去する。
function strip(code) {
  const out = [];
  let skipping = false;
  for (const line of code.split('\n')) {
    const t = line.trim();
    if (skipping) { if (t.endsWith(';')) skipping = false; continue; }
    if (t.startsWith('import ') || t.startsWith('export ')) {
      if (!t.endsWith(';')) skipping = true;   // 複数行：; で閉じるまで読み飛ばす
      continue;                                 // 開始行も除去
    }
    out.push(line);
  }
  return out.join('\n').trim();
}

let js = '';
for (const rel of ORDER) {
  const src = readFileSync(join(here, 'src', rel), 'utf8');
  js += `\n/* ===== ${rel} ===== */\n` + strip(src) + '\n';
}
const bundle = `(()=>{'use strict';\n${js}\n})();`;

const shell = readFileSync(join(here, 'build.shell.html'), 'utf8');
if (!shell.includes('<!--BUNDLE-->')) throw new Error('build.shell.html に <!--BUNDLE--> マーカーがありません');

writeFileSync(join(here, 'index.html'), shell.replace('<!--BUNDLE-->', '<script>\n' + bundle + '\n</script>'));
writeFileSync(join(here, 'index.dev.html'), shell.replace('<!--BUNDLE-->', '<script type="module" src="src/main.js"></script>'));

console.log('Built index.html + index.dev.html');
console.log('  modules :', ORDER.length);
console.log('  JS size :', bundle.length, 'bytes');
