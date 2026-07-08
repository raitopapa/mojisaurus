// core/speech.js — Web Speech API (speechSynthesis) ラッパ。ja-JP・rate≈0.95。
// voiceMode:"tts"|"file" の器を最初から用意（将来は録音音声へ差し替え・仕様§8.5）。
// dash には無い mojisaurus 独自モジュール。音声アンロックは title のタップで primeSpeech()。
import { VOICE_RATE } from './constants.js';

const speech = { mode: 'tts', rate: VOICE_RATE, ready: false, voice: null, enabled: true };

function synth() { return (typeof window !== 'undefined' && window.speechSynthesis) || null; }

function pickVoice() {
  const s = synth(); if (!s) return null;
  const vs = s.getVoices() || [];
  // ja-JP を優先、無ければ ja を含むもの
  speech.voice = vs.find(v => v.lang === 'ja-JP') || vs.find(v => (v.lang || '').toLowerCase().startsWith('ja')) || null;
  return speech.voice;
}

// 初回ユーザー操作で呼ぶ：空発話でエンジンを起こし、ボイス一覧を取得。
function primeSpeech() {
  const s = synth(); if (!s) return;
  try {
    if (s.onvoiceschanged === null) s.onvoiceschanged = pickVoice;
    pickVoice();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0; u.lang = 'ja-JP';
    s.speak(u);
    speech.ready = true;
  } catch (_) {}
}

// text を読み上げ。将来 file モードでは録音音声を鳴らす分岐に差し替える。
function speak(text, o = {}) {
  if (!speech.enabled || !text) return;
  if (speech.mode === 'file') { /* TODO(Batch将来): assets/audio/voice/ を再生 */ return; }
  const s = synth(); if (!s) return;
  try {
    if (o.interrupt !== false) s.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'ja-JP';
    u.rate = o.rate || speech.rate;
    u.pitch = o.pitch || 1.05;
    if (!speech.voice) pickVoice();
    if (speech.voice) u.voice = speech.voice;
    s.speak(u);
  } catch (_) {}
}

function setVoiceMode(mode) { speech.mode = (mode === 'file') ? 'file' : 'tts'; }
function setSpeechEnabled(on) { speech.enabled = !!on; if (!on) { const s = synth(); if (s) s.cancel(); } }

export { speech, primeSpeech, speak, setVoiceMode, setSpeechEnabled, pickVoice };
