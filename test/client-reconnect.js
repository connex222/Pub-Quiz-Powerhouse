'use strict';
/* Exercise actual index.html client auth ordering without a browser or Socket.io install. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const start=html.indexOf('function mqttClient(_url, onMsg, onStatus){');
const end=html.indexOf('\nfunction hostToken(){',start);
assert.ok(start>=0&&end>start);
const instances=[];
function makeSocket(){
  const handlers=new Map(),log=[];
  const s={connected:false,log,
    on(ev,fn){handlers.set(ev,fn);},
    emit(ev,data,ack){log.push({ev,data,ack});},
    trigger(ev,data){handlers.get(ev)?.(data);},
    connect(){s.connected=true;s.trigger('connect');},
    close(){s.connected=false;}
  };
  instances.push(s);return s;
}
const context={io:()=>makeSocket(),setTimeout,clearTimeout};
vm.runInNewContext(html.slice(start,end)+'\nthis.makeClient=mqttClient;',context);
const statuses=[],client=context.makeClient('',()=>{},st=>statuses.push(st));
client.claim('ROOM42','t'.repeat(32));client.subscribe('pqpowerhouse/v1/ROOM42/in');
assert.equal(client.publish('state','test'),false,'publish refuses before server authentication');
const sock=instances.at(-1);
sock.connect();
assert.deepEqual(sock.log.map(x=>x.ev),['claim'],'claim emitted before privileged subscribe');
sock.log.at(-1).ack({ok:true});
assert.deepEqual(sock.log.map(x=>x.ev),['claim','sub']);
assert.equal(client.online,true);
sock.connected=false;sock.trigger('disconnect');sock.log.length=0;
sock.connect();assert.deepEqual(sock.log.map(x=>x.ev),['claim']);
sock.log.at(-1).ack({ok:true});assert.equal(sock.log[1].ev,'sub');
client.close();
const phone=context.makeClient('',()=>{},()=>{}),ps=instances.at(-1);
phone.bindPhone('ROOM42','phone123','x'.repeat(64));
phone.subscribe('pqpowerhouse/v1/ROOM42/state');
phone.subscribe('pqpowerhouse/v1/ROOM42/out/phone123');
ps.connect();assert.deepEqual(ps.log.map(x=>x.ev),['phone-auth']);
ps.log[0].ack({ok:true});assert.deepEqual(ps.log.slice(1).map(x=>x.ev),['sub','sub']);
phone.close();
const tv=context.makeClient('',()=>{},st=>statuses.push(st)),ts=instances.at(-1);
let lost=0;tv.onPairLost=()=>lost++;
tv.pairTV({room:'ROOM42',key:'SECRETKEY1'});tv.subscribe('pqpowerhouse/v1/ROOM42/screen/SECRETKEY1');
ts.connect();assert.equal(ts.log[0].ev,'tv-resume');ts.log[0].ack({ok:false,error:'needs-pair'});
assert.equal(lost,1);assert.equal(tv.online,false);
tv.close();
console.log('PASS: client waits for host/phone/TV auth before subscription, retries on reconnect, and detects stale TV pairing');
