// core/storage.js — localStorage への JSON 保存/読込。version つき・破損時は初期化（仕様§8.6）。
import { SAVE_KEY, SAVE_VERSION } from './constants.js';

function makeDefault() {
  return {
    version: SAVE_VERSION,
    stars: 0,
    eggProgress: 0,
    collection: { dino: [], insect: [], ghost: [] },
    mastery: {},
    settings: { bgmOn: true, bgmVolume: 0.35, sfxVolume: 0.8, voiceMode: 'tts', sessionLength: 4, kanaNameDisplay: 'katakana' },
    lastPlayed: null,
  };
}

function ls() { try { return (typeof window !== 'undefined' && window.localStorage) || null; } catch (_) { return null; } }

function loadSave() {
  const store = ls(); if (!store) return makeDefault();
  let raw = null; try { raw = store.getItem(SAVE_KEY); } catch (_) { return makeDefault(); }
  if (!raw) return makeDefault();
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== SAVE_VERSION) return makeDefault();
    // 既定値に浅くマージ（キー欠落に強く）
    const def = makeDefault();
    return { ...def, ...data, settings: { ...def.settings, ...(data.settings || {}) }, collection: { ...def.collection, ...(data.collection || {}) } };
  } catch (_) { return makeDefault(); }
}

function writeSave(obj) {
  const store = ls(); if (!store) return false;
  try { obj.lastPlayed = new Date().toISOString(); store.setItem(SAVE_KEY, JSON.stringify(obj)); return true; } catch (_) { return false; }
}

function updateSave(patch) { const s = loadSave(); const next = { ...s, ...patch }; writeSave(next); return next; }

function resetSave() { const store = ls(); try { if (store) store.removeItem(SAVE_KEY); } catch (_) {} return makeDefault(); }

export { makeDefault, loadSave, writeSave, updateSave, resetSave };
