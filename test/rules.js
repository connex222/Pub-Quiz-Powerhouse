'use strict';
const assert = require('node:assert/strict');
const rules = require('../public/quiz-rules');
const correct = [
  { id: 'late', t: 300, st: 'right' },
  { id: 'fastwrong', t: 100, st: 'wrong' },
  { id: 'first', t: 150, st: 'right' },
  { id: 'second', t: 250, st: 'right' },
  { id: 'third', t: 350, st: 'right' }
];
assert.equal(rules.migrateExperience(), 'legacy', 'old sessions retain legacy behaviour');
assert.equal(rules.migrateExperience('classic'), 'classic');
assert.equal(rules.migrateExperience('show'), 'show');
assert.deepEqual(rules.calculateClassicAwards(1, correct), [['first',1],['second',1],['late',1],['third',1]]);
assert.deepEqual(rules.calculateClassicAwards(3, correct), [['first',3],['second',3],['late',3],['third',3]]);
assert.deepEqual(rules.calculateShowAwards(1, correct), [['first',3],['second',2],['late',1],['third',1]]);
assert.deepEqual(rules.calculateShowAwards(2, correct, 'exclusive'), [['first',2]]);
assert.deepEqual(rules.calculateLegacyAwards('speed', 1, correct, true), [['first',2],['second',1],['late',0],['third',0]]);
assert.deepEqual(rules.calculateLegacyAwards('points', 3, correct, true), [['first',3],['second',3],['late',3],['third',3]]);
assert.deepEqual(rules.calculateClassicAwards(1, []), []);
assert.deepEqual(rules.calculateShowAwards(1, [{id:'x',t:1,st:'wrong'}]), []);
assert.deepEqual(rules.calculateClassicAwards(1, [correct[2], correct[2]]), [['first',1]]);
assert.throws(() => rules.calculateShowAwards(1, [], 'unknown'));
console.log('Scoring/migration tests: passed');
