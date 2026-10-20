/* Pure, defensive exclusive-buzzer rules for TV Game Show rounds.
 * Each attempt belongs to one team; incorrect teams cannot buzz again.
 * Arbitration happens in the quizmaster's browser in message arrival order.
 */
(function(root, factory){
  const api=factory();
  if (typeof module==='object' && module.exports) module.exports=api;
  if (root) root.PQPShowBuzzer=api;
})(typeof globalThis==='object' ? globalThis : null, function(){
  'use strict';
  const orderOf = state => state && Array.isArray(state.order) ? state.order : [];
  function active(state){ return orderOf(state).find(b => b && b.st==='wait') || null; }
  function hasAttempted(state, id){ return orderOf(state).some(b => b && b.id === id); }
  function canAccept(state, id, validIds){
    return !!(state && state.open && !state.awarded && !state.revealed &&
      typeof id === 'string' && validIds.includes(id) &&
      !active(state) && !hasAttempted(state,id));
  }
  function remaining(state, validIds){
    return validIds.filter(id => !hasAttempted(state,id));
  }
  function canReopen(state, validIds, timeRemaining, timerEnabled){
    return !!(state && !state.revealed && !state.awarded && !active(state) &&
      remaining(state,validIds).length > 0 && (!timerEnabled || timeRemaining > 0));
  }
  function oneActive(order){
    /* Prior alpha versions allowed parallel unanswered buzzer attempts.
       Keep the earliest unanswered contender, so old local saves can reopen. */
    let kept=false;
    return (Array.isArray(order) ? order : []).filter(b=>{
      if (!b || b.st !== 'wait') return !!b;
      if (kept) return false;
      kept=true; return true;
    });
  }
  return Object.freeze({active, hasAttempted, canAccept, remaining, canReopen, oneActive});
});
