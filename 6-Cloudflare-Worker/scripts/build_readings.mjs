// collects data/readings/*.mjs → data/readings_all.json (validated); scripts/build_readings.py adds translations + outputs
import fs from 'node:fs';
const all = [];
for (const f of ['ielts', 'toefl', 'gre', 'pte', 'general']) all.push(...(await import(`../data/readings/${f}.mjs`)).default);
const errs = [];
const ids = new Set();
for (const r of all) {
  if (ids.has(r.id)) errs.push('dup ' + r.id); ids.add(r.id);
  r.qs.forEach((q, i) => {
    const E = m => errs.push(`${r.id} q${i + 1} ${q.type}: ${m}`);
    if (['mcq', 'head', 'match', 'bank', 'insert', 'select'].includes(q.type)) { if (!Array.isArray(q.o) || !(q.a >= 0 && q.a < q.o.length)) E('bad a'); }
    else if (q.type === 'multi') { if (!Array.isArray(q.a) || q.a.some(x => x < 0 || x >= q.o.length) || (q.k && q.k !== q.a.length)) E('bad multi'); }
    else if (q.type === 'tfng') { if (!['T', 'F', 'NG'].includes(q.a)) E('bad tfng'); }
    else if (q.type === 'ynng') { if (!['Y', 'N', 'NG'].includes(q.a)) E('bad ynng'); }
    else if (q.type === 'gap') { if (!Array.isArray(q.a)) E('bad gap'); else for (const a of q.a) { const txt = r.paras.join(' ').toLowerCase(); if (!txt.includes(a.toLowerCase())) E('answer not in text: ' + a); } }
    else if (q.type === 'order') { if ([...q.a].sort().join() !== q.o.map((x, k) => k).join()) E('bad order'); }
    else if (q.type === 'tc') { if (q.o.length !== q.a.length || q.a.some((x, k) => x < 0 || x >= q.o[k].length)) E('bad tc'); }
    else E('unknown type');
    if (q.type === 'insert' && (r.paras[q.p] || '').split('■').length !== 5) E('insert needs 4 squares');
    if (q.type === 'select') for (const s of q.o) if (!r.paras.join(' ').includes(s)) E('sentence not in text: ' + s.slice(0, 40));
  });
  r.words = r.paras.join(' ').split(/\s+/).length;
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
fs.writeFileSync(new URL('../data/readings_all.json', import.meta.url), JSON.stringify(all, null, 1));
console.log('readings', all.length, all.map(r => `${r.id}:${r.words}w/${r.qs.length}q`).join(' '));
