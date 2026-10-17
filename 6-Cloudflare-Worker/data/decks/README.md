# Vocabulary files (decks)

**Rule:** every vocabulary file gets its **own named sub-section** inside the skill section it belongs to,
and its words are split into **its own categories** (levels). Never merge a file into another set
(General / IELTS / TOEFL in «یادگیری», or another file).

| file | section (`meta.json` → `section`) | sub-section name | categories |
|---|---|---|---|
| `awl.json` | `reading` | AWL — واژگان آکادمیک | List 1–10 |
| `cambridge.json` | `reading` | لغات مهم ریدینگ‌های کمبریج ۹ تا ۲۰ | Cambridge 9 … 20 + core words |
| `listening.json` | `listening` | ۱۲۰۰ لغت پرتکرار لیسنینگ آیلتس | 27 topics |

UI: `#/reading` (tabs: passages · each reading deck) and `#/listening` (tabs: each listening deck);
route of a deck = `#/<section>/@<deck-id>`. A new section (e.g. `writing`) needs a view like `V.listening` in `public/js/ui.js`.

Add a file: write `data/decks/<id>.json` + an entry in `meta.json`, then
`python3 scripts/build_decks.py --migrate <next free migration number>` (never rewrite applied migrations;
`--cats N` writes only names/levels).
