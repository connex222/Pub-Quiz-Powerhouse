'use strict';
/** Offline release check: the shipped avatar manifest resolves to 72 valid WebP files. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../public/assets/avatars');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
assert.equal(manifest.images?.length,24,'exactly 24 character identities');
const ids=new Set(), files=new Set();
for(const actor of manifest.images){
  assert.ok(typeof actor.id==='string' && actor.id.length>0);
  assert.ok(!ids.has(actor.id),`duplicate avatar: ${actor.id}`);
  ids.add(actor.id);
  for(const state of ['correct','wrong','win']){
    const rel=actor.states?.[state];
    assert.ok(typeof rel==='string' && /^[a-z0-9/_-]+\.webp$/.test(rel),`${actor.id}: ${state} filename invalid`);
    const full=path.resolve(root,rel);
    assert.ok(full.startsWith(root+path.sep),'asset may not escape avatar folder');
    assert.ok(!files.has(full),`${actor.id}: image file reused`);files.add(full);
    const data=fs.readFileSync(full);
    assert.ok(data.length>1000,`${rel}: suspiciously small image`);
    assert.equal(data.toString('ascii',0,4),'RIFF',`${rel}: not WebP`);
    assert.equal(data.toString('ascii',8,12),'WEBP',`${rel}: not WebP`);
  }
  assert.equal(actor.idleFallback,'correct',`${actor.id}: missing expected idle fallback`);
}
assert.equal(files.size,72,'exactly 72 reaction assets referenced');
console.log('PASS: 24 distinct avatars and all 72 valid, readable WebP reaction images');
