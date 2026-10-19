'use strict';
const assert = require('node:assert/strict');
const {cleanSession, phase} = require('../public/quiz-lifecycle');
const ids = new Set(['a','b']);
const session = cleanSession({ revealed: true, open: true, awarded: false, order: [
  {id:'a',t:100, st:'right',ans:2},
  {id:'a',t:1000, st:'wrong'},
  {id:'foreign',t:300, st:'right'},
  {id:'b',t:200, st:'unknown', ans:'X'.repeat(300)}
]},ids);
assert.equal(session.open,false,'cannot accept answers after reveal');
assert.deepEqual(session.order.map(x=>x.id),['a','b']);
assert.equal(session.order[1].st,'wait');
assert.equal(session.order[1].ans.length,160);
assert.equal(cleanSession(null,ids).order.length,0);
assert.equal(phase({started:true,open:true,revealed:false,awarded:false}), 'OPEN');
assert.equal(phase({started:true,open:false,revealed:false,awarded:false}), 'LOCKED');
assert.equal(phase({started:true,open:false,revealed:true,awarded:false,order:[{st:'wait'}]}), 'REVEALED');
assert.equal(phase({started:true,open:false,revealed:true,awarded:false,order:[{st:'right'}]}), 'MARKED');
assert.equal(phase({started:true,open:false,revealed:true,awarded:true}), 'FINALISED');
console.log('Question lifecycle tests: passed');
