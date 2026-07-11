// data/vocab-words.js — 【本データ】しりとり・なかまあつめ用の語彙辞書。
// VOCAB_HIRA（ひらがな）／VOCAB_KATA（カタカナ）に分離。しりとりはモードに応じて対応プールを使用。
// なかまあつめ(L2)は当面ひらがなプールを使用。
// 読める前提なので濁音・半濁音を含む語もOK。
// しりとり語尾規則: ー/っ/ゃ/ゅ/ょ(カタカナは ー/ッ/ャ/ュ/ョ)終わりは鎖に使わない。ん(ン)終わりはトラップ。
// 語の選定は独自編纂。絵文字は暫定表示。
const VOCAB_HIRA = [
// どうぶつ
  { w:'あひる', e:'🦆', c:'animal' }, { w:'りす', e:'🐿️', c:'animal' }, { w:'かめ', e:'🐢', c:'animal' },
  { w:'めだか', e:'🐟', c:'animal' }, { w:'ごりら', e:'🦍', c:'animal' }, { w:'らくだ', e:'🐫', c:'animal' },
  { w:'ぱんだ', e:'🐼', c:'animal' }, { w:'うし', e:'🐮', c:'animal' }, { w:'しまうま', e:'🦓', c:'animal' },
  { w:'うま', e:'🐴', c:'animal' }, { w:'きつね', e:'🦊', c:'animal' }, { w:'ねこ', e:'🐱', c:'animal' },
  { w:'こぶた', e:'🐷', c:'animal' }, { w:'たぬき', e:'🦝', c:'animal' }, { w:'ねずみ', e:'🐭', c:'animal' },
  { w:'さる', e:'🐵', c:'animal' }, { w:'とら', e:'🐯', c:'animal' }, { w:'かえる', e:'🐸', c:'animal' },
  { w:'うさぎ', e:'🐰', c:'animal' }, { w:'いぬ', e:'🐶', c:'animal' }, { w:'きりん', e:'🦒', c:'animal' },
  { w:'らいおん', e:'🦁', c:'animal' }, { w:'ぺんぎん', e:'🐧', c:'animal' }, { w:'いるか', e:'🐬', c:'animal' },
  { w:'わに', e:'🐊', c:'animal' }, { w:'にわとり', e:'🐔', c:'animal' }, { w:'ひよこ', e:'🐤', c:'animal' },
  { w:'ぞう', e:'🐘', c:'animal' }, { w:'くじら', e:'🐳', c:'animal' },
  // たべもの
  { w:'すいか', e:'🍉', c:'food' }, { w:'だんご', e:'🍡', c:'food' }, { w:'まめ', e:'🫘', c:'food' },
  { w:'りんご', e:'🍎', c:'food' }, { w:'なす', e:'🍆', c:'food' }, { w:'すもも', e:'🍑', c:'food' },
  { w:'たまご', e:'🥚', c:'food' }, { w:'とまと', e:'🍅', c:'food' }, { w:'すし', e:'🍣', c:'food' },
  { w:'みかん', e:'🍊', c:'food' }, { w:'めろん', e:'🍈', c:'food' }, { w:'ぱん', e:'🍞', c:'food' },
  { w:'ごはん', e:'🍚', c:'food' }, { w:'うどん', e:'🍜', c:'food' }, { w:'もも', e:'🍑', c:'food' },
  { w:'いちご', e:'🍓', c:'food' }, { w:'ばなな', e:'🍌', c:'food' }, { w:'けーき', e:'🍰', c:'food' },
  { w:'れもん', e:'🍋', c:'food' }, { w:'なし', e:'🍐', c:'food' },
  // のりもの
  { w:'ばす', e:'🚌', c:'vehicle' }, { w:'ふね', e:'⛴️', c:'vehicle' }, { w:'ひこうき', e:'✈️', c:'vehicle' },
  { w:'くるま', e:'🚗', c:'vehicle' }, { w:'でんしゃ', e:'🚃', c:'vehicle' }, { w:'とらっく', e:'🚚', c:'vehicle' },
  { w:'よっと', e:'⛵', c:'vehicle' }, { w:'ろけっと', e:'🚀', c:'vehicle' }, { w:'きゅうきゅうしゃ', e:'🚑', c:'vehicle' },
  // むし
  { w:'あり', e:'🐜', c:'insect' }, { w:'ばった', e:'🦗', c:'insect' }, { w:'かぶとむし', e:'🪲', c:'insect' },
  { w:'てんとうむし', e:'🐞', c:'insect' }, { w:'せみ', e:'🦟', c:'insect' }, { w:'はち', e:'🐝', c:'insect' },
  { w:'かたつむり', e:'🐌', c:'insect' }, { w:'くも', e:'🕷️', c:'insect' },
  // しぜん・そのほか
  { w:'そら', e:'☁️', c:'nature' }, { w:'つき', e:'🌙', c:'nature' }, { w:'ほし', e:'⭐', c:'nature' },
  { w:'やま', e:'⛰️', c:'nature' }, { w:'かわ', e:'🏞️', c:'nature' }, { w:'うみ', e:'🌊', c:'nature' },
  { w:'はな', e:'🌸', c:'nature' }, { w:'にじ', e:'🌈', c:'nature' }, { w:'ゆき', e:'⛄', c:'nature' },
  { w:'かさ', e:'☂️', c:'object' }, { w:'めがね', e:'👓', c:'object' }, { w:'ぼうし', e:'👒', c:'object' },
  { w:'とけい', e:'🕐', c:'object' }, { w:'らっぱ', e:'🎺', c:'object' }, { w:'たいこ', e:'🥁', c:'object' },
  { w:'ぴあの', e:'🎹', c:'object' }, { w:'ろうそく', e:'🕯️', c:'object' }, { w:'こま', e:'🪀', c:'object' },
  { w:'まくら', e:'🛏️', c:'object' }, { w:'いす', e:'🪑', c:'object' }, { w:'ほん', e:'📖', c:'object' },
  { w:'じてんしゃ', e:'🚲', c:'vehicle' }, { w:'きって', e:'📮', c:'object' }, { w:'はさみ', e:'✂️', c:'object' },
  { w:'みつばち', e:'🐝', c:'insect' }, { w:'ちきゅう', e:'🌍', c:'nature' }, { w:'ぎゅうにゅう', e:'🥛', c:'food' },
  { w:'ぬいぐるみ', e:'🧸', c:'object' }, { w:'もぐら', e:'🦔', c:'animal' }, { w:'のり', e:'🍙', c:'food' },
  { w:'のこぎり', e:'🪚', c:'object' }, { w:'うちわ', e:'🪭', c:'object' },
];

const VOCAB_KATA = [
// どうぶつ
  { w:'アヒル', e:'🦆', c:'animal' }, { w:'リス', e:'🐿️', c:'animal' }, { w:'カメ', e:'🐢', c:'animal' },
  { w:'メダカ', e:'🐟', c:'animal' }, { w:'ゴリラ', e:'🦍', c:'animal' }, { w:'ラクダ', e:'🐫', c:'animal' },
  { w:'パンダ', e:'🐼', c:'animal' }, { w:'ウシ', e:'🐮', c:'animal' }, { w:'ウマ', e:'🐴', c:'animal' },
  { w:'キツネ', e:'🦊', c:'animal' }, { w:'ネコ', e:'🐱', c:'animal' }, { w:'タヌキ', e:'🦝', c:'animal' },
  { w:'ネズミ', e:'🐭', c:'animal' }, { w:'サル', e:'🐵', c:'animal' }, { w:'トラ', e:'🐯', c:'animal' },
  { w:'カエル', e:'🐸', c:'animal' }, { w:'ウサギ', e:'🐰', c:'animal' }, { w:'イヌ', e:'🐶', c:'animal' },
  { w:'キリン', e:'🦒', c:'animal' }, { w:'ライオン', e:'🦁', c:'animal' }, { w:'イルカ', e:'🐬', c:'animal' },
  { w:'ワニ', e:'🐊', c:'animal' }, { w:'ヒヨコ', e:'🐤', c:'animal' }, { w:'クジラ', e:'🐳', c:'animal' },
  { w:'シマウマ', e:'🦓', c:'animal' }, { w:'コアラ', e:'🐨', c:'animal' }, { w:'ゾウ', e:'🐘', c:'animal' },
  // たべもの
  { w:'スイカ', e:'🍉', c:'food' }, { w:'マメ', e:'🫘', c:'food' }, { w:'リンゴ', e:'🍎', c:'food' },
  { w:'ナス', e:'🍆', c:'food' }, { w:'タマゴ', e:'🥚', c:'food' }, { w:'トマト', e:'🍅', c:'food' },
  { w:'スシ', e:'🍣', c:'food' }, { w:'ミカン', e:'🍊', c:'food' }, { w:'メロン', e:'🍈', c:'food' },
  { w:'パン', e:'🍞', c:'food' }, { w:'ゴハン', e:'🍚', c:'food' }, { w:'ウドン', e:'🍜', c:'food' },
  { w:'モモ', e:'🍑', c:'food' }, { w:'イチゴ', e:'🍓', c:'food' }, { w:'バナナ', e:'🍌', c:'food' },
  { w:'レモン', e:'🍋', c:'food' }, { w:'ナシ', e:'🍐', c:'food' }, { w:'ニンジン', e:'🥕', c:'food' },
  { w:'マグロ', e:'🐟', c:'food' }, { w:'サカナ', e:'🐟', c:'food' }, { w:'チーズ', e:'🧀', c:'food' },
  // のりもの
  { w:'バス', e:'🚌', c:'vehicle' }, { w:'フネ', e:'⛴️', c:'vehicle' }, { w:'クルマ', e:'🚗', c:'vehicle' },
  { w:'デンシャ', e:'🚃', c:'vehicle' }, { w:'ロケット', e:'🚀', c:'vehicle' }, { w:'トラック', e:'🚚', c:'vehicle' },
  // むし
  { w:'アリ', e:'🐜', c:'insect' }, { w:'ハチ', e:'🐝', c:'insect' }, { w:'クモ', e:'🕷️', c:'insect' },
  { w:'セミ', e:'🦟', c:'insect' }, { w:'カブトムシ', e:'🪲', c:'insect' },
  // しぜん・どうぐ
  { w:'ソラ', e:'☁️', c:'nature' }, { w:'ツキ', e:'🌙', c:'nature' }, { w:'ホシ', e:'⭐', c:'nature' },
  { w:'ヤマ', e:'⛰️', c:'nature' }, { w:'カワ', e:'🏞️', c:'nature' }, { w:'ウミ', e:'🌊', c:'nature' },
  { w:'ハナ', e:'🌸', c:'nature' }, { w:'ニジ', e:'🌈', c:'nature' }, { w:'ユキ', e:'⛄', c:'nature' },
  { w:'カサ', e:'☂️', c:'object' }, { w:'メガネ', e:'👓', c:'object' }, { w:'トケイ', e:'🕐', c:'object' },
  { w:'タイコ', e:'🥁', c:'object' }, { w:'ホン', e:'📖', c:'object' }, { w:'イス', e:'🪑', c:'object' },
  { w:'コマ', e:'🪀', c:'object' }, { w:'ハサミ', e:'✂️', c:'object' }, { w:'ノコギリ', e:'🪚', c:'object' },
  { w:'ラッパ', e:'🎺', c:'object' }, { w:'ボウシ', e:'👒', c:'object' }, { w:'ヌイグルミ', e:'🧸', c:'object' },
  { w:'ロウソク', e:'🕯️', c:'object' }, { w:'ミツバチ', e:'🐝', c:'insect' }, { w:'ムシ', e:'🐛', c:'insect' },
];

// 後方互換：既存参照(VOCAB_WORDS)はひらがなを指す
const VOCAB_WORDS = VOCAB_HIRA;

const VOCAB_CATEGORY_LABEL = { animal: "どうぶつ", food: "たべもの", vehicle: "のりもの", insect: "むし", nature: "しぜん", object: "どうぐ" };
const SHIRI_BAD_END = ["ー", "っ", "ゃ", "ゅ", "ょ", "ッ", "ャ", "ュ", "ョ"];

export { VOCAB_HIRA, VOCAB_KATA, VOCAB_WORDS, VOCAB_CATEGORY_LABEL, SHIRI_BAD_END };
