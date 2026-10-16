'use strict';
/** Checks the relay: ownership, retained state, privacy and TV pairing. */
const assert = require('assert');
process.env.NO_OPEN = '1';
process.env.PORT = '3989';
const { server } = require('../server');
const { io } = require('socket.io-client');
const URL = 'http://localhost:3989/quiz';
const P = 'pqpowerhouse/v1/ROOM42/';
const connect = () => new Promise((r) => { const s = io(URL, { transports: ['websocket'] }); s.on('connect', () => r(s)); });
const call = (s, ev, d) => new Promise((r) => s.emit(ev, d, r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const inbox = (s) => { const got = []; s.on('msg', (m) => got.push(m)); return got; };

(async () => {
  await new Promise((r) => (server.listening ? r() : server.once('listening', r)));
  const host = await connect();
  const hostIn = inbox(host);
  assert.ok((await call(host, 'claim', { room: 'ROOM42', token: 'a'.repeat(24) })).ok);
  assert.ok((await call(host, 'sub', { topic: P + 'in' })).ok);

  // someone else can't take the room or eavesdrop on answers
  const thief = await connect();
  assert.ok(!(await call(thief, 'claim', { room: 'ROOM42', token: 'b'.repeat(24) })).ok, 'room is owned');
  assert.ok(!(await call(thief, 'sub', { topic: P + 'in' })).ok, 'only the quizmaster hears phones');

  // retained state reaches a phone that joins late
  host.emit('pub', { topic: P + 'state', msg: '{"phase":"lobby"}', retain: true });
  await wait(50);
  const phone = await connect();
  const phoneIn = inbox(phone);
  await call(phone, 'sub', { topic: P + 'state' });
  await call(phone, 'sub', { topic: P + 'out/p123' });
  await wait(50);
  assert.strictEqual(phoneIn[0].msg, '{"phase":"lobby"}', 'late joiner gets the current state');

  // phones can't fake the state
  thief.emit('pub', { topic: P + 'state', msg: '{"phase":"end"}', retain: true });
  await wait(50);
  assert.strictEqual(phoneIn.length, 1, 'fake state ignored');

  // phone -> quizmaster, quizmaster -> one phone
  phone.emit('pub', { topic: P + 'in', msg: '{"cid":"p123","k":"buzz"}' });
  host.emit('pub', { topic: P + 'out/p123', msg: '{"k":"joined"}' });
  await wait(80);
  assert.ok(hostIn.some((m) => m.msg.includes('buzz')), 'quizmaster receives buzz');
  assert.ok(phoneIn.some((m) => m.msg.includes('joined')), 'phone receives reply');

  // TV pairing
  const tv = await connect();
  const tvIn = inbox(tv);
  const { code } = await call(tv, 'pair-request', {});
  assert.ok(/^\d{4}$/.test(code));
  const paired = new Promise((r) => tv.once('paired', r));
  assert.ok(!(await call(thief, 'pair', { code, room: 'ROOM42', key: 'SECRETKEY1' })).ok, 'only the quizmaster can pair');
  assert.ok((await call(host, 'pair', { code, room: 'ROOM42', key: 'SECRETKEY1' })).ok);
  const p = await paired;
  assert.deepStrictEqual(p, { room: 'ROOM42', key: 'SECRETKEY1' });
  host.emit('pub', { topic: P + 'screen/SECRETKEY1', msg: '{"v":1,"s":{}}', retain: true });
  await call(tv, 'sub', { topic: P + 'screen/SECRETKEY1' });
  await wait(50);
  assert.ok(tvIn.some((m) => m.topic.endsWith('screen/SECRETKEY1')), 'TV receives display state');
  assert.ok(!(await call(host, 'pair', { code, room: 'ROOM42', key: 'SECRETKEY1' })).ok, 'codes are single use');

  // QR address follows the website when hosted, and the Wi-Fi address on a laptop
  const hosted = await (await fetch('http://localhost:3989/api/base', { headers: { 'x-forwarded-host': 'pub-quiz.onrender.com', 'x-forwarded-proto': 'https' } })).json();
  assert.strictEqual(hosted.base, 'https://pub-quiz.onrender.com');
  const tvPage = await fetch('http://localhost:3989/tv');
  assert.strictEqual(tvPage.status, 200, 'TV page is served');
  console.log('quiz relay: ownership, privacy, retained state and TV pairing all pass');
  console.log(`server: hosted QR base ${hosted.base}, /tv page served`);
  [host, thief, phone, tv].forEach((s) => s.close());
  server.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
