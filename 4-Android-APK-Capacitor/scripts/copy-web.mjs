/* Builds www/ for the Android app from the hosted frontend (the only copy that has
   accounts, sync and server pronunciation audio) and points it at the deployed Worker.
   The hosted build keeps its own same-origin '' value in js/config.js — the URL is
   injected here, into www/ only, because a WebView has no same-origin server. */
import { cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SERVER = process.env.VAJEYAR_SERVER || 'https://vajeyar.mohammadfakhari59.workers.dev';
const SRC = join('..', '6-Cloudflare-Worker', 'public');
const DEST = 'www';

rmSync(DEST, { recursive: true, force: true });
cpSync(SRC, DEST, { recursive: true, filter: s => !/[\\/](admin|bp|_headers|_redirects)$/.test(s) });

const file = join(DEST, 'index.html');
const html = readFileSync(file, 'utf8');
if (!/js\/config\.js/.test(html)) throw new Error('index.html does not load js/config.js — nothing to inject before');
if (/VY_SERVER\s*=/.test(html)) throw new Error('index.html already sets VY_SERVER');
writeFileSync(file, html.replace(
  /(<script src="js\/config\.js"><\/script>)/,
  `<script>window.VY_SERVER = ${JSON.stringify(SERVER)};</script>\n$1`,
));
// guard: the APK bundles these files, so a stale/missing tap-highlight rule means the blue tap flash comes back
const css = readFileSync(join(DEST, 'css', 'style.css'), 'utf8');
if (!/\*::before,\*::after\{-webkit-tap-highlight-color:rgba\(0,0,0,0\)!important\}/.test(css)) throw new Error('www/css/style.css is missing the tap-highlight fix — blue flash on tap would return');
if (!/tap-highlight-color/.test(readFileSync(file, 'utf8'))) throw new Error('www/index.html is missing the critical tap-highlight <style>');

console.log('www/ built from', SRC, '→ server', SERVER);
