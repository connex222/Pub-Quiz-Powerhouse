/* Pub Quiz Powerhouse v3.3: pure scoring and migration rules.
 * Safe to load in the browser or require from Node tests.
 * Returns [teamId, points] pairs; callers own mutable game state.
 */
(function (root, makeRules) {
  const rules = makeRules();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  if (root) root.PQPRules = rules;
})(typeof globalThis === 'object' ? globalThis : null, function () {
  'use strict';
  const EXPERIENCES = Object.freeze(['classic', 'show', 'legacy']);
  function migrateExperience(savedExperience) {
    return EXPERIENCES.includes(savedExperience) ? savedExperience : 'legacy';
  }
  function pointsOf(points) {
    const n = Math.round(Number(points));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 1;
  }
  function correctUnique(submissions) {
    const seen = new Set();
    return (Array.isArray(submissions) ? submissions : [])
      .filter(s => s && typeof s.id === 'string' && s.id && s.st === 'right')
      .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
      .map((s, i) => ({ id: s.id, t: Number.isFinite(s.t) ? s.t : Infinity, i }));
  }
  function orderedCorrect(submissions) {
    return correctUnique(submissions).sort((a, b) => a.t - b.t || a.i - b.i);
  }
  function calculateClassicAwards(points, submissions) {
    const base = pointsOf(points);
    return orderedCorrect(submissions).map(s => [s.id, base]);
  }
  function calculateShowAwards(points, submissions, policy = 'simultaneous') {
    const correct = orderedCorrect(submissions);
    const base = pointsOf(points);
    if (policy === 'exclusive') return correct.length ? [[correct[0].id, base]] : [];
    if (policy !== 'simultaneous') throw new Error('Unknown Show scoring policy');
    return correct.map((s, i) => [s.id, base + (i === 0 ? 2 : i === 1 ? 1 : 0)]);
  }
  function calculateLegacyAwards(scoring, points, submissions, answerRound) {
    const correct = orderedCorrect(submissions);
    if (scoring !== 'speed' && answerRound) return correct.map(s => [s.id, pointsOf(points)]);
    if (scoring === 'speed') return correct.map((s, i) => [s.id, i === 0 ? 2 : i === 1 ? 1 : 0]);
    return correct.length ? [[correct[0].id, pointsOf(points)]] : [];
  }
  return Object.freeze({
    EXPERIENCES,
    migrateExperience,
    calculateClassicAwards,
    calculateShowAwards,
    calculateLegacyAwards
  });
});
