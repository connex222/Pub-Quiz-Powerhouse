'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8');
const segment=html.split('/* Host-controlled team joining.')[1].split('/* Setup step 2: how teams buzz */')[0];
assert.ok(segment,'host approval implementation exists');
const S={net:{on:true,room:'ROOM42',allowNew:true,requireApproval:true},teams:[{id:'A',name:'The Professors'},{id:'B',name:'The Lions'}],ready:[],lobby:true};
const sent=[],assigned=[],renders=[],buzzes=[];
const NET={leader:true,joinRequests:new Map(),approving:new Set(),phones:new Map(),client:{online:true,
  publish(topic,msg){sent.push({topic,msg:JSON.parse(msg)});return true;},
  assignPhone(room,cid,team,cb){assigned.push({room,cid,team});cb(true);}}};
const ctx=vm.createContext({S,NET,MAX_TEAMS:10,Date,console,JSON,
  isDuel:()=>false,team:id=>S.teams.find(t=>t.id===id),teamName:id=>S.teams.find(t=>t.id===id)?.name||'Removed',
  newTeam:name=>({id:'T'+S.teams.length,name}),netTopic:s=>'pqpowerhouse/v1/'+S.net.room+'/'+s,
  esc:value=>String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  save:()=>{},softRender:()=>renders.push(true),toast:()=>{},beep:()=>{},buzz:(...a)=>buzzes.push(a)
});
vm.runInContext('/* Host-controlled team joining.'+segment,ctx);
const inMsg=(cid,k,extras={})=>ctx.onNetMsg('pqpowerhouse/v1/ROOM42/in',JSON.stringify({cid,k,...extras}));
inMsg('ph123','join',{team:'A'});
assert.equal(NET.joinRequests.size,1);
assert.equal(assigned.length,0,'should not be assigned until quizmaster approves');
assert.equal(sent.at(-1).msg.k,'pending');
assert.match(ctx.phoneApprovalHTML(),/Approve/);
ctx.approveJoin('ph123');
assert.equal(assigned.length,1);assert.equal(assigned[0].team,'A');
assert.equal(sent.at(-1).msg.k,'joined');assert.equal(NET.joinRequests.size,0);
inMsg('ph123','join',{team:'A'});
assert.equal(NET.joinRequests.size,0,'approved phone can reconnect without another approval');
assert.equal(assigned.length,1,'no additional assignment on same-team reconnect');
inMsg('ph456','join',{team:'B'});
ctx.rejectJoin('ph456');
assert.equal(assigned.length,1,'reject does not assign');
assert.equal(sent.at(-1).msg.k,'nojoin');
assert.equal(NET.joinRequests.size,0);
inMsg('ph789','join',{name:'Fresh Start'});
assert.equal(S.teams.length,2,'unapproved team must not be created');
ctx.approveJoin('ph789');
assert.equal(S.teams.length,3,'approved new team is created');
assert.equal(S.teams.at(-1).name,'Fresh Start');
inMsg('ph000','join',{name:'Cancel Please'});
inMsg('ph000','cancel');
assert.equal(NET.joinRequests.size,0,'cancel removes the request');
assert.equal(sent.at(-1).msg.k,'cancelled');
inMsg('ph666','join',{name:'<script>alert(1)</script>'});
assert.match(ctx.phoneApprovalHTML(),/&lt;script&gt;/,'team name must be HTML-escaped');
ctx.rejectJoin('ph666');
S.net.allowNew=false;
inMsg('ph777','join',{name:'No New Team'});
assert.equal(NET.joinRequests.size,0,'cannot queue a new team when creation disabled');
assert.equal(sent.at(-1).msg.k,'nojoin');
S.net.allowNew=true;
S.net.requireApproval=false;
inMsg('ph111','join',{team:'B'});
assert.equal(sent.at(-1).msg.k,'joined','optional trusted-room mode allows direct assignment');
assert.equal(buzzes.length,0);
console.log('PASS: quizmaster approval, rejection, cancellation, rejoin, team creation, HTML escaping, trusted-room toggle');
