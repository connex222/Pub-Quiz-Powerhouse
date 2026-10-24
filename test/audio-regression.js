'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const from = html.indexOf('const SOUND_FILES =');
const to = html.indexOf('/* ---------- Scoring ---------- */', from);
assert(from >= 0 && to > from, 'Audio controller found');
const code = html.slice(from, to);
const sounds = [...code.matchAll(/\w+:'(sfx\/[^']+\.mp3)'/g)].map(x => x[1]);
assert(sounds.length >= 14, 'Expected event-cue sounds');
for (const s of sounds) assert(fs.statSync(path.join(root, 'public/assets',s)).size > 1000, `Missing SFX ${s}`);
for (const s of ['lobby','board','tension']) assert(fs.statSync(path.join(root,`public/assets/music/mus-${s}.ogg`)).size > 1000, `Missing ${s} fallback`);
assert(fs.statSync(path.join(root,'public/assets/music/mus-victory.mp3')).size > 1000);
let now=0, frames=[];
const elements=[];
class MockAudio {
  constructor(src='') { this.src=src; this.paused=true;this.ended=false;this.volume=1;this.listeners={};this.error=null;this.readyState=4;elements.push(this); }
  load() {}
  play() { this.paused=false; return Promise.resolve(); }
  pause() { this.paused=true; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  emit(type) { for (const cb of this.listeners[type] || []) cb(); }
}
const S={settings:{sound:true,music:true},lobby:true,between:false,finished:false};
const ctx=vm.createContext({S,Audio:MockAudio,Map,performance:{now:()=>now},requestAnimationFrame:cb=>frames.push(cb),setTimeout:()=>{},console});
vm.runInContext(code, ctx);
function sync(){vm.runInContext('syncMusic()',ctx)}
async function flush(count=13) { await Promise.resolve();for(let i=0;i<count && frames.length;i++){now+=100;frames.shift()(now);} }
(async () => {
  sync(); await flush();
  const lobby = elements.at(-1);
  assert(!lobby.paused, 'Lobby track started');
  S.lobby=false;S.between=true;
  sync(); await flush(3);
  const board=elements.at(-1);
  assert(!board.paused, 'Board track started');
  S.between=false;
  sync();
  const tension=elements.at(-1);
  assert(lobby.paused, 'Interrupted crossfade stops older lobby track');
  await flush(3);
  S.settings.sound=false;
  sync();
  assert(board.paused && tension.paused, 'Master mute stops all active background recordings');
  S.settings.sound=true;S.lobby=true;
  sync();await flush();
  const restored=elements.at(-1);
  restored.error={code:4}; restored.readyState=0;restored.emit('error');
  assert(restored.src.endsWith('/assets/music/mus-lobby.ogg'), 'Remote failure loads local fallback');
  S.settings.sound=false;sync();
  console.log('PASS: audio assets, transitions, interrupted crossfades, mute, and local music fallback');
})().catch(e=>{console.error(e); process.exitCode=1;});
