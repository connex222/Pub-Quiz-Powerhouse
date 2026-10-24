# Pub Quiz Powerhouse — Premium Audio Pass

## Scope

- 21 re-mastered/rebuilt local MP3 effects (`public/assets/sfx`): buzz, correct, wrong, cheer, disappointment, join, go, countdown, tick, showdown, score gain/loss, boom, swap, dice, gunshot legacy, hop variants, reel, reel-stop and spin.
- One locally generated victory fanfare (`public/assets/music/mus-victory.mp3`).
- Three original royalty-free instrumentals generated via **Daydream** for the lobby, board and tension states, referenced in the audio controller by stable Daydream MP3 links. The existing locally bundled OGG tracks are preserved as immediate failover when the links are unavailable. **Note**: the three external generated recordings are *not vendored into this commit*. Remote links require availability of the provider; in a restricted network the game uses the local fallback automatically.
- A replacement browser sound controller: volume discipline, rapid-repeat throttling, asynchronous media-error fallback, 1-second crossfades, no new npm or runtime dependencies.

## Original generation provenance

| State | Generator | Song ID | Format | Loop |
| --- | --- | --- | --- | --- |
| Lobby | Daydream | `sng_PcWuYxLAPqASLHaEOAVRrR` | MP3 | yes |
| Board | Daydream | `sng_JrZ1hRMDTeBEGvRAjxYJN2` | MP3 | yes |
| Tension | Daydream | `sng_JXbdrpnScsF8qBG3QI7aGl` | MP3 | yes |
| Victory | Local deterministic DSP | `master_victory.py` | MP3 | no |
| All short SFX | Local deterministic DSP | `build_sfx.py` | MP3 | no |

Generated sound effects are entirely original procedural synthesis (no third-party audio samples). Do not infer a license to redistribute the original legacy music files beyond the existing project permission.

## Account/plugin assessment

- Sonilo: connected; trial allowance for text-to-music and text-to-SFX exhausted and cash balance showed zero at the time of this pass. No charge initiated.
- Mirelo: available but two distinct connected accounts; no paid generation initiated without an unambiguous account choice.
- Daydream: three tracks generated under its permitted royalty-free game-use conditions.
- Other available creative plugins were examined for audio capability but not installed or needed for this pass.

## Verification and limitations

- `npm run test:offline` — passed.
- `python test/browser-smoke.py` and `python test/browser-experiences.py` — passed.
- `node --check` on the app inline JS — passed.
- MP3 files tested with ffprobe for decodability, positive duration and two channels.
- A real phone and TV sound test and live provider-network check are **still required** before promotion into production.
- The existing three locally hosted OGG recordings remain intact. They play if the Daydream streams are unreachable.

## Operating guidance

Press the sound control on the TV or host to satisfy browser autoplay requirements. Sound and music remain user-controlled. Avoid playing music continuously on phones if the players prefer a quiet answer-entry experience. When the three Daydream MP3s can be downloaded securely into the repo, replace the remote entries in `MUSIC_SOURCES` with local `/assets/music/` paths and re-test offline.

## Follow-up hardening (24 October 2026)

- Corrected both generation scripts to write into the repository-root `public/assets/` directories regardless of invocation from `tools/`.
- Interrupted music crossfades now stop orphaned older recordings; switching off sound also immediately silences active effects.
- A browser-blocked autoplay attempt clears playback state so it can be retried after user interaction.
- Added `test/audio-regression.js` to both `npm test` and `npm run test:offline`. It tests the SFX and local fallback file paths, simulated state transitions, interrupted fades, master mute and remote-to-local music fallback without any provider network dependency.
- Locally reran offline checks, Classic/Game Show browser tests, exclusive-buzzer tests and regenerated all 22 MP3s with both scripts in a clean scratch directory.

**Still not confirmed:** physical TV/phone listening test and remote Daydream availability from the player's network. This pull request is deliberately held as a draft, and production remains on the previous working commit until explicitly promoted.
