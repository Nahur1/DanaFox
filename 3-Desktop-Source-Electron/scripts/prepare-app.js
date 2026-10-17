/* Builds app/ for the desktop shell from the hosted frontend (6-Cloudflare-Worker/public — the same
   files the website serves) and points it at the deployed Worker, because file:// has no same-origin API. */
const fs = require('fs'), path = require('path');
const SERVER = process.env.VAJEYAR_SERVER || 'https://vajeyar.mohammadfakhari59.workers.dev';
const SRC = path.join(__dirname, '..', '..', '6-Cloudflare-Worker', 'public');
const DEST = path.join(__dirname, '..', 'app');
fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true, filter: s => !/[\\/](admin|_headers|_redirects)$/.test(s) });
const file = path.join(DEST, 'index.html');
const html = fs.readFileSync(file, 'utf8');
if (!/js\/config\.js/.test(html)) throw new Error('index.html does not load js/config.js');
fs.writeFileSync(file, html.replace(/(<script src="js\/config\.js"><\/script>)/, `<script>window.VY_SERVER = ${JSON.stringify(SERVER)};</script>\n$1`));
console.log('app/ built from', SRC, '→ server', SERVER);
