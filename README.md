# ECKEY THUMP — v1.0 Showtime Showdown

**Private games-night comedy competition for 3–12 friends, playing in one home or up to several homes.**

## Run on Windows

1. Extract this ZIP and open the `ECKEY-THUMP-Game-Night-v1.0-Showdown` folder.
2. Double-click `START-GAME-WINDOWS.bat` (Node.js 20+ required).
3. Create a room and have friends scan the room-specific QR code.
4. Play lobby music by pressing **PLAY LOBBY MUSIC** on the TV or host page.
5. To hear round effects, press **ENABLE SHOW SFX** on the TV. Keep other devices muted to avoid echoes.
6. Choose a humour rating, game length and pace, then start the match with at least three players.

See `START-HERE-v1.0.md` for setup details and `docs/SHOWDOWN-v1.0.md` for the v1.0 changes.

## Playing across multiple homes

Host a *single* server using Render and share the publicly hosted HTTPS invitation; `localhost` is not accessible outside the hosting computer. Each household may have its own read-only TV display.

## Technical information

- Node.js (no npm dependencies), server-authoritative multiplayer and Server-Sent Events.
- Five challenges, replayable card deck and original humour library.
- 32 avatar choices, in-room QR code, optional soundtrack and opt-in synthesised game sound cues.
- Automated checks: run `npm test`.
- Content review: open `CONTENT-REVIEW.html` locally; the review file does not change the live game.

**Not yet ready for public commercial distribution.** Payments and public matchmaking are not enabled; adult-content safety review and real-world device testing remain necessary.
