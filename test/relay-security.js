'use strict';
/* No npm install required: exercise the relay's Socket.io protocol boundary with a mock namespace. */
const assert = require('node:assert/strict');
const {attach,parseTopic} = require('../relay');
const events=[];
let serial=0;
const sockets=new Map();
let connected;
const nsp={sockets, on(ev,fn){if(ev==='connection')connected=fn;}};
const io={of(path){assert.equal(path,'/quiz');return nsp;}};
const relay=attach(io);
function client(){
  const id='sock'+(++serial), subs=new Set(), handlers=new Map();
  const s={id,data:{},messages:[],join(t){subs.add(t);},leave(t){subs.delete(t);},
    on(ev,fn){handlers.set(ev,fn);},
    emit(ev,p){s.messages.push({ev,p});},
    to(topic){return {emit(ev,p){for(const other of sockets.values()) if(other!==s&&other.subs.has(topic))other.emit(ev,p);}}},
    subs,send(ev,p,fn){const h=handlers.get(ev);assert.ok(h,`handler ${ev}`);h(p,fn);},
    request(ev,p){let response;this.send(ev,p,r=>response=r);return response;},
    disconnect(){handlers.get('disconnect')();sockets.delete(id);}
  };
  sockets.set(id,s);connected(s);return s;
}
const P='pqpowerhouse/v1/ROOM42/';
const msg=(s,k,cid,team,extra={})=>s.send('pub',{topic:P+'in',msg:JSON.stringify({k,cid,team,...extra})});
function drain(s){const arr=s.messages.filter(m=>m.ev==='msg');s.messages=[];return arr;}
const host=client(),phone=client(),other=client(),attacker=client();
assert.equal(phone.request('phone-auth',{room:'ROOM42',cid:'phone123',secret:'x'.repeat(32)}).ok,false,'no unclaimed room');
assert.equal(host.request('claim',{room:'ROOM42',token:'h'.repeat(32)}).ok,true);
assert.equal(host.request('sub',{topic:P+'in'}).ok,true);
assert.equal(attacker.request('sub',{topic:P+'in'}).ok,false,'answers private to host');
assert.equal(attacker.request('sub',{topic:P+'out/phone123'}).ok,false,'reply private to registered phone');
assert.equal(attacker.request('sub',{topic:P+'screen/SECRETKEY1'}).ok,false,'screen protected even if key guessed');
const auth={room:'ROOM42',cid:'phone123',secret:'x'.repeat(32)};
assert.equal(phone.request('phone-auth',auth).ok,true);
assert.equal(other.request('phone-auth',{...auth,secret:'y'.repeat(32)}).ok,false,'cannot hijack CID');
assert.equal(phone.request('sub',{topic:P+'out/phone123'}).ok,true);
assert.equal(phone.request('sub',{topic:P+'out/other123'}).ok,false,'cannot spy on another phone');
assert.equal(other.request('phone-auth',{room:'ROOM42',cid:'other123',secret:'z'.repeat(32)}).ok,true);
assert.equal(other.request('sub',{topic:P+'out/phone123'}).ok,false);
msg(attacker,'buzz','phone123','A');
assert.equal(drain(host).length,0,'unregistered attacker message is dropped');
msg(phone,'buzz','other123','A');
assert.equal(drain(host).length,0,'forged CID is dropped');
msg(phone,'buzz','phone123','A');
assert.equal(drain(host).length,0,'unassigned phones cannot buzz');
msg(phone,'join','phone123','A');
assert.equal(drain(host).length,1,'join reaches host');
assert.equal(host.request('phone-assign',{room:'ROOM42',cid:'phone123',team:'A'}).ok,true);
msg(phone,'buzz','phone123','B');
assert.equal(drain(host).length,0,'cross-team buzz rejected by server');
msg(phone,'buzz','phone123','A');
assert.equal(drain(host).length,1,'bound team buzz reaches host');
phone.send('pub',{topic:P+'state',msg:'{"phase":"fake"}',retain:true});
assert.equal(relay.rooms.get('ROOM42').retained.size,0,'phones cannot forge state');
host.send('pub',{topic:P+'state',msg:'{"phase":"lobby"}',retain:true});
assert.equal(other.request('sub',{topic:P+'state'}).ok,true);
assert.equal(drain(other)[0].p.msg,'{"phase":"lobby"}','late phone gets retained lobby state');
other.send('pub',{topic:P+'in',msg:'not-json',retain:true});
assert.equal(drain(host).length,0,'malformed messages ignored');
host.send('pub',{topic:P+'out/phone123',msg:'{"k":"joined"}',retain:true});
assert.equal(drain(phone)[0].p.msg,'{"k":"joined"}');
assert.equal(relay.rooms.get('ROOM42').retained.has(P+'out/phone123'),false,'private replies not retained');
const tv=client();
assert.equal(tv.request('sub',{topic:P+'screen/SECRETKEY1'}).ok,false);
const code=tv.request('pair-request',{}).code;
assert.match(code,/^\d{4}$/);
assert.equal(attacker.request('pair',{code,room:'ROOM42',key:'SECRETKEY1'}).ok,false);
assert.equal(host.request('pair',{code,room:'ROOM42',key:'SECRETKEY1'}).ok,true);
assert.equal(tv.request('sub',{topic:P+'screen/SECRETKEY1'}).ok,true);
assert.equal(attacker.request('tv-resume',{room:'ROOM42',key:'WRONGKEY11'}).ok,false);
const tvReconnected=client();
assert.equal(tvReconnected.request('tv-resume',{room:'ROOM42',key:'SECRETKEY1'}).ok,true);
assert.equal(tvReconnected.request('sub',{topic:P+'screen/SECRETKEY1'}).ok,true);
assert.equal(host.request('pair',{code,room:'ROOM42',key:'SECRETKEY1'}).ok,false,'pair code one-use');
const phoneReconnected=client();
assert.equal(phoneReconnected.request('phone-auth',auth).ok,true,'same secret resumes');
assert.equal(phoneReconnected.request('sub',{topic:P+'out/phone123'}).ok,true);
msg(phoneReconnected,'buzz','phone123','A');
assert.equal(drain(host).length,1,'assigned team preserved through reconnection');
assert.equal(parseTopic('pqpowerhouse/v1/ROOM42/screen/SECRETKEY1').kind,'screen');
console.log('PASS: room ownership, phone auth, CID spoofing, team binding, private replies, retained-state boundaries, TV pairing, phone/TV reconnect');
for(const s of [...sockets.values()])s.disconnect();
