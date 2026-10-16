'use strict';
/**
 * Pub Quiz Powerhouse — message relay.
 *
 * The quizmaster's browser runs the quiz (all rules, scores and questions live there).
 * This relay passes messages between that browser, the team phones and any TV screens,
 * replacing the public internet relays the single-file version used.
 *
 * Topics look like:  pqpowerhouse/v1/<ROOM>/<channel>
 *   in               phones -> quizmaster (buzzes, joins, typed answers). Only the quizmaster may listen.
 *   state            quizmaster -> phones (what phones may see; never the answer before it's revealed)
 *   out/<phoneId>    quizmaster -> one phone
 *   screen/<key>     quizmaster -> paired TV screens (the full display state)
 *
 * The first browser to claim a room with its secret token owns it. Only the owner can publish
 * anything other than "in", so a phone can't fake the scoreboard or read other teams' answers.
 */
const crypto = require('crypto');

const PREFIX = 'pqpowerhouse/v1/';
const ROOM_RE = /^[A-Z0-9]{4,8}$/;
const MAX_MSG = 600 * 1024; // a large quiz's full display state fits comfortably
const ROOM_IDLE_MS = 12 * 60 * 60 * 1000;
const PAIR_TTL_MS = 15 * 60 * 1000;
const RATE_PER_SEC = 40;

function parseTopic(topic) {
  if (typeof topic !== 'string' || topic.length > 120 || !topic.startsWith(PREFIX)) return null;
  const [room, ...rest] = topic.slice(PREFIX.length).split('/');
  if (!ROOM_RE.test(room)) return null;
  const channel = rest.join('/');
  if (channel === 'in' || channel === 'state') return { room, channel, kind: channel };
  if (/^out\/[a-z0-9]{1,40}$/i.test(channel)) return { room, channel, kind: 'out' };
  if (/^screen\/[A-Za-z0-9]{6,32}$/.test(channel)) return { room, channel, kind: 'screen' };
  return null;
}

function attach(io) {
  const nsp = io.of('/quiz');
  /** room -> { owner: token, retained: Map<topic,string>, touched } */
  const rooms = new Map();
  /** 4-digit code -> { socketId, expires } */
  const pairCodes = new Map();

  const roomFor = (name) => {
    let r = rooms.get(name);
    if (!r) { r = { owner: null, retained: new Map(), touched: Date.now() }; rooms.set(name, r); }
    r.touched = Date.now();
    return r;
  };

  nsp.on('connection', (socket) => {
    const owns = new Set(); // rooms this socket has claimed
    let bucket = RATE_PER_SEC;
    let bucketAt = Date.now();
    const allow = () => {
      const now = Date.now();
      bucket = Math.min(RATE_PER_SEC, bucket + ((now - bucketAt) / 1000) * RATE_PER_SEC);
      bucketAt = now;
      if (bucket < 1) return false;
      bucket -= 1;
      return true;
    };
    const ack = (fn, payload) => { if (typeof fn === 'function') fn(payload); };

    // Quizmaster claims a room with a secret token kept in their browser.
    socket.on('claim', ({ room, token } = {}, fn) => {
      if (!ROOM_RE.test(String(room)) || typeof token !== 'string' || token.length < 16 || token.length > 64) return ack(fn, { ok: false });
      const r = roomFor(room);
      if (r.owner && r.owner !== token) return ack(fn, { ok: false, error: 'taken' });
      r.owner = token;
      owns.add(room);
      ack(fn, { ok: true });
    });

    socket.on('sub', ({ topic } = {}, fn) => {
      const t = parseTopic(topic);
      if (!t) return ack(fn, { ok: false });
      if (t.kind === 'in' && !owns.has(t.room)) return ack(fn, { ok: false });
      socket.join(topic);
      const r = rooms.get(t.room);
      const kept = r && r.retained.get(topic);
      if (kept) socket.emit('msg', { topic, msg: kept });
      ack(fn, { ok: true });
    });

    socket.on('unsub', ({ topic } = {}) => { if (typeof topic === 'string') socket.leave(topic); });

    socket.on('pub', ({ topic, msg, retain } = {}) => {
      if (!allow()) return;
      const t = parseTopic(topic);
      if (!t || typeof msg !== 'string' || msg.length > MAX_MSG) return;
      if (t.kind !== 'in' && !owns.has(t.room)) return;
      const r = roomFor(t.room);
      if (retain) {
        if (msg === '') r.retained.delete(topic);
        else r.retained.set(topic, msg);
      }
      if (msg !== '') socket.to(topic).emit('msg', { topic, msg });
    });

    // ----- TV pairing: the TV shows a 4-digit code, the quizmaster types it in -----
    socket.on('pair-request', (_d, fn) => {
      for (const [code, p] of pairCodes) if (p.socketId === socket.id) pairCodes.delete(code);
      let code;
      let tries = 0;
      do { code = String(crypto.randomInt(1000, 10000)); } while (pairCodes.has(code) && ++tries < 50);
      pairCodes.set(code, { socketId: socket.id, expires: Date.now() + PAIR_TTL_MS });
      ack(fn, { ok: true, code });
    });

    socket.on('pair', ({ code, room, key } = {}, fn) => {
      const c = String(code || '').trim();
      const p = pairCodes.get(c);
      if (!owns.has(String(room)) || !/^[A-Za-z0-9]{6,32}$/.test(String(key))) return ack(fn, { ok: false, error: 'Turn on phone buzzers first.' });
      if (!p || p.expires < Date.now()) return ack(fn, { ok: false, error: 'No TV is showing that code. Check the number on the TV.' });
      const tv = nsp.sockets.get(p.socketId);
      if (!tv) { pairCodes.delete(c); return ack(fn, { ok: false, error: 'That TV has gone offline. Refresh the TV page for a new code.' }); }
      pairCodes.delete(c);
      tv.emit('paired', { room, key });
      ack(fn, { ok: true });
    });

    socket.on('disconnect', () => {
      for (const [code, p] of pairCodes) if (p.socketId === socket.id) pairCodes.delete(code);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [name, r] of rooms) if (now - r.touched > ROOM_IDLE_MS) rooms.delete(name);
    for (const [code, p] of pairCodes) if (p.expires < now) pairCodes.delete(code);
  }, 10 * 60 * 1000).unref();

  return { rooms, pairCodes };
}

module.exports = { attach, parseTopic, PREFIX };
