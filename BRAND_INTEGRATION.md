# Pub Quiz Powerhouse — Approved Crest Branding Integration

Built from the selected crowned-lions Pub Quiz Powerhouse image and its generated companion marks.

## Placements
- Setup landing screen: master gold/emerald/burgundy crest as hero title image.
- Quizmaster and shared player-screen header: horizontal gold wordmark.
- TV lobby: hero crest above welcome message.
- Host lobby: crest above buzzer check.
- Winner and finals screen: compact horizontal brand.
- Phone waiting and team screens: small crest next to 'QUIZ NIGHT LIVE'.
- Browser favicon, Apple touch icon, installed web app icons and social-sharing preview.

## Files
- `public/assets/brand/master-crest.webp`: transparent web-ready main title graphic
- `public/assets/brand/header-wordmark.webp`: transparent compact horizontal branding
- `public/assets/brand/compact-crest.webp`: compact no-text heraldic mark
- `public/assets/brand/icon-*.png`: sizes 32/180/192/512
- `public/site.webmanifest`: installable web-app branding
- `public/index.html`: semantic accessible responsive placements

## Regression / QA
- `npm run test:offline`: passed (both existing question banks, 22 imported packs, game rules, security, avatar asset validations)
- Headless Chromium: desktop 1366×900, mobile 390×844, TV 1280×720; new images decode, no page JavaScript errors, no horizontal overflow.
- Four existing browser experience tests: 3 passed. The older browser-smoke script's final screenshot path was not writable in this environment, although its preceding gameplay assertions ran.
- Other game logic, question content and imported Quiz Library not changed.
- No modifications to `main` or Render production are part of this build.
