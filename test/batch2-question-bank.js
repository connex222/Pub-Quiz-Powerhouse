
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ctx={window:{}};vm.createContext(ctx);
for(const name of ['quizdemon-batch1.js','weekly-745-754-batch2.js']) vm.runInContext(fs.readFileSync(path.join(root,'public/question-banks',name),'utf8'),ctx);
const packs=ctx.window.PQP_IMPORTED_QUIZZES;
assert.equal(packs.length,22);
assert.equal(packs.filter(q=>q.title.startsWith('Weekly Quiz')).length,10);
assert.equal(packs.reduce((n,q)=>n+q.rounds.reduce((k,r)=>k+r.questions.length,0),0),594+668);
assert.equal(packs.reduce((n,q)=>n+q.tiebreakers.length,0),44);
const weekly=packs.filter(q=>q.title.startsWith('Weekly Quiz'));
for(const z of weekly){ assert.equal(z.rounds.length,7);assert.equal(z.tiebreakers.length,2); assert(!z.rounds.some(r=>r.name.includes('Round 1')));for(const r of z.rounds)for(const q of r.questions){ assert(q.q.trim()&&q.a.trim());assert(q.id&&q.pts>=1&&q.pts<=5); } }
assert.equal(weekly.reduce((n,z)=>n+z.rounds.reduce((v,r)=>v+r.questions.reduce((c,q)=>c+q.pts,0),0),0),700);
assert.equal(weekly.flatMap(z=>z.rounds.flatMap(r=>r.questions)).find(q=>q.id==='WQ751-R2-Q01').a,'Mars');
assert(weekly.flatMap(z=>z.rounds.flatMap(r=>r.questions)).find(q=>q.id==='WQ748-R4-Q01').a.split(';').length===5);
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
assert(html.indexOf('quizdemon-batch1.js')<html.indexOf('weekly-745-754-batch2.js'));
assert.equal(html.match(/weekly-745-754-batch2.js/g).length,1);
console.log('PASS: Batch 1 + Batch 2 integrated: 22 packs, 1262 prompts, 44 tie-breakers; Weekly subset 10 quizzes, 668 prompts, 700 scoring slots');
