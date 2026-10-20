'use strict';
/* Approval must be atomic even when the relay's acknowledgement is delayed. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const segment=html.split('/* Host-controlled team joining.')[1].split('/* Setup step 2: how teams buzz */')[0];
assert.ok(segment);
const S={net:{on:true,room:'ROOM42',allowNew:true,requireApproval:true},teams:[{id:'A',name:'Original'},{id:'B',name:'Other'}],ready:[],lobby:true};
const waiting=[],sent=[],saves=[];
let seq=0;
const client={online:true,
 publish(topic,msg){sent.push(JSON.parse(msg));return true;},
 assignPhone(room,cid,team,cb){waiting.push({room,cid,team,cb});}}
const NET={leader:true,joinRequests:new Map(),approving:new Set(),phones:new Map(),client};
const ctx=vm.createContext({S,NET,MAX_TEAMS:10,Date,console,JSON,
 isDuel:()=>false,team:id=>S.teams.find(x=>x.id===id),teamName:id=>S.teams.find(x=>x.id===id)?.name||'Removed',
 newTeam:name=>({id:'T'+(++seq),name}),netTopic:s=>'pqpowerhouse/v1/'+S.net.room+'/'+s,
 esc:v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 save:()=>saves.push(true),softRender:()=>{},toast:()=>{},beep:()=>{},buzz:()=>{}});
vm.runInContext('/* Host-controlled team joining.'+segment,ctx);
const send=(cid,k,extra={})=>ctx.onNetMsg('pqpowerhouse/v1/ROOM42/in',JSON.stringify({cid,k,...extra}));
// Double clicking must not submit two assignments or create a team before acknowledgement.
send('ph100','join',{name:'New Entrants'});
ctx.approveJoin('ph100');ctx.approveJoin('ph100');
assert.equal(waiting.length,1);assert.equal(S.teams.length,2);
assert.match(ctx.phoneApprovalHTML(),/Approving/);
// A simultaneous request for the same team name waits until the first is committed.
send('ph101','join',{name:'New Entrants'});
ctx.approveJoin('ph101');
assert.equal(waiting.length,1,'concurrent new-team approval must wait');
waiting.shift().cb(true);
assert.equal(S.teams.length,3);assert.equal(S.teams.at(-1).name,'New Entrants');
assert.equal(sent.at(-1).k,'joined');assert.equal(NET.approving.size,0);
ctx.approveJoin('ph101');
assert.equal(waiting.length,1);
const second=waiting.shift();
assert.equal(second.team,'T1','second request joins the first newly created team');
second.cb(true);
assert.equal(S.teams.length,3);
// A relay refusal must not leave a ghost team or mark the phone as joined.
send('ph200','join',{name:'Relay Failure'});
ctx.approveJoin('ph200');assert.equal(S.teams.length,3);
waiting.shift().cb(false);
assert.equal(waiting.length,1,'server refusal restores prior team binding');
assert.equal(waiting.shift().team,null);
assert.equal(S.teams.length,3);assert.equal(NET.phones.get('ph200').team,null);
assert.equal(sent.at(-1).k,'nojoin');assert.equal(NET.joinRequests.has('ph200'),false);
// Cancelling an approval in flight must restore the old binding on the relay.
send('ph300','join',{team:'A'});
ctx.approveJoin('ph300');assert.equal(waiting.length,1);
send('ph300','cancel');
waiting.shift().cb(true);
assert.equal(waiting.length,1);assert.equal(waiting.shift().team,null);
assert.equal(NET.phones.get('ph300').team,null);
assert.equal(sent.at(-1).k,'cancelled');
// A stale acknowledgement following a room switch must not mutate quiz teams.
send('ph400','join',{name:'Stale Request'});ctx.approveJoin('ph400');
const before=S.teams.length;
S.net.room='ROOM99';NET.client={...client};NET.approving.clear();
waiting.shift().cb(true);
assert.equal(S.teams.length,before);
console.log('PASS: approval double-click, delayed acknowledgement, failure rollback, cancellation and stale-room protection');
