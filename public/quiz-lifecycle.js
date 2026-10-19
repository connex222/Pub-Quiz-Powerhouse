/* Pub Quiz Powerhouse v3.3 — defensive per-question lifecycle primitives.
 * Never contains correct answers or credentials; browser and Node compatible.
 */
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PQPLifecycle = api;
})(typeof globalThis === 'object' ? globalThis : null, function(){
  'use strict';
  const allowedMarks = new Set(['wait', 'right', 'wrong']);
  function cleanSession(src, validIds){
    src = src && typeof src === 'object' ? src : {};
    const valid = validIds instanceof Set ? validIds : new Set();
    const seen = new Set();
    const order = [];
    for (const b of (Array.isArray(src.order) ? src.order : []).slice(0, 40)) {
      if (!b || !valid.has(b.id) || seen.has(b.id)) continue;
      seen.add(b.id);
      const entry = { id: b.id,
        t: Number.isFinite(b.t) ? b.t : 0,
        st: allowedMarks.has(b.st) ? b.st : 'wait' };
      if (typeof b.ans === 'string') entry.ans = b.ans.slice(0,160);
      else if (Number.isInteger(b.ans) && b.ans >= 0 && b.ans <= 3) entry.ans = b.ans;
      if (Number.isFinite(b.hits)) entry.hits = Math.max(0, Math.min(100,b.hits));
      order.push(entry);
    }
    return {
      revealed: !!src.revealed,
      open: !!src.open && !src.revealed && !src.awarded,
      awarded: !!src.awarded,
      g: typeof src.g === 'string' && src.g.length < 50 ? src.g : null,
      closedAt: Number.isFinite(src.closedAt) ? Math.max(0,src.closedAt) : 0,
      order
    };
  }
  function phase({started, open, revealed, awarded, order}){
    if (!started) return 'PREVIEW';
    if (awarded) return 'FINALISED';
    if (revealed) return (Array.isArray(order) && order.some(b => b.st === 'wait')) ? 'REVEALED' : 'MARKED';
    return open ? 'OPEN' : 'LOCKED';
  }
  return Object.freeze({cleanSession, phase});
});
