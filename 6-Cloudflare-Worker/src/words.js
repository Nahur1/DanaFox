/* word bank: public list + admin create / update / delete / bulk import / export */
import { ApiError, one, all, run, q, now, bumpWords } from './util.js';

export const POS = new Set(['n', 'v', 'adj', 'adv', 'prep', 'conj', 'phr']);
const POS_ALIASES = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', preposition: 'prep', conjunction: 'conj', phrase: 'phr', idiom: 'phr', 'اسم': 'n', 'فعل': 'v', 'صفت': 'adj', 'قید': 'adv' };
const KEY_ALIASES = { meaning_fa: 'fa', meaning: 'fa', persian: 'fa', 'معنی': 'fa', definition: 'def', df: 'def', example: 'ex', category: 'cat', category_id: 'cat',
  level_no: 'level', part_of_speech: 'pos', type: 'pos', english: 'word', 'لغت': 'word' };
export const LEVELS = { general: 4, ielts: 3, toefl: 3, awl: 10, cambridge: 13, listening: 27, ir0: 10, ir1: 10, ir2: 10, vi1: 20, vi2: 20 };

const exsOf = r => { try { const a = JSON.parse(r.examples || '[]'); if (Array.isArray(a) && a.length) return a; } catch (e) {} return r.example ? [[r.example, '']] : []; };
export const toPublic = r => ({ id: r.slug, word: r.word, pos: r.pos, fa: r.meaning_fa, def: r.definition, ex: r.example, exs: exsOf(r), cat: r.category_id, level: r.level_no });
export const toAdmin = r => ({ ...toPublic(r), pk: r.id, active: !!r.is_active, updated_at: r.updated_at, created_at: r.created_at });
export const normPos = p => { p = String(p || 'n').trim().toLowerCase(); p = POS_ALIASES[p] || p; return POS.has(p) ? p : null; };

export async function categories(env) {
  const cats = await all(env, 'SELECT * FROM categories ORDER BY sort, id');
  const lv = await all(env, 'SELECT * FROM levels ORDER BY category_id, level_no');
  const counts = {};
  for (const r of await all(env, 'SELECT category_id c, level_no l, COUNT(*) n FROM words WHERE is_active=1 GROUP BY 1,2')) counts[r.c + ':' + r.l] = r.n;
  for (const c of cats) c.levels = lv.filter(l => l.category_id === c.id).map(l => ({ no: l.level_no, en: l.name_en, fa: l.name_fa, tag: l.cefr, count: counts[c.id + ':' + l.level_no] || 0 }));
  return cats;
}

export async function publicWords(env) {
  const rows = await all(env, 'SELECT w.* FROM words w JOIN categories c ON c.id=w.category_id WHERE w.is_active=1 ORDER BY c.sort, w.level_no, w.id');
  return rows.map(toPublic);
}

function validate(d, partial = false) {
  const x = {}; for (const k in d) x[KEY_ALIASES[k] || k] = d[k]; d = x;
  const out = {};
  if (!partial || 'word' in d) { const w = String(d.word || '').split(/\s+/).filter(Boolean).join(' '); if (!w || w.length > 80) throw new ApiError(400, 'word_required'); out.word = w; }
  if (!partial || 'fa' in d) { const fa = String(d.fa || '').trim(); if (!fa) throw new ApiError(400, 'meaning_required'); out.meaning_fa = fa.slice(0, 300); }
  if (!partial || 'pos' in d) { const p = normPos(d.pos); if (!p) throw new ApiError(400, 'bad_pos'); out.pos = p; }
  for (const [k, col] of [['def', 'definition'], ['ex', 'example']]) if (!partial || k in d) out[col] = String(d[k] || '').trim().slice(0, 600);
  if ('exs' in d) {           // examples with translations: [[english, persian], …] or lines "english | persian"
    let a = d.exs;
    if (typeof a === 'string') a = a.split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[0]);
    a = (Array.isArray(a) ? a : []).filter(x => Array.isArray(x) && x[0]).slice(0, 8).map(x => [String(x[0]).trim().slice(0, 400), String(x[1] || '').trim().slice(0, 400)]);
    out.examples = JSON.stringify(a);
    if (a.length) out.example = a[0][0];
  } else if (!partial && out.example) out.examples = JSON.stringify([[out.example, '']]);
  if (!partial || 'cat' in d || 'level' in d) {
    const cat = String(d.cat || '').trim().toLowerCase(), level = parseInt(d.level || 1, 10);
    if (!LEVELS[cat] || !(level >= 1 && level <= LEVELS[cat])) throw new ApiError(400, 'bad_category_or_level');
    out.category_id = cat; out.level_no = level;
  }
  return out;
}

export async function createWord(env, d) {
  const v = validate(d), slug = `${v.category_id}:${v.word.toLowerCase()}`, t = now();
  const ex = await one(env, 'SELECT * FROM words WHERE slug=?', slug);
  if (ex && ex.is_active) throw new ApiError(400, 'duplicate');
  const exs = v.examples || '[]';
  if (ex) await run(env, 'UPDATE words SET word=?,pos=?,meaning_fa=?,definition=?,example=?,examples=?,level_no=?,is_active=1,updated_at=? WHERE id=?', v.word, v.pos, v.meaning_fa, v.definition, v.example, exs, v.level_no, t, ex.id);
  else await run(env, 'INSERT INTO words(slug,word,pos,meaning_fa,definition,example,examples,category_id,level_no,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)', slug, v.word, v.pos, v.meaning_fa, v.definition, v.example, exs, v.category_id, v.level_no, t, t);
  await bumpWords(env);
  return toAdmin(await one(env, 'SELECT * FROM words WHERE slug=?', slug));
}

export async function updateWord(env, pk, d) {
  const row = await one(env, 'SELECT * FROM words WHERE id=?', pk);
  if (!row) throw new ApiError(404, 'not_found');
  delete d.cat; delete d.category; // the category is part of the permanent slug
  if ('level' in d) d.cat = row.category_id;
  const v = validate(d, true);
  delete v.category_id;
  if ('active' in d) v.is_active = d.active ? 1 : 0;
  if (!Object.keys(v).length) return toAdmin(row);
  v.updated_at = now();
  await run(env, `UPDATE words SET ${Object.keys(v).map(k => k + '=?').join(', ')} WHERE id=?`, ...Object.values(v), pk);
  await bumpWords(env);
  return toAdmin(await one(env, 'SELECT * FROM words WHERE id=?', pk));
}

export async function deleteWord(env, pk, hard = false) {
  const r = hard ? await run(env, 'DELETE FROM words WHERE id=?', pk) : await run(env, 'UPDATE words SET is_active=0, updated_at=? WHERE id=?', now(), pk);
  await bumpWords(env);
  return r.meta.changes > 0;
}

export async function searchWords(env, { q: s = '', cat = '', level = 0, status = 'active', page = 1, size = 50 }) {
  const where = [], args = [];
  if (s) { where.push('(word LIKE ? OR meaning_fa LIKE ? OR definition LIKE ?)'); args.push(`%${s}%`, `%${s}%`, `%${s}%`); }
  if (cat) { where.push('category_id=?'); args.push(cat); }
  if (level) { where.push('level_no=?'); args.push(+level); }
  if (status === 'active') where.push('is_active=1'); else if (status === 'deleted') where.push('is_active=0');
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  size = Math.max(1, Math.min(200, +size || 50)); page = Math.max(1, +page || 1);
  const total = (await one(env, `SELECT COUNT(*) c FROM words ${w}`, ...args)).c;
  const rows = await all(env, `SELECT * FROM words ${w} ORDER BY category_id, level_no, word COLLATE NOCASE LIMIT ? OFFSET ?`, ...args, size, (page - 1) * size);
  return { total, page, size, items: rows.map(toAdmin) };
}

function splitLine(line) {
  if (line.includes('|')) return line.split('|').map(c => c.trim());
  if (line.includes('\t')) return line.split('\t').map(c => c.trim());
  if (/\s[-–—]\s/.test(line) && !line.includes(',')) return line.split(/\s+[-–—]\s+/).map(c => c.trim());
  const out = []; let cur = '', inQ = false;          // CSV with quotes
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
    else if (ch === '"') inQ = true; else if (ch === ',') { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim()); return out;
}

/** lines like word|pos|meaning|definition|example — also CSV / TSV with an optional header row (incl. category, level) */
export async function importText(env, text, cat = '', level = 1, update = true) {
  let lines = String(text || '').replace(/\r/g, '').split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const res = { added: 0, updated: 0, skipped: 0, errors: [] };
  let header = null;
  if (lines.length) {
    const first = splitLine(lines[0]).map(c => c.toLowerCase().replace(/^\ufeff/, '').trim());
    if (first.includes('word') || first.includes('english') || first.includes('لغت')) { header = first.map(c => KEY_ALIASES[c] || c); lines = lines.slice(1); }
  }
  const items = new Map();
  lines.forEach((line, i) => {
    let cells = splitLine(line), d;
    if (header) { d = {}; header.forEach((h, j) => { if (j < cells.length) d[h] = cells[j]; }); }
    else { if (cells.length >= 2 && normPos(cells[1]) === null) cells = [cells[0], 'n', ...cells.slice(1)]; d = { word: cells[0], pos: cells[1], fa: cells[2], def: cells[3], ex: cells[4] }; }
    if (!d.cat) d.cat = cat; if (!d.level) d.level = level;
    try { const v = validate(d); items.set(`${v.category_id}:${v.word.toLowerCase()}`, v); }
    catch (e) { res.errors.push({ line: i + (header ? 2 : 1), error: e.code || 'error', text: line.slice(0, 80) }); }
  });
  if (!items.size) return res;
  const slugs = [...items.keys()];
  const existing = new Map();
  for (let i = 0; i < slugs.length; i += 400) for (const r of await all(env, 'SELECT slug, is_active FROM words WHERE slug IN (SELECT value FROM json_each(?))', JSON.stringify(slugs.slice(i, i + 400)))) existing.set(r.slug, r.is_active);
  const rows = []; const t = now();
  for (const [slug, v] of items) {
    if (existing.has(slug) && !update && existing.get(slug)) { res.skipped++; continue; }
    existing.has(slug) ? res.updated++ : res.added++;
    rows.push({ s: slug, w: v.word, p: v.pos, f: v.meaning_fa, d: v.definition, e: v.example, x: v.examples || JSON.stringify(v.example ? [[v.example, '']] : []), c: v.category_id, l: v.level_no });
  }
  const stmts = [];
  for (let i = 0; i < rows.length; i += 200) stmts.push(q(env, `INSERT INTO words(slug,word,pos,meaning_fa,definition,example,examples,category_id,level_no,created_at,updated_at)
    SELECT json_extract(value,'$.s'), json_extract(value,'$.w'), json_extract(value,'$.p'), json_extract(value,'$.f'), json_extract(value,'$.d'), json_extract(value,'$.e'), json_extract(value,'$.x'),
           json_extract(value,'$.c'), json_extract(value,'$.l'), ?1, ?1 FROM json_each(?2) WHERE true
    ON CONFLICT(slug) DO UPDATE SET word=excluded.word, pos=excluded.pos, meaning_fa=excluded.meaning_fa, definition=excluded.definition, example=excluded.example,
      examples=CASE WHEN excluded.example=words.example THEN words.examples ELSE excluded.examples END,
      level_no=excluded.level_no, is_active=1, updated_at=excluded.updated_at`, t, JSON.stringify(rows.slice(i, i + 200))));
  if (stmts.length) { await env.DB.batch(stmts); await bumpWords(env); }
  return res;
}

export async function exportCsv(env, includeInactive = false) {
  const rows = await all(env, `SELECT * FROM words ${includeInactive ? '' : 'WHERE is_active=1'} ORDER BY category_id, level_no, id`);
  const c = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '\ufeff' + ['word,pos,meaning_fa,definition,example,category,level', ...rows.map(r => [r.word, r.pos, r.meaning_fa, r.definition, r.example, r.category_id, r.level_no].map(c).join(','))].join('\n') + '\n';
}
