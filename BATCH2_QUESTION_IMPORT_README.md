# Pub Quiz Powerhouse — Weekly Quiz 745–754 Integration (BATCH 2 TEST BUILD)

This test ZIP extends **the previous Batch 1 question-library build**. The current v3.3 RC1 branch and the live v3.2 Render service have NOT been changed.

## Included

- 10 new full **text-only** quiz packs, 70 playable rounds, **668 textual questions representing 700 scoring slots**, and 20 tie-breakers.
- Quizzes keep source numbering (Rounds 2–8) because **Round 1 in each uploaded Q&A PDF is a picture/handout answer key without the original image prompts**. A reference JSON preserving 150 picture-answer entries is included in `batch2-picture-handout-answer-keys.json`; these entries cannot be used as questions until the original image/question handouts are provided.
- Four `High Fives` rounds each contain 2 multipart questions worth up to 5 points each; they default to written/manual scoring. Linked-answer/Connections and timed historical rounds preserve their question order.
- Existing first-batch QuizDemon 101/228/235/241/280/281/337/338/343/344/345/346 quiz packs, four original 50-question quizzes, built-in starter quiz questions, 24 avatars/72 reaction portraits, music and multiplayer code remain unchanged.
- Each imported question has a stable ID, category, points, and source title. Questions that potentially repeat earlier material are **flagged in `batch2-import-review.csv`**, not removed: deleting or reordering them would change the original designed quiz rounds.

## How to play

1. Extract ZIP to a new empty folder on Windows, then double-click `start.bat` (requires Node.js and npm dependencies).
2. In **Setup → Quiz library**, choose `Weekly Quiz 745 (Text Rounds)` through `Weekly Quiz 754 (Text Rounds)` and load the desired quiz. It includes rounds 2–8 and separate tie-breakers.
3. In Classic mode, use typed answers for standard rounds and quizmaster written/manual marking for puzzle/linked/multi-answer rounds. In TV Game Show, buzzers may be selected where the question format is appropriate. The existing app lets you change answer formats in Setup.
4. Compare the spelling, answers and question formatting with your source documents before production, particularly for historic and current-affairs questions.
5. Run `run-release-checks.bat` and a phone/TV smoke test before deploying this expanded library.

## Source integrity and limitations

- Quiz wording and original answers were extracted from user-supplied 2020–2021 PDFs. The app does not automatically update historical factual claims or modernise the questions. Some answers contain source notes (shown in the question data).
- Source image handouts and credited photographs are NOT supplied in the answer documents, so no image-dependent prompts are claimed as playable, and no third-party image assets were introduced.
- Question similarity and duplication checks are heuristic. Exact matches are reliable after normalization; paraphrase flags require editorial judgment. Original complete quizzes intentionally retain repeat questions rather than deleting linked items.
- This is a **local/staging test build**, not a release candidate sign-off and not a live GitHub or Render update.
