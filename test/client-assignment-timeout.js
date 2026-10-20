'use strict';
/* A server hiccup must not leave the quizmaster approval UI permanently locked. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const start=html.indexOf('function mqttClient(_url, onMsg, onStatus){');
const end=html.indexOf('\nfunction hostToken(){',start);
assert.ok(start>=0&&end>start);
const activeTimers=new Map();let nextId=0;
const schedule=(fn,delay)=>{const id=++nextId;activeTimers.set(id,{fn,delay});return id;};
const clear=id=>activeTimers.delete(id);
const handlers=new Map(), log=[];
const socket={connected:false,
 on(ev,fn){handlers.set(ev,fn);},
 emit(ev,data,cb){log.push({ev,data,cb});},
 trigger(ev,data){handlers.get(ev)?.(data);},
 close(){socket.connected=false;}};
const ctx={io:()=>socket,setTimeout:schedule,clearTimeout:clear};
vm.runInNewContext(html.slice(start,end)+'\nthis.makeClient=mqttClient',ctx);
const client=ctx.makeClient('',()=>{},()=>{});
client.claim('ROOM42','x'.repeat(32));
socket.connected=true;socket.trigger('connect');
assert.equal(log.at(-1).ev,'claim');log.at(-1).cb({ok:true});
let answer=null;
client.assignPhone('ROOM42','phone123','A',ok=>answer=ok);
const first=log.at(-1);assert.equal(first.ev,'phone-assign');
const timeout=[...activeTimers.values()].find(x=>x.delay===6500);
assert.ok(timeout,'assignment has an acknowledgement deadline');
timeout.fn();assert.equal(answer,false);
first.cb({ok:true});assert.equal(answer,false,'late reply must not overturn timeout');
client.assignPhone('ROOM42','phone123','A',ok=>answer=ok);
log.at(-1).cb({ok:true});assert.equal(answer,true,'normal acknowledgements still succeed');
client.close();
console.log('PASS: lost relay acknowledgement times out, late replies ignored, successful assignment resumes');
