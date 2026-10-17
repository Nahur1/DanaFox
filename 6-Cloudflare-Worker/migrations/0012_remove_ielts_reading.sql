-- v3.2: remove the IELTS "Reading" levels (ielts 4–6) from the app (words kept but deactivated)
UPDATE words SET is_active=0 WHERE category_id='ielts' AND level_no>=4;
DELETE FROM levels WHERE category_id='ielts' AND level_no>=4;
INSERT OR REPLACE INTO meta(key,value) VALUES('words_version',CAST(strftime('%s','now') AS INTEGER)*1000);
