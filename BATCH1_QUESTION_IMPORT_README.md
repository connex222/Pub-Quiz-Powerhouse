# Pub Quiz Powerhouse — Batch 1 Question Library (LOCAL TEST BUILD)

**Do not upload publicly until QuizDemon usage rights are confirmed.** This is an isolated test ZIP based on v3.3 RC1, not a production release. It does NOT change GitHub or Render.

## What's included

- The four existing built-in quizzes, original starter questions, avatars, sound and all multiplayer code remain present.
- **12 additional selectable QuizDemon quizzes**, with **594 individual prompts** occupying **600 numbered scoring slots**, **72 original rounds** and **24 additional tie-breakers**.
- Quiz selection: open **Setup → Quiz library**, select **QuizDemon 101, 228, ...**, click **Load quiz**. The library allows overriding the answer mode.
- Ordinary general-knowledge and final-round questions default to **typed answers** on phones; themed/puzzle/link rounds default to **written/manual marking** so the quizmaster can grade multi-part and order-dependent answers correctly. You may change a round to **buzzers** for TV Game Show, but read the question format before changing; some questions cannot be meaningfully auto-marked.
- Link-a-Letter rounds retain their **exact source order**, hidden mystery phrase, and optional clue. Quiz Link and other themed rounds retain their instructions and special point values.
- Five obvious editorial fixes applied, recorded in the audit; three duplicates kept *within their original themed quizzes* so deleting them cannot break puzzles. The app library contains duplicate questions across packs (not a randomised de-duplicated question pool).

## Technical details

- `public/question-banks/quizdemon-batch1.js` is loaded before the main app and adds the 12 quizzes to `BUILTIN_QUIZZES` non-destructively.
- `public/question-banks/quizdemon-batch1.json` is the editable complete question bank with durable per-question IDs.
- `batch1-import-review.csv` is a source-by-source editorial tracker, including confirmed duplicates.
- No automatic repeated-fact suppression is applied within these full source quiz sets; special puzzle answers are dependent on source question order. For future free-form quiz generation, implement a separately deduplicated pool.
- Existing saved quizzes are preserved by the app's regular storage keys; loading any other quiz normally resets *current* round and scores after confirmation.
- Imported questions are **not all fact-checked**. Historic claims and potentially incorrect answers remain for manual review. Do not automatically trust the PDF answers as current.

## Rights and deployment

The PDFs include third-party QuizDemon copyright notices. Possession of these files does not establish permission to publicly republish them. This build is for your local review; confirm what your licence permits before hosting the question bank on Render, pushing to a public GitHub repository or selling the app.

## Test instructions

Extract the ZIP on Windows; run `start.bat` and open the localhost address. For offline integration testing on Linux/macOS, serve `public/` with any local HTTP server. Choose a new QuizDemon quiz from Setup → Quiz library and verify Link-a-Letter and score handling.
