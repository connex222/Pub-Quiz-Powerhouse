# Pub Quiz Powerhouse — Quiz Night Live redesign

Release: **3.1.0 visual and avatar update**

## What's new

- Full deep-emerald / brass / ivory visual system. Redesigned quizmaster dashboard, large-screen question stage and mobile buzzer layout.
- **24 local SVG avatars**, each illustrated as a distinctive mascot and bundled at `public/assets/avatars/<id>.svg`. All SVGs are original editable vector shapes (no remote fetches or image CDNs).
- Team avatar selector: in **Setup → Add your teams**, click the portrait next to any team. Choose a character in the gallery. Changes are saved automatically in browser storage.
- Existing teams without an avatar receive a fallback portrait when old saved data is loaded. New teams receive unused avatars automatically where available.
- Avatars appear in the host lobby, question team strip, player buzzers, scoreboard, TV leaderboard, winning podium, and mobile phone team selection and identity.
- **Original supplied sounds preserved** — 21 MP3 sound effects and 4 background music tracks (two variants of `hop` are retained with their source filenames).
- Existing sound-effects toggle remains available. Background music is OFF by default and can be enabled in Setup → Game settings.
- Selected effects are now connected: join/check-in, buzzer, correct/wrong, score award, round start and victory. Remaining sound files are retained for future gameplay events.
- 720p TV layout refinements, including compact avatar teams and two-column leaderboard for up to 10 teams.
- Original quiz content, answer modes, import/export and Socket.io relay architecture retained.

## Files

- `public/index.html`: updated visuals and UI integration. No web/CDN dependencies added.
- `public/assets/avatars/`: 24 character SVGs + `manifest.json`.
- `public/assets/sfx/`: 21 MP3 sound effects + updated `manifest.json`.
- `public/assets/music/`: four music assets.
- `AVATAR_ASSET_LIBRARY.md`: avatar list and instructions.
- `SOUND_ASSET_LIBRARY.md`: inventory of retained sound files.

## Getting started on Windows

1. Unzip the project to a normal folder (for example, your Desktop).
2. In that folder double-click `start.bat` (Node.js 18+ required).
3. Open the address shown in the terminal. By default it is `http://localhost:3000/`.
4. Open **Setup**, click each team's picture to choose an avatar, and edit the names.
5. Enable phone buzzers if you want individual phone controllers, then load your quiz and click **Start quiz**.
6. Use **Host** to run the game. Open the **Player screen** or `/tv` on a separate TV/browser as appropriate.

Your existing saved quizzes are held in the browser profile you used before. A newly extracted game folder does not move them between browsers/devices automatically. Use the game's JSON export/import to back up or transfer them.

## Audio notes

- Browsers generally block automatically started audio until someone interacts with the page. Click/tap once to enable sound.
- Sounds only play when the **Sound effects** setting is enabled.
- Background music is deliberately quieter than cues; turn it off in Setup when a live quizmaster is speaking.
- Victory music uses its own non-looping audio file; other tracks are looped.
- Sounds are now in the package and wired for some events, but not every sound asset is assigned to an event.

## Technical verification

- Extracted browser JavaScript passes `node --check`.
- Browser-based UI smoke checks (using an inline-assets test harness) exercised: main Setup view, 24-avatar selector, avatar change, quiz start, host stage, TV multiple choice and reveal, 720p layout with 4 and 10 teams, mobile team selection, and mobile multiple-choice answer tap. These checks reported no client-side JavaScript errors.
- The Socket.io / Express server source and existing test file were not modified. The Node server integration test has **not** been run in this environment because installing its external npm dependencies was unsuccessful. After `npm install` on your Windows PC, you can run `npm test` to test the relay.

## Things not changed

- No automatic switching to traditional pub-quiz scoring. The existing speed-scoring default and other scoring controls remain unchanged.
- Quiz question bank was not rewritten in this phase.
- Picture/audio question authoring and animated character expressions have not yet been added.
- The TV pairing process and networking rules remain those of the existing application.


## v3.2 — Quiz Society Edition

- Replaced 24 cartoon gallery portraits with premium Quiz Society roster (72 reaction images optimised to WebP).
- Added time-bound Correct/Wrong reactions and first-place Win imagery across host, TV and phones.
- Migrates existing saved mascot selections to new Quiz Society identities without resetting scores or quizzes.
- Preserved original SVGs under `_legacy-v3.1` and sound effects/music unchanged.
- Added first-run dependency installation to Windows launcher.
- Correct state acts as temporary neutral while Idle portraits remain unavailable.
