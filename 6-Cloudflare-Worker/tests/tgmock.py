# minimal fake Telegram Bot API: logs every call to calls.jsonl and returns plausible results
import json, http.server, itertools, sys
import os
LOG = os.environ.get('LOG', '/data/vajeyar/tmp/calls.jsonl')
mid = itertools.count(100)
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0); raw = self.rfile.read(n)
        method = self.path.rsplit('/', 1)[-1]
        ct = self.headers.get('Content-Type', '')
        try: body = json.loads(raw) if 'json' in ct else {'_multipart': len(raw)}
        except Exception: body = {'_raw': len(raw)}
        with open(LOG, 'a') as f: f.write(json.dumps({'m': method, 'b': body}, ensure_ascii=False) + '\n')
        if method == 'getMe': res = {'id': 999, 'is_bot': True, 'first_name': 'DanaFox Test', 'username': 'vajeyar_test_bot', 'supports_inline_queries': True}
        elif method == 'getWebhookInfo': res = {'url': 'http://x/tg/webhook', 'pending_update_count': 0}
        elif method in ('sendMessage', 'sendVoice', 'sendAudio', 'editMessageText', 'sendPhoto'):
            res = {'message_id': next(mid), 'chat': {'id': body.get('chat_id', 0) if isinstance(body, dict) else 0}, 'date': 0}
        elif method == 'getFile': res = {'file_id': 'f', 'file_path': 'x.txt'}
        else: res = True
        out = json.dumps({'ok': True, 'result': res}).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(out))); self.end_headers(); self.wfile.write(out)
    do_GET = do_POST
http.server.ThreadingHTTPServer(('127.0.0.1', 8899), H).serve_forever()
