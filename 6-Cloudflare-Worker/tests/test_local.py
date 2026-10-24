"""End-to-end test of the Cloudflare Worker running locally with `wrangler dev` + a fake Telegram API (tests/tgmock.py).
   start:  python3 tests/tgmock.py &
           npx wrangler dev --local --var TG_API:http://127.0.0.1:8899 --var PUBLIC_URL:http://127.0.0.1:8787 \
             --var TG_BOT_TOKEN:123456789:AAFakeTokenForLocalTestsOnly_abcdefghijk --var ADMIN_TG_IDS:4242001
   usage:  python3 tests/test_local.py   (BASE=http://127.0.0.1:8787, LOG=/data/vajeyar/tmp/calls.jsonl)"""
import json, os, random, subprocess, time, urllib.request, urllib.error, hmac, hashlib, urllib.parse
BASE = os.environ.get('BASE', 'http://127.0.0.1:8787')
LOG = os.environ.get('LOG', '/data/vajeyar/tmp/calls.jsonl')
DEVLOG = os.environ.get('DEVLOG', '/data/vajeyar/tmp/dev.log')
CF = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ok = fail = 0
def check(name, cond, extra=''):
    global ok, fail
    if cond: ok += 1; print('  ✓', name)
    else: fail += 1; print('  ✗', name, extra)

def req(method, path, body=None, token=None, headers=None, raw=False):
    h = {'Content-Type': 'application/json', **(headers or {})}
    if token: h['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=30) as res: txt = res.read().decode(); st = res.status; hd = {k.lower(): v for k, v in res.headers.items()}
    except urllib.error.HTTPError as e: txt = e.read().decode(); st = e.code; hd = {k.lower(): v for k, v in e.headers.items()}
    if raw: return st, txt, hd
    try: return st, json.loads(txt) if txt else None
    except Exception: return st, txt

def d1(sql):
    out = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'vajeyar-db', '--local', '--json', '--command', sql], cwd=CF, capture_output=True, text=True).stdout
    return json.loads(out)[0]['results']

def calls():
    try: return [json.loads(l) for l in open(LOG, encoding='utf-8')]
    except FileNotFoundError: return []

uid_seq = [700000 + random.randint(0, 99999)]
def update(secret, payload, wait=0.9):
    n0 = len(calls())
    uid_seq[0] += 1
    st, _ = req('POST', '/tg/webhook', {'update_id': uid_seq[0], **payload}, headers={'X-Telegram-Bot-Api-Secret-Token': secret})
    t = time.time()
    while time.time() - t < 8:                    # wait until the background handler has answered
        time.sleep(0.25)
        new = calls()[n0:]
        if new and time.time() - t > wait * 0.5 and (len(calls()) == len(new) + n0): 
            time.sleep(0.35)
            if len(calls()) == len(new) + n0: break
    return st, calls()[n0:]

def tg_user(i, name='Ali', uname='ali_t'): return {'id': i, 'is_bot': False, 'first_name': name, 'username': uname, 'language_code': 'fa'}
def msg(u, text): return {'message': {'message_id': random.randint(1, 10**6), 'date': int(time.time()), 'chat': {'id': u['id'], 'type': 'private'}, 'from': u, 'text': text}}
def cbq(u, data, mid=1): return {'callback_query': {'id': str(random.randint(1, 10**9)), 'from': u, 'data': data, 'chat_instance': 'x',
                                  'message': {'message_id': mid, 'date': 0, 'chat': {'id': u['id'], 'type': 'private'}, 'text': '...'}}}
def keyboards(cs):
    out = []
    for c in cs:
        b = c['b'] if isinstance(c['b'], dict) else {}
        rm = b.get('reply_markup') or {}
        if isinstance(rm, str): rm = json.loads(rm)
        for row in rm.get('inline_keyboard', []):
            for btn in row:
                if btn.get('callback_data'): out.append(btn['callback_data'])
    return out
def bot_errors(): return open(DEVLOG, encoding='utf-8', errors='ignore').read().count('bot error')


FAKE = os.environ.get('FAKE_TOKEN', '123456789:AAFakeTokenForLocalTestsOnly_abcdefghijk')
ADMIN_ID = int(os.environ.get('ADMIN_ID', '4242001'))
SECRET = hashlib.sha256(('vajeyar-webhook:' + FAKE).encode()).hexdigest()[:48]
def init_data(u, age=0):
    user_json = json.dumps({'id': u['id'], 'first_name': u['first_name'], 'username': u.get('username'), 'language_code': 'fa'}, separators=(',', ':'))
    fields = {'auth_date': str(int(time.time()) - age), 'query_id': 'AAE' + str(random.randint(1, 10**6)), 'user': user_json}
    dcs = '\n'.join(f'{k}={fields[k]}' for k in sorted(fields))
    sk = hmac.new(b'WebAppData', FAKE.encode(), hashlib.sha256).digest()
    fields['hash'] = hmac.new(sk, dcs.encode(), hashlib.sha256).hexdigest()
    return urllib.parse.urlencode(fields)
def buttons(cs, kind='url'):
    out = []
    for c in cs:
        b = c['b'] if isinstance(c['b'], dict) else {}
        rm = b.get('reply_markup') or {}
        if isinstance(rm, str): rm = json.loads(rm)
        for row in rm.get('inline_keyboard', []):
            for btn in row:
                if kind == 'url' and btn.get('url'): out.append(btn['url'])
                if kind == 'web_app' and btn.get('web_app'): out.append(btn['web_app']['url'])
    return out
def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def texts(cs): return ' '.join(str(c['b'].get('text', '')) for c in cs if isinstance(c['b'], dict))

print('== public API, security headers, automatic bot setup ==')
st, cfg = req('GET', '/api/config'); check('config', st == 200 and cfg['app'] == 'DanaFox', cfg)
st, w = req('GET', '/api/words'); check('word bank ≥689', st == 200 and len(w['words']) >= 689, st)
st, body, hd = req('GET', '/api/words', headers={'If-None-Match': f'"w{w["version"]}"'}, raw=True); check('words ETag 304', st == 304, st)
st, _ = req('OPTIONS', '/api/sync', headers={'Origin': 'null', 'Access-Control-Request-Method': 'POST'}); check('CORS preflight', st == 204, st)
st, body, hd = req('GET', '/', raw=True); check('web app served + nosniff', st == 200 and 'دانافاکس' in body and hd.get('x-content-type-options') == 'nosniff', hd)
st, body, hd = req('GET', '/admin/', raw=True)
csp = hd.get('content-security-policy', '')
check('admin panel served with strict CSP', st == 200 and 'admin.js' in body and "script-src 'self'" in csp and 'frame-ancestors' in csp and 'web.telegram.org' in csp, csp)
check('admin page not cached / not indexed', 'no-store' in hd.get('cache-control', '') and 'noindex' in hd.get('x-robots-tag', ''), hd)
st, body, hd = req('GET', '/api/admin/me', raw=True); check('admin API: 401 + no CORS', st == 401 and 'access-control-allow-origin' not in hd, hd)
st, _ = req('POST', '/tg/webhook', {'update_id': 1}); check('webhook rejects without secret', st == 403, st)
time.sleep(2.5)
cs = calls(); ms = [c['m'] for c in cs]
hook = next((c['b'] for c in cs if c['m'] == 'setWebhook'), {})
check('bot set up automatically from the TG_BOT_TOKEN secret', hook.get('url', '').endswith('/tg/webhook') and hook.get('secret_token') == SECRET, hook)
check('commands + descriptions + Mini App menu button', 'setMyCommands' in ms and 'setMyDescription' in ms and any(c['m'] == 'setChatMenuButton' and c['b']['menu_button']['web_app']['url'].endswith('/?tg=1') for c in cs), ms)
check('/admin command registered only in the admin chat', any(c['m'] == 'setMyCommands' and (c['b'].get('scope') or {}).get('chat_id') == ADMIN_ID and any(x['command'] == 'admin' for x in c['b']['commands']) for c in cs)
      and not any(c['m'] == 'setMyCommands' and not c['b'].get('scope') and any(x['command'] == 'admin' for x in c['b']['commands']) for c in cs))
st, cfg = req('GET', '/api/config'); check('config exposes bot username', (cfg.get('telegram') or {}).get('bot') == 'vajeyar_test_bot', cfg)
st, _ = req('POST', '/tg/webhook', {'update_id': 2}, headers={'X-Telegram-Bot-Api-Secret-Token': 'wrong'}); check('wrong secret → 403', st == 403)
secret = SECRET

print('== accounts & sync ==')
email = f'u{int(time.time())}@test.dev'
st, r = req('POST', '/api/auth/register', {'login': email, 'password': 'secret123', 'name': 'Sara'}); check('register', st == 201 and r['user']['email'] == email, r)
tokA = r['token']; uidA = r['user']['id']
check('no role field exposed', 'role' not in r['user'], r['user'])
st, r = req('POST', '/api/auth/register', {'login': email, 'password': 'secret123'}); check('duplicate register → 409', st == 409)
st, r = req('POST', '/api/auth/login', {'login': email.upper(), 'password': 'nope'}); check('wrong password → 401', st == 401)
st, r = req('POST', '/api/auth/login', {'login': email.upper(), 'password': 'secret123'}); check('login (case-insensitive)', st == 200); tokB = r['token']
now = int(time.time() * 1000)
ch = {'profile': {'u': now, 'data': {'settings': {'lang': 'fa', 'goal': 30, 'track': 'ielts'}, 'onboarded': True, 'xp': 120, 'streak': {'count': 2, 'best': 3, 'last': '2025-01-01'}, 'games': {}}},
      'progress': {'abandon': {'u': now, 'data': {'seen': True, 'reps': 1, 'ease': 2.5, 'interval': 1, 'due': now - 1000, 'lapses': 0, 'ok': 1, 'bad': 0, 'star': True, 'note': 'n', 'first': now, 'last': now}}},
      'custom': {'c_test': {'u': now, 'data': {'id': 'c_test', 'word': 'serendipity', 'pos': 'n', 'fa': 'خوش‌اقبالی', 'def': '', 'ex': ''}}},
      'days': {'2025-01-01': {'reviews': 5, 'newWords': 2, 'correct': 4, 'wrong': 1, 'xp': 40}}, 'ach': {'first': now}, 'quizzes': [{'d': now, 's': 8, 't': 10}]}
st, r = req('POST', '/api/sync', {'since': 0, 'changes': ch}, tokA); check('sync push', st == 200 and r['rev'] > 0, r); revA = r['rev']
st, r = req('POST', '/api/sync', {'since': 0, 'changes': {}}, tokB)
c = r.get('changes', {}) if isinstance(r, dict) else {}
check('second device receives everything', st == 200 and 'abandon' in c.get('progress', {}) and 'c_test' in c.get('custom', {}) and c.get('profile', {}).get('data', {}).get('xp') == 120, r)

print('== admin access control (only Telegram id %d) ==' % ADMIN_ID)
d1(f"UPDATE users SET role='admin' WHERE id={uidA}")
st, r = req('GET', '/api/admin/dashboard', token=tokA); check('role column / app session gives no admin access', st == 401, r)
st, r = req('POST', '/api/admin/auth/login', {'login': email, 'password': 'secret123'}); check('password login of a non-admin account → 403', st == 403, r)
U_other = tg_user(4242999, 'Mallory', 'mallory')
st, r = req('POST', '/api/admin/auth/telegram', {'initData': init_data(U_other)}); check('Mini App sign-in of another Telegram id → 403', st == 403, r)
bad = init_data({'id': ADMIN_ID, 'first_name': 'X', 'username': 'x'}).rsplit('hash=', 1)[0] + 'hash=' + '0' * 64
st, r = req('POST', '/api/admin/auth/telegram', {'initData': bad}); check('forged admin initData → 403', st == 403, r)
st, r = req('POST', '/api/admin/auth/telegram', {'initData': init_data({'id': ADMIN_ID, 'first_name': 'Mohammad', 'username': 'mf'}, age=3 * 3600)}); check('stale (3h) initData → 403', st == 403, r)
ADM = {'id': ADMIN_ID, 'is_bot': False, 'first_name': 'Mohammad', 'username': 'mf_admin', 'language_code': 'fa'}
st, r = req('POST', '/api/admin/auth/telegram', {'initData': init_data(ADM)}); check('admin signs in inside Telegram', st == 200 and r.get('token') and r.get('expires_at'), r)
tokAdm = r.get('token')
check('admin session ≤ 12h', r.get('expires_at', 0) - int(time.time() * 1000) <= 12 * 3600 * 1000 + 5000)
st, r = req('GET', '/api/admin/me', token=tokAdm); check('admin /me', st == 200 and r['user']['telegram']['id'] == ADMIN_ID, r)
st, r = req('GET', '/api/me', token=tokAdm); admUid = r['user']['id'] if st == 200 else None
st, r = req('POST', '/api/admin/auth/telegram', {'initData': init_data(ADM)}); tokOld = r['token']
d1(f"UPDATE sessions SET created_at = created_at - 13*3600*1000 WHERE token_hash='{sha(tokOld)}'")
st, r = req('GET', '/api/admin/dashboard', token=tokOld); check('admin session older than 12h → 401', st == 401 and r.get('error') == 'session_expired', r)
den = d1("SELECT COUNT(*) c FROM admin_log WHERE action LIKE 'denied_%'")[0]['c']; check(f'denied attempts are audited ({den})', den >= 3)

print('== admin panel API ==')
st, r = req('GET', '/api/admin/dashboard', token=tokAdm)
check('dashboard KPIs + charts data', st == 200 and r['kpi']['users'] >= 2 and r['kpi']['words'] >= 689 and isinstance(r['daily'], list) and isinstance(r['signups'], list) and r['top'], r if st != 200 else r['kpi'])
st, r = req('GET', f'/api/admin/users?q={urllib.parse.quote(email)}', token=tokAdm); check('users search', st == 200 and r['total'] == 1 and r['items'][0]['id'] == uidA, r)
for f in ['telegram', 'tg', 'web', 'linked', 'active7', 'inactive', 'new7', 'blocked', 'bot_blocked']:
    st, r = req('GET', f'/api/admin/users?filter={f}&sort=xp', token=tokAdm)
    if st != 200: break
check('all user filters work', st == 200, r)
st, r = req('GET', f'/api/admin/users/{uidA}', token=tokAdm); check('user details', st == 200 and r['user']['xp'] == 120 and r['stats']['custom'] == 1, r)
st, r = req('POST', '/api/admin/words', {'word': 'zeitgeist', 'pos': 'n', 'fa': 'روح زمانه', 'def': 'the spirit of the times', 'ex': '', 'cat': 'general', 'level': 4}, tokAdm); check('add word', st == 201, r); pk = r.get('pk') if isinstance(r, dict) else None
st, r = req('PUT', f'/api/admin/words/{pk}', {'fa': 'روح دوران'}, tokAdm); check('edit word', st == 200 and r.get('fa') == 'روح دوران', r)
st, r = req('POST', '/api/admin/words/import', {'text': 'quixotic|adj|خیال‌پردازانه|exceedingly idealistic|\nephemeral - زودگذر', 'cat': 'general', 'level': 3}, tokAdm); check('bulk import', st == 200 and (r.get('added', 0) + r.get('updated', 0)) >= 2, r)
st, body, hd = req('GET', '/api/admin/words/export.csv', token=tokAdm, raw=True); check('export words csv', st == 200 and 'zeitgeist' in body)
st, body, hd = req('GET', '/api/admin/users.csv', token=tokAdm, raw=True); check('export users csv', st == 200 and email in body)
n0 = len(calls()); st, r = req('POST', '/api/admin/export/telegram', {'kind': 'users'}, tokAdm); time.sleep(0.3)
check('export sent as a file to the admin chat', st == 200 and any(c['m'] == 'sendDocument' for c in calls()[n0:]), r)
st, w2 = req('GET', '/api/words'); check('word bank updated for apps', len(w2['words']) >= 691 and w2['version'] != w['version'], len(w2['words']))
st, r = req('DELETE', f'/api/admin/words/{pk}?hard=1', token=tokAdm); check('delete word', st == 200)
st, r = req('GET', '/api/admin/telegram', token=tokAdm); check('bot status in panel', st == 200 and r.get('username') == 'vajeyar_test_bot' and r.get('from_secret') is True and r.get('admin_ids') == [ADMIN_ID], r)
st, r = req('POST', '/api/admin/telegram/setup', {'token': '1:xyz'}, tokAdm); check('token can’t be replaced from the panel when it is a secret', st == 400 and r['error'] == 'token_in_secret', r)
st, r = req('PUT', '/api/admin/settings', {'notice': 'لغات جدید اضافه شد', 'notice_level': 'success', 'notice_bot': True}, tokAdm); check('save settings', st == 200 and r['notice_bot'] is True, r)
time.sleep(16)
st, cfg = req('GET', '/api/config'); check('announcement reaches the apps', (cfg.get('notice') or {}).get('text') == 'لغات جدید اضافه شد', cfg)

print('== Telegram bot ==')
U = tg_user(5550001 + random.randint(0, 9999))
err0 = bot_errors()
st, cs = update(secret, msg(U, '/start')); check('/start answered', st == 200 and any(c['m'] == 'sendMessage' and c['b'].get('chat_id') == U['id'] for c in cs), [c['m'] for c in cs])
for data in ['ol:fa', 'ot:ielts', 'og:20']: st, cs = update(secret, cbq(U, data))
check('announcement on the bot home screen', 'لغات جدید اضافه شد' in texts(cs), texts(cs)[:200])
row = d1(f"SELECT u.id, p.onboarded, p.settings_json FROM users u JOIN user_profile p ON p.user_id=u.id WHERE u.telegram_id={U['id']}")
check('onboarding stored in DB', row and row[0]['onboarded'] == 1 and '"ielts"' in row[0]['settings_json'], row)
tgUid = row[0]['id'] if row else None
random.seed(7); seen = set(); btns = keyboards(cs) or ['h']
for i in range(80):
    pool = [b for b in btns if not b.startswith(('pt', 'rs', 'rst', 'adm'))] or ['h']
    data = random.choice(pool); seen.add(data.split(':')[0])
    st, cs = update(secret, cbq(U, data), wait=0.6)
    nb = keyboards(cs)
    btns = nb if nb else ['h', 'lrn', 'rv', 'q', 'g', 'd', 's', 'st', 'm']
for cmd in ['/menu', '/review', '/learn', '/quiz', '/games', '/dict', '/words', '/stats', '/wotd', '/settings', '/help', 'abandon']:
    st, cs = update(secret, msg(U, cmd), wait=0.6)
st, cs = update(secret, cbq(U, 'ls:general:1')); st, cs = update(secret, cbq(U, 'c:s')); st, cs = update(secret, cbq(U, 'c:r:good'))
cnt = d1(f"SELECT COUNT(*) c FROM user_progress WHERE user_id={tgUid}")[0]['c']
check(f'bot learning saved progress rows ({cnt})', cnt > 0)
check(f'no handler crashes during {len(seen)} kinds of buttons', bot_errors() == err0, bot_errors() - err0)
st, cs = update(secret, msg(U, '/admin')); check('/admin ignored for normal users', not any('/admin/' in x for x in buttons(cs, 'web_app') + buttons(cs)), cs)
st, cs = update(secret, cbq(U, 'adml')); check('admin callbacks ignored for normal users', not any('code=' in x for x in buttons(cs)))
st, cs = update(secret, msg(U, '/account'))
wa = buttons(cs, 'web_app'); check('/account offers “sign in with site account” (Mini App, action=link)', any('action=link' in x for x in wa), wa)
st, cs = update(secret, {'inline_query': {'id': '1', 'from': U, 'query': 'aban', 'offset': ''}}); check('inline query', any(c['m'] == 'answerInlineQuery' and c['b']['results'] for c in cs))

print('== bot /admin for the admin ==')
st, cs = update(secret, msg(ADM, '/start'))
st, cs = update(secret, msg(ADM, '/admin'))
wa = buttons(cs, 'web_app'); check('/admin shows stats + Mini App button to the panel', any(x.endswith('/admin/?tg=1') for x in wa) and 'کاربران' in texts(cs) or 'Users' in texts(cs), (wa, texts(cs)[:200]))
st, cs = update(secret, cbq(ADM, 'adml'))
link = next((x for x in buttons(cs) if '/admin/?code=' in x), None); check('one-time browser link', bool(link), buttons(cs))
if link:
    code = link.split('code=')[1]
    st, r = req('POST', '/api/admin/auth/code', {'code': code}); check('browser sign-in with the link', st == 200 and r.get('token'), r)
    st, r = req('POST', '/api/admin/auth/code', {'code': code}); check('link works only once', st == 403, r)

print('== method A: sign in with the site account inside the Mini App ==')
U2 = tg_user(6660001 + random.randint(0, 9999), 'Reza', 'reza_t')
st, cs = update(secret, msg(U2, '/start'))
for data in ['ol:fa', 'ot:general', 'og:20', 'ls:general:1', 'c:s', 'c:r:good']: st, cs = update(secret, cbq(U2, data))
tg2 = d1(f"SELECT id FROM users WHERE telegram_id={U2['id']}")[0]['id']
p2 = d1(f"SELECT COUNT(*) c FROM user_progress WHERE user_id={tg2}")[0]['c']
emailC = f'c{int(time.time())}@test.dev'
st, r = req('POST', '/api/auth/register', {'login': emailC, 'password': 'pass1234', 'name': 'Reza Web'}); uidC = r['user']['id']; tokC = r['token']
st, r = req('POST', '/api/auth/telegram/link', {'initData': init_data(U2), 'login': emailC, 'password': 'wrong'}); check('wrong password → 401', st == 401, r)
st, r = req('POST', '/api/auth/telegram/link', {'initData': init_data(U2).replace('hash=', 'hash=0'), 'login': emailC, 'password': 'pass1234'}); check('bad initData → 401', st == 401, r)
st, r = req('POST', '/api/auth/telegram/link', {'initData': init_data(U2), 'login': emailC, 'password': 'pass1234'})
check('link OK → session of the site account', st == 200 and r['user']['id'] == uidC and r['user']['telegram']['id'] == U2['id'] and r.get('merged') is True, r)
tokC2 = r.get('token')
check('Telegram-only account merged & removed', d1(f"SELECT COUNT(*) c FROM users WHERE id={tg2}")[0]['c'] == 0)
check(f'bot progress moved to the site account ({p2})', d1(f"SELECT COUNT(*) c FROM user_progress WHERE user_id={uidC}")[0]['c'] >= p2 > 0)
st, r = req('POST', '/api/auth/telegram', {'initData': init_data(U2)}); check('Mini App now opens the site account', st == 200 and r['user']['id'] == uidC, r)
st, cs = update(secret, msg(U2, '/account')); check('bot now shows the linked site account', emailC in texts(cs), texts(cs)[:200])
st, r = req('POST', '/api/auth/telegram/link', {'initData': init_data(U2), 'login': emailC, 'password': 'pass1234'}); check('linking again = OK (same Telegram)', st == 200 and r['user']['id'] == uidC, r)
U3 = tg_user(7770001 + random.randint(0, 9999), 'Other', 'other_t')
st, r = req('POST', '/api/auth/telegram/link', {'initData': init_data(U3), 'login': emailC, 'password': 'pass1234'}); check('site account linked to another Telegram → already_linked', st == 409 and r['error'] == 'already_linked', r)
emailD = f'd{int(time.time())}@test.dev'
st, r = req('POST', '/api/auth/register', {'login': emailD, 'password': 'pass1234'}); uidD = r['user']['id']; tokD = r['token']
st, r = req('POST', '/api/auth/telegram/link', {'initData': init_data(U2), 'login': emailD, 'password': 'pass1234'}); check('Telegram linked to another site account → telegram_linked_other', st == 409 and r['error'] == 'telegram_linked_other', r)

print('== old linking flow (web → bot deep link) + one-time web login ==')
st, r = req('POST', '/api/me/telegram', {}, tokA); check('link code', st == 200 and 'start=link_' in r['url'], r); code = r['code']
st, cs = update(secret, msg(U, '/start link_' + code))
st, me = req('GET', '/api/me', token=tokA); check('web account now linked to Telegram', st == 200 and me['user']['telegram'] and me['user']['telegram']['id'] == U['id'], me)
check('Telegram-only account merged & removed', d1(f"SELECT COUNT(*) c FROM users WHERE id={tgUid}")[0]['c'] == 0)
st, cs = update(secret, msg(U, '/account'))
cbs = keyboards(cs); weblogin = next((x for x in cbs if x == 'web'), None)
if weblogin: st, cs = update(secret, cbq(U, weblogin))
lc = next((l.split('login=')[1] for l in buttons(cs) if 'login=' in l), None)
check('bot gives a one-time web sign-in link', bool(lc))
if lc:
    st, r = req('POST', '/api/auth/code', {'code': lc}); check('sign in with the bot link → same account', st == 200 and r['user']['id'] == uidA, r)
    st, r = req('POST', '/api/auth/code', {'code': lc}); check('link is one-time only', st == 400)

print('== admin actions on users ==')
n0 = len(calls()); st, r = req('POST', f'/api/admin/users/{uidC}/message', {'text': '<b>سلام</b> رضا', 'open_app': True}, tokAdm); time.sleep(0.3)
check('send a Telegram message to a user', st == 200 and any(c['m'] == 'sendMessage' and c['b'].get('chat_id') == U2['id'] for c in calls()[n0:]), r)
st, r = req('POST', f'/api/admin/users/{uidC}/block', {'blocked': True}, tokAdm); check('block user', st == 200)
st, r = req('GET', '/api/me', token=tokC2); check('blocked user is signed out', st == 401, r)
st, r = req('POST', '/api/auth/login', {'login': emailC, 'password': 'pass1234'}); check('blocked user can’t sign in', st == 403 and r['error'] == 'account_blocked', r)
st, cs = update(secret, msg(U2, '/menu')); check('bot tells blocked users', 'غیرفعال' in texts(cs), texts(cs))
st, r = req('POST', f'/api/admin/users/{uidC}/block', {'blocked': False}, tokAdm); check('unblock', st == 200)
st, r = req('POST', f'/api/admin/users/{uidC}/password', {'password': 'newpass99'}, tokAdm); check('admin sets a new password', st == 200)
st, r = req('POST', '/api/auth/login', {'login': emailC, 'password': 'newpass99'}); check('… and it works', st == 200, r)
st, r = req('POST', f'/api/admin/users/{uidC}/logout', {}, tokAdm); check('sign out everywhere', st == 200 and r['removed'] >= 1, r)
st, r = req('POST', f'/api/admin/users/{uidC}/reset', {}, tokAdm); check('reset progress', st == 200 and d1(f"SELECT COUNT(*) c FROM user_progress WHERE user_id={uidC}")[0]['c'] == 0)
st, r = req('POST', f'/api/admin/users/{admUid}/block', {'blocked': True}, tokAdm); check('admin account can’t be blocked', st == 400, r)

print('== maintenance mode ==')
st, r = req('PUT', '/api/admin/settings', {'maintenance': True, 'maintenance_msg': 'ارتقای سرور'}, tokAdm); check('maintenance on', st == 200 and r['maintenance'] is True)
time.sleep(16)
st, r = req('POST', '/api/sync', {'since': 0, 'changes': {}}, tokA); check('sync paused (503)', st == 503 and r['error'] == 'maintenance', r)
st, r = req('GET', '/api/admin/dashboard', token=tokAdm); check('admin panel keeps working', st == 200)
st, cs = update(secret, msg(U, '/menu')); check('bot shows the maintenance message', 'ارتقای سرور' in texts(cs), texts(cs))
st, cs = update(secret, msg(ADM, '/admin')); check('… but not to the admin', 'ارتقای سرور' not in texts(cs) and any('/admin/' in x for x in buttons(cs, 'web_app')))
st, r = req('PUT', '/api/admin/settings', {'maintenance': False, 'notice': ''}, tokAdm); time.sleep(16)

print('== broadcast ==')
base = 9100000 + random.randint(0, 9999) * 100
d1('INSERT INTO users(telegram_id,tg_name,display_name,created_at) VALUES ' + ','.join(f'({base + i},"B{i}","B{i}",{now})' for i in range(30)))
d1(f'UPDATE users SET blocked=1 WHERE telegram_id={base}')
st, r = req('GET', '/api/admin/broadcasts', token=tokAdm); aud = r.get('audiences', {}); check('audience counts', st == 200 and aud.get('all', 0) >= 31, aud)
n0 = len(calls()); st, r = req('POST', '/api/admin/broadcasts', {'text': '<b>تست</b>', 'audience': 'all', 'open_app': True, 'test': True}, tokAdm); time.sleep(0.3)
check('test broadcast goes only to the admin', st == 200 and [c['b']['chat_id'] for c in calls()[n0:] if c['m'] == 'sendMessage'] == [ADMIN_ID], r)
st, r = req('POST', '/api/admin/broadcasts', {'text': 'bad url', 'button_text': 'x', 'button_url': 'javascript:alert(1)'}, tokAdm); check('bad button URL rejected', st == 400 and r['error'] == 'bad_url', r)
MSG = 'Hello everyone %d' % random.randint(1, 10**6); n1 = len(calls())
st, b = req('POST', '/api/admin/broadcasts', {'text': MSG, 'audience': 'all', 'button_text': 'Site', 'button_url': 'https://example.com', 'open_app': True}, tokAdm); check('broadcast created', st == 201 and b['total'] == aud['all'], b)
steps = 0
while b.get('status') == 'running' and steps < 20:
    st, b = req('POST', f"/api/admin/broadcasts/{b['id']}/step", {}, tokAdm); steps += 1
got = [c for c in calls()[n1:] if c['m'] == 'sendMessage' and c['b'].get('text') == MSG]
check(f'broadcast finished in {steps} steps, every recipient once', b.get('status') == 'done' and b['sent'] == b['total'] == len(got) == len({c['b']['chat_id'] for c in got}), (b, len(got)))
check('blocked users skipped', base not in {c['b']['chat_id'] for c in got})
check('buttons: link + open app', all(len(c['b']['reply_markup']['inline_keyboard']) == 2 for c in got[:3]))
d1(f'DELETE FROM users WHERE telegram_id BETWEEN {base} AND {base + 99}')

print('== security page, audit log, sessions ==')
st, r = req('GET', '/api/admin/security', token=tokAdm)
acts = {l['action'] for l in r.get('log', [])}
check('audit log has logins, user actions, broadcasts, settings', {'login', 'user.block', 'broadcast.start', 'settings.update', 'word.create'} <= acts, acts)
check('admin sessions listed', st == 200 and len(r['sessions']) >= 2 and any(s['current'] for s in r['sessions']), r.get('sessions'))
st, r = req('POST', '/api/admin/security/revoke', {}, tokAdm); check('revoke all other admin sessions', st == 200 and r['removed'] >= 1, r)
st, r = req('GET', '/api/admin/security', token=tokAdm); check('only this session left', len(r['sessions']) == 1)
st, body, hd = req('GET', '/cdn-cgi/handler/scheduled', raw=True); check('cron tick runs', st == 200, st)

print('== clean-up ==')
st, r = req('DELETE', '/api/me/telegram', token=tokA); check('unlink Telegram', st == 200 and r['user']['telegram'] is None, r)
for tk, pw in [(tokA, 'secret123'), (tokD, 'pass1234')]: req('POST', '/api/me/delete', {'password': pw}, tk)
st, r = req('DELETE', f'/api/admin/users/{uidC}', token=tokAdm); check('admin deletes a user', st == 200)
st, r = req('GET', '/api/me', token=tokB); check('sessions gone after delete', st == 401)
st, r = req('POST', '/api/admin/auth/logout', {}, tokAdm); check('admin sign-out', st == 200)
st, r = req('GET', '/api/admin/dashboard', token=tokAdm); check('… session is gone', st == 401)
check('no bot crashes overall', bot_errors() == err0, bot_errors() - err0)
print(f'\n{ok} passed, {fail} failed'); raise SystemExit(1 if fail else 0)
