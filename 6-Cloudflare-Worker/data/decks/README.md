# Vocabulary files (decks)

**Rule:** every vocabulary file gets its **own named sub-section** inside the skill section it belongs to,
and its words are split into **its own categories** (levels). Never merge a file into another set
(General / IELTS / TOEFL in «یادگیری», or another file).

| file | section (`meta.json` → `section`) | sub-section name | categories |
|---|---|---|---|
| `awl.json` | `reading` | AWL — واژگان آکادمیک | List 1–10 |
| `cambridge.json` | `reading` | لغات مهم ریدینگ‌های کمبریج ۹ تا ۲۰ | Cambridge 9 … 20 + core words |
| `ir0.json` | `reading` | اینساید ریدینگ اینترو (Inside Reading Intro) | Unit 1–10 |
| `ir1.json` | `reading` | اینساید ریدینگ ۱ (Inside Reading 1) | Unit 1–10 |
| `ir2.json` | `reading` | اینساید ریدینگ ۲ (Inside Reading 2) | Unit 1–10 |
| `listening.json` | `listening` | ۱۲۰۰ لغت پرتکرار لیسنینگ آیلتس | 27 topics |

UI: `#/reading` (tabs: passages · each reading deck) and `#/listening` (tabs: each listening deck);
route of a deck = `#/<section>/@<deck-id>`.
Books with passages & exercises (Inside Reading `ir0`–`ir2`) also have `public/js/inside_data.js` (lazy-loaded by `public/js/inside.js`):
book → units (`#/reading/@ir1/3`) → 2 readings (True/False) · exercises with answer key · the unit's target-word deck.
Seed only new decks with `python3 scripts/build_decks.py --migrate N --only id1,id2` (never rewrite applied migrations). A new section (e.g. `writing`) needs a view like `V.listening` in `public/js/ui.js`.

Add a file: write `data/decks/<id>.json` + an entry in `meta.json`, then
`python3 scripts/build_decks.py --migrate <next free migration number>` (never rewrite applied migrations;
`--cats N` writes only names/levels).
