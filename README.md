# Pub Quiz Powerhouse v3.3 — Release Candidate 1

**Version:** `3.3.0-rc.1`  
**Status:** Release candidate for final staging verification, **not production**.  
**Branch:** `release/v3.3-rc1` (do not merge into `main` until signed off).  
**Deployment:** Retain the existing v3.2 Render production service; test RC1 using the separate staging service.

Two experiences are available: **Classic Pub Quiz** (equal points for correct answers) and **TV Game Show** (speed bonuses for simultaneous answers and exclusive first-buzzer rounds). The release candidate retains 24 Quiz Society avatars, 72 Correct/Wrong/Win portraits, the audio library and quizmaster-approved phone joining.

**Staging acceptance evidence:** On 20 October 2026, the quiz owner reported successful real-device tests of team approvals, TV pairing, Classic marking and corrections, Game Show buzzer locks/penalties/timers, browser/phone/TV reconnect, Render restart recovery, end-of-quiz win display, and an eight-question two-round playthrough. These are **reported test outcomes**, not an automated test of RC1 itself. All prior local tests must still be repeated against RC1 on staging.

For the exact release checklist, operational limitations and QA sign-off, see [V3.3_RC1_RELEASE_NOTES.md](V3.3_RC1_RELEASE_NOTES.md) and [V3.3_RELEASE_CHECKLIST.md](V3.3_RELEASE_CHECKLIST.md). On Windows run `run-release-checks.bat`; on a Node-enabled computer use `npm ci && npm test`. The main quiz session and scores remain stored in the quizmaster browser; clearing browser storage or losing that device is not a recoverable server-side backup.

---

## Historical development notes (Alpha 7 and earlier)

# Pub Quiz Powerhouse v3.3 Alpha 7 — relay security verification

**Development build; do not update production Render yet.** This release prevents malformed relay messages from crashing the server and includes strengthened local testing and avatar checks. Extract it on Windows and double-click `run-release-checks.bat`; return `LIVE_TEST_RESULTS.txt` to ChatGPT. See [V3.3_ALPHA7_RELEASE_NOTES.md](V3.3_ALPHA7_RELEASE_NOTES.md). Real phones/TV and Render staging remain untested.

---

# Pub Quiz Powerhouse v3.3 Alpha 6 — pre-release multiplayer checks

**Development version only.** Alpha 6 is not the public v3.3 release. Keep your production Render service deploying from `main` until all real-device and staging tests are passed. Use `run-release-checks.bat` on Windows after extraction to install missing dependencies and run the real Socket.io integration test. See `V3.3_ALPHA6_RELEASE_NOTES.md`.

# Pub Quiz Powerhouse — v3.3.0-alpha.5 (Team Approval)

**Development build — keep the live v3.2 service unchanged.** This adds a quizmaster-controlled phone join queue to the dual-experience (Classic Pub Quiz / TV Game Show) foundation.

**To host:** Setup → **From their phones** → leave **Quizmaster must approve phones before they join** checked. When a guest scans the QR code and selects a team, an **Approve / Reject** request appears on the Host and Setup screens. Guests wait on their phones until approved. Approved phones reconnect to the same team automatically when their session is still valid.

For full feature details, limitations, tests and safe deployment instructions see [V3.3_ALPHA5_RELEASE_NOTES.md](V3.3_ALPHA5_RELEASE_NOTES.md).

**Tests:** `npm run test:offline` runs security, host approval and scoring tests without dependencies. `npm test` includes the real Socket.io test and needs `npm ci`. The optional browser approval test uses Python Playwright + Chromium: `python test/browser-join-approval.py`.

---

# Pub Quiz Powerhouse — v3.3.0-alpha.4 (Stage D, multiplayer hardening)

**Development preview only. Do not replace live v3.2 on Render yet.** This build adds authenticated phone sessions, relay-side team-binding, private phone response channels, TV pairing checks and reconnect sequencing. It includes Classic and TV Game Show gameplay from Alphas 2–3.

See [V3.3_ALPHA4_RELEASE_NOTES.md](V3.3_ALPHA4_RELEASE_NOTES.md) for improvements, test results, security limitations and the manual device checklist.

Run on Windows: unzip into a separate folder, then double-click **start.bat**. After installing dependencies, open **http://localhost:3000/** in Chrome.

**Alpha 4 security boundary:** the relay prevents registered phones from spoofing other phones/teams. Alpha 5 adds default host approval when selecting a team. Neither is verified real-world identity.

**Recovery boundary:** the host's quiz/scores still live in that browser's local storage. A Render restart may require re-pairing the TV. The app is intended for one Render instance, not horizontal scaling.

---


# Pub Quiz Powerhouse — v3.2 Quiz Society Edition

**What's new:** the 24 premium Quiz Society avatars are now part of the game, with Correct, Wrong and Win reactions. All supplied game sounds and music remain in place.

**Windows (first run):** Extract the ZIP into a new folder and double-click `start.bat` inside that folder. The launcher installs Express and Socket.io automatically the first time (internet needed). Then open `http://localhost:3000/`. Keep the black server window open while playing. Use Setup → Edit avatar to select one of the 24 portraits.

**Important:** the uploaded ZIP supplied three reaction states per character, but no neutral Idle state. The Correct image acts as the resting portrait for now. The full-resolution original PNGs remain in your separate `PUB QUIZ AVATARS.zip`. See `AVATAR_ASSET_LIBRARY.md` for details.

---

> **Quiz Night Live 3.1 redesign:** 24 original team avatars, upgraded TV/host/phone layouts and the preserved user-supplied audio library. See [REDESIGN_RELEASE_NOTES.md](REDESIGN_RELEASE_NOTES.md) for details and testing limitations.

# Pub Quiz Powerhouse

A full quiz night. The **TV shows the questions**, each **team buzzes on their own phone**, and the **quizmaster** runs everything from a laptop, tablet or phone.

| Who | Address | What they see |
|---|---|---|
| **Quizmaster** | the main address (`/`) | Setup, questions with answers, marking and scores |
| **The TV** | `/tv` | The question, timer, buzzers and leaderboard. Never the answer until you reveal it. |
| **Each team's phone** | Scan the QR code | Their buzzer, A to D options or a typing box |

You can run it two ways, with the same files:

| | On a laptop | Online (Render, free) |
|---|---|---|
| Needs internet | No | Yes |
| Phones and TV must be on the same Wi-Fi | Yes | No |
| Setup on the night | Double-click `start.bat` | None, just open the website |
| First load | Instant | Up to a minute if nobody has used it for 15 minutes |

## Running a quiz night

1. **Quizmaster:** open the main address. Pick your teams and questions in **Setup**.
2. In **Setup, step 2**, choose **From their phones**. A QR code and room code appear.
3. **TV:** open the `/tv` address in the TV's web browser. It shows a 4-digit code.
4. **Quizmaster:** type that code under **Show the quiz on a smart TV**, then press **Connect TV**. The TV now follows the quiz by itself. Press OK on the remote once to turn on its sound.
5. **Teams** scan the QR code on the TV and tap their team name.
6. Run the quiz from the **Host** tab. Press **N** for the next question and **A** to reveal the answer. Press **?** to see every shortcut.

**Laptop plugged into the TV with HDMI?** You don't need steps 3 and 4. Open the **Player screen** tab on the TV instead.

**The TV remembers its quiz.** If it's switched off or refreshed, it reconnects by itself. To show a different quiz, press any button on the remote and choose **Show a different quiz**.

Your quizzes, teams and scores are saved in the quizmaster's browser.

## Running it on a laptop

### First time only
1. Install **Node.js** from **nodejs.org**. Choose the version marked **LTS** and click Next through the installer.
2. Unzip the `pub-quiz-powerhouse` folder somewhere easy to find, such as your Desktop.

### Each quiz night
1. Double-click **`start.bat`**. On a Mac, double-click `start.command` instead.
2. A black window opens. **Leave it open**, because closing it stops the quiz.
3. The first time, Windows Firewall asks about Node.js. Tick **Private networks** and click **Allow**. If you skip this, phones and the TV can't connect.
4. The quizmaster page opens in your browser. The black window also shows the TV's address, for example `http://192.168.1.20:3000/tv`.

## Putting it online for free

You do this once. It takes about 15 minutes.

### Part 1: put the files on GitHub
1. Sign in at **github.com**. Click the **+** at the top right, then **New repository**.
2. Name it `pub-quiz-powerhouse`, choose **Private** if you like, and click **Create repository**.
3. Click **uploading an existing file**.
4. Open the unzipped `pub-quiz-powerhouse-repo` folder and select **everything inside it**: the files and the `public` and `test` folders. Drag them onto the GitHub page using Chrome or Edge.
5. When the uploads finish, click **Commit changes**.

On the repository page, `server.js` and `package.json` should be listed directly. If you see only one folder instead, see the table at the end.

### Part 2: run it on Render
1. Go to **render.com** and sign in with GitHub.
2. Click **+ New**, then **Web Service**, then choose `pub-quiz-powerhouse`.
3. Fill in these boxes. Leave anything not listed as it is.

| Box | Type this |
|---|---|
| Name | `pub-quiz-powerhouse` (this becomes your web address) |
| Language | `Node` |
| Build Command | `npm install --omit=dev` |
| Start Command | `node server.js` |
| Instance Type | **Free** |

4. Click **Deploy Web Service** and wait until it says **Live**.
5. Your address appears at the top left. Render may add letters to make it unique, for example `https://pub-quiz-powerhouse-ab12.onrender.com`. Use that exact address.

### Updating it later
On GitHub, click **Add file**, then **Upload files**, and drag in the changed files (or the whole folder again, because GitHub replaces files with the same name). Click **Commit changes**. Render updates the website by itself within a few minutes.

## If something goes wrong

| Problem | Fix |
|---|---|
| A phone or the TV can't connect (laptop) | Make sure it's on the **same Wi-Fi** as the laptop, not mobile data or a guest network. Check that you allowed Node.js through the firewall. |
| "Another quiz is using this room code" | In Setup step 2, tap **New room code**. |
| The TV says "Waiting for the quizmaster" | The quizmaster's page is closed or offline. Open it again on the quizmaster's device. |
| Phone buzzers say they "need the quiz server" | The quiz was opened from a saved file. Open it from its web address instead. |
| Online: the page takes a minute to appear | The free server was asleep. It stays awake while you play. |
| Online: the page keeps loading forever | Check you're using your exact Render address, including any extra letters. |
| Render: `Cannot find module` in the logs | The files went up inside a folder. In Render, open **Settings**, set **Root Directory** to that folder's name, save, then click **Manual Deploy**. |
| "Port 3000 is already in use" | The quiz is already running in another black window. Use that one. |

## For tinkering

- `public/index.html` is the whole quiz in one file: the quizmaster console, the TV screen and the phone buzzer.
- `server.js` serves the quiz and tells it which address to put in the QR code.
- `relay.js` passes messages between the quizmaster, the phones and the TV. Only the quizmaster can read teams' answers or change scores.
- `public/fonts/` holds the two typefaces, Fraunces and Atkinson Hyperlegible. Both are free under the SIL Open Font Licence.
- **Testing:** run `npm install` once (needs internet), then `npm test`.
- **Forcing the QR address:** set `PUBLIC_URL`, for example `https://quiz.example.com`.
- **Changing the port:** set `PORT=4000` before starting.
