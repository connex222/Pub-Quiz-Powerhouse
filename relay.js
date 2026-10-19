'use strict';
/**
 * Pub Quiz Powerhouse v3.3 — single-instance, authenticated Socket.io relay.
 * The quizmaster remains authoritative for gameplay. This relay enforces message
 * origin and subscription boundaries. A public room code alone is NOT team auth.
 * Render must use one running instance; retained state is in memory, not durable.
 */
const crypto = require('crypto');
const PREFIX = 'pqpowerhouse/v1/';
const ROOM_RE = /^[A-Z0-9]{4,8}$/;
const CID_RE = /^[a-z0-9]{3,40}$/i;
const SECRET_RE = /^[A-Za-z0-9_-]{24,128}$/;
const SCREEN_RE = /^[A-Za-z0-9]{6,32}$/;
const MAX_MSG = 600 * 1024;
const ROOM_IDLE_MS = 12 * 60 * 60 * 1000;
const PAIR_TTL_MS = 15 * 60 * 1000;
const RATE_PER_SEC = 40;

function parseTopic(topic) {
  if (typeof topic !== 'string' || topic.length > 120 || !topic.startsWith(PREFIX)) return null;
  const [room, ...rest] = topic.slice(PREFIX.length).split('/');
  if (!ROOM_RE.test(room)) return null;
  const channel = rest.join('/');
  if (channel === 'in' || channel === 'state') return { room, channel, kind: channel };
  if (/^out\/[a-z0-9]{3,40}$/i.test(channel)) return { room, channel, kind: 'out', id: channel.slice(4) };
  if (/^screen\/[A-Za-z0-9]{6,32}$/.test(channel)) return { room, channel, kind: 'screen', key: channel.slice(7) };
  return null;
}
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
function attach(io) {
  const nsp = io.of('/quiz');
  const rooms = new Map();
  const pairCodes = new Map();
  const roomFor = (name) => {
    let r = rooms.get(name);
    if (!r) {
      r = { owner: null, retained: new Map(), touched: Date.now(), phones: new Map(), tvKeys: new Set() };
      rooms.set(name, r);
    }
    r.touched = Date.now();
    return r;
  };

  nsp.on('connection', socket => {
    const owns = new Set();
    const phones = new Map(); // room -> {cid,secret}, refreshed at every connection
    const screens = new Set(); // room/key granted only by pairing or resume
    let bucket = RATE_PER_SEC, bucketAt = Date.now();
    const allow = () => {
      const now = Date.now();
      bucket = Math.min(RATE_PER_SEC, bucket + Math.max(0, now - bucketAt) / 1000 * RATE_PER_SEC);
      bucketAt = now;
      if (bucket < 1) return false;
      bucket -= 1;
      return true;
    };
    const ack = (fn, result) => { if (typeof fn === 'function') fn(result); };
    const canSub = (t) => {
      if (t.kind === 'in') return owns.has(t.room);
      if (t.kind === 'out') return phones.get(t.room)?.cid === t.id;
      if (t.kind === 'screen') return screens.has(t.room + '/' + t.key) || !!socket.data.pairGrants?.has(t.room + '/' + t.key);
      return !!rooms.get(t.room)?.owner; // room state is intentionally visible to room-code holders
    };
    socket.on('claim', ({room,token} = {}, fn) => {
      if (!allow() || !ROOM_RE.test(String(room)) || !SECRET_RE.test(String(token))) return ack(fn, {ok:false,error:'invalid'});
      const r = roomFor(room);
      if (r.owner && !sameSecret(r.owner, token)) return ack(fn, {ok:false,error:'taken'});
      r.owner = token;
      owns.add(room);
      ack(fn, {ok:true});
    });
    socket.on('phone-auth', ({room,cid,secret} = {}, fn) => {
      if (!allow() || !ROOM_RE.test(String(room)) || !CID_RE.test(String(cid)) || !SECRET_RE.test(String(secret))) return ack(fn, {ok:false,error:'invalid'});
      const r = rooms.get(room);
      if (!r?.owner) return ack(fn, {ok:false,error:'notfound'});
      const existing = r.phones.get(cid);
      if (existing && !sameSecret(existing.secret,secret)) return ack(fn, {ok:false,error:'already-used'});
      if (!existing) {
        if (r.phones.size >= 120) return ack(fn, {ok:false,error:'room-full'});
        r.phones.set(cid, {secret,team:null,last:Date.now()});
      }
      r.phones.get(cid).last = r.touched = Date.now();
      phones.set(room, {cid,secret});
      ack(fn, {ok:true,team:r.phones.get(cid).team});
    });
    socket.on('phone-assign', ({room,cid,team} = {}, fn) => {
      if (!allow() || !owns.has(room) || !CID_RE.test(String(cid)) || (team !== null && !/^[a-z0-9_-]{1,80}$/i.test(String(team)))) return ack(fn,{ok:false});
      const p = rooms.get(room)?.phones.get(cid);
      if (!p) return ack(fn,{ok:false,error:'phone-notfound'});
      p.team = team; p.last = Date.now();
      ack(fn,{ok:true});
    });
    socket.on('sub', ({topic} = {}, fn) => {
      if (!allow()) return ack(fn,{ok:false,error:'rate'});
      const t = parseTopic(topic);
      if (!t || !canSub(t)) return ack(fn,{ok:false,error:'unauthorised'});
      socket.join(topic);
      const kept = rooms.get(t.room)?.retained.get(topic);
      if (kept) socket.emit('msg',{topic,msg:kept});
      ack(fn,{ok:true});
    });
    socket.on('unsub', ({topic} = {}) => { if (typeof topic === 'string' && parseTopic(topic)) socket.leave(topic); });
    socket.on('pub', ({topic,msg,retain} = {}) => {
      if (!allow()) return;
      const t = parseTopic(topic);
      if (!t || typeof msg !== 'string' || Buffer.byteLength(msg,'utf8') > MAX_MSG) return;
      const r = rooms.get(t.room);
      if (!r?.owner) return;
      if (t.kind !== 'in' && !owns.has(t.room)) return;
      if (t.kind === 'in') {
        const bound = phones.get(t.room), p = bound && r.phones.get(bound.cid);
        if (!p || !sameSecret(p.secret,bound.secret)) return;
        let data;
        try { data = JSON.parse(msg); } catch { return; }
        if (!data || typeof data !== 'object' || data.cid !== bound.cid || !['join','ping','buzz'].includes(data.k)) return;
        if (data.k === 'buzz' && (!p.team || data.team !== p.team)) return;
        if (data.k === 'join' && data.team !== undefined && typeof data.team !== 'string') return;
        p.last = Date.now();
      }
      r.touched = Date.now();
      // Never retain private replies or incoming answers. Bound the retained state to two channels.
      if (retain && ['state','screen'].includes(t.kind)) {
        if (!msg) r.retained.delete(topic);
        else r.retained.set(topic,msg);
      }
      if (msg) socket.to(topic).emit('msg',{topic,msg});
    });
    socket.on('pair-request', (_data, fn) => {
      if (!allow()) return ack(fn,{ok:false});
      for (const [code,p] of pairCodes) if (p.socketId === socket.id) pairCodes.delete(code);
      let code;
      for (let tries=0; tries<100;tries++) {
        const candidate=String(crypto.randomInt(1000,10000));
        if (!pairCodes.has(candidate)) { code=candidate; break; }
      }
      if (!code) return ack(fn,{ok:false,error:'busy'});
      pairCodes.set(code,{socketId:socket.id,expires:Date.now()+PAIR_TTL_MS});
      ack(fn,{ok:true,code});
    });
    socket.on('pair', ({code,room,key} = {}, fn) => {
      if (!allow() || !owns.has(room) || !SCREEN_RE.test(String(key))) return ack(fn,{ok:false,error:'Host must be connected.'});
      const c = String(code||'').trim(), p=pairCodes.get(c);
      if (!p || p.expires < Date.now()) return ack(fn,{ok:false,error:'No TV is showing that code.'});
      const tv=nsp.sockets.get(p.socketId);
      if (!tv) {pairCodes.delete(c);return ack(fn,{ok:false,error:'TV offline. Refresh its page.'});}
      pairCodes.delete(c);
      roomFor(room).tvKeys.add(key);
      // Authorise the currently connected TV before it can subscribe.
      tv.data.pairGrants ||= new Set();
      tv.data.pairGrants.add(room + '/' + key);
      tv.emit('paired',{room,key});
      ack(fn,{ok:true});
    });
    socket.on('tv-resume', ({room,key} = {}, fn) => {
      if (!allow() || !ROOM_RE.test(String(room)) || !SCREEN_RE.test(String(key)) || !rooms.get(room)?.tvKeys.has(key)) return ack(fn,{ok:false,error:'needs-pair'});
      screens.add(room+'/'+key);
      ack(fn,{ok:true});
    });
    // Grant given via paired event is also valid for sub on the original TV connection.
    socket.on('disconnect', () => {
      for (const [code,p] of pairCodes) if (p.socketId === socket.id) pairCodes.delete(code);
    });
  });
  const gc = setInterval(() => {
    const now=Date.now();
    for (const [name,r] of rooms) if (now-r.touched > ROOM_IDLE_MS) rooms.delete(name);
    for (const [code,p] of pairCodes) if (p.expires < now) pairCodes.delete(code);
  },60000);
  if (gc.unref) gc.unref();
  return {rooms,pairCodes};
}
module.exports={attach,parseTopic,PREFIX};
