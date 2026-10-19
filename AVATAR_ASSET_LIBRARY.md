# Quiz Society — v3.2 avatar assets

## Included

- 24 human-first premium Quiz Society characters, named in `public/assets/avatars/manifest.json`.
- All 72 reaction artworks integrated as 512 × 512 transparent WebP.
- State names: `correct`, `wrong`, `win`.
- **Temporary Idle fallback:** `correct` portraits, because no neutral Idle files were in the uploaded ZIP. The selection gallery and resting screens show Correct.
- 24 former v3.1 SVG mascot portraits preserved in `public/assets/avatars/_legacy-v3.1/` as backup only.
- Original full-size PNG files are unchanged in the user-supplied `PUB QUIZ AVATARS.zip`; keep that archive as master artwork.

## Reaction rules

- Manual Correct/Wrong marking and automatic multiple-choice/typed marking trigger state changes for ~3.5 seconds.
- A correctly marked answer gets Correct even with zero speed points.
- When the quiz ends, top-scoring team(s) get Win; if a tiebreaker resolves first place, only the selected champion gets Win.
- TV and phone clients display the host's reaction and winning state; expiry reverts without restarting or additional network traffic.
- Other teams stay on Idle fallback until a relevant event occurs.

## Replacing the idle fallback later

Add 24 new `slug-idle.webp` files to `public/assets/avatars/quiz-society/`, then change `avatarSrc` in `public/index.html` to route `state === 'idle'` to that file, and update `manifest.json`. Do not repurpose Wrong or Win as the idle state.

## File names

Example: `professor-correct.webp`, `professor-wrong.webp`, `professor-win.webp`. All names are lowercase hyphenated.
