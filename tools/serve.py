"""RV Power storefront and analytics HTTP application."""
from contextlib import closing
from datetime import date, timedelta
from pathlib import Path
from threading import Lock
from time import monotonic
import argparse
import hmac
import os
import re
import secrets
import sqlite3

from flask import Flask, abort, jsonify, make_response, redirect, request, send_from_directory

ROOT = Path(__file__).resolve().parents[1]
EVENTS = {'page_view', 'product_view', 'spec_download', 'contact_click'}
SESSION_AGE = 8 * 60 * 60
COOKIE = 'rv_power_admin'
PUBLIC_FILES = {'index.html', 'contact-us.html', 'about.html'}
PUBLIC_DIRS = {'site', 'specs', 'RV power images'}


def local_admin_key(path):
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        return path.read_text().strip()
    key = secrets.token_urlsafe(32)
    with os.fdopen(descriptor, 'w') as stream:
        stream.write(key + '\n')
    return key


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config['MAX_CONTENT_LENGTH'] = 256 * 1024
    origin = os.getenv('RV_PUBLIC_ORIGIN', '').rstrip('/')
    production = bool(origin)
    data_dir = os.getenv('RV_DATA_DIR')
    admin_key = os.getenv('RV_ADMIN_KEY')
    if production and (not origin.startswith('https://') or not data_dir or len(admin_key or '') < 32):
        raise RuntimeError('Hosted deployments require an HTTPS origin, persistent data directory and a private admin key.')
    db = Path(data_dir or ROOT) / '.rv-power-analytics.sqlite3'
    db.parent.mkdir(parents=True, exist_ok=True)
    if not admin_key:
        admin_key = local_admin_key(ROOT / '.rv-power-admin-key')

    def database():
        return sqlite3.connect(db, timeout=10)

    with closing(database()) as connection, connection:
        connection.execute('CREATE TABLE IF NOT EXISTS counts (day TEXT, event TEXT, model TEXT, total INTEGER, '
                           'PRIMARY KEY(day, event, model))')
    db.chmod(0o600)
    sessions = {}
    lock = Lock()
    failures = {}

    def authenticated():
        with lock:
            return sessions.get(request.cookies.get(COOKIE), 0) > monotonic()

    def admin_page(signed_in=False, error='', status=200):
        template = 'admin-dashboard.html' if signed_in else 'admin-sign-in.html'
        html = (ROOT / 'tools' / template).read_text()
        if error:
            html = html.replace('<!--SIGN_IN_ERROR-->', f'<p class="admin-error" role="alert">{error}</p>')
        return make_response(html, status)

    @app.before_request
    def check_origin():
        if request.method != 'POST':
            return
        expected = origin or request.host_url.rstrip('/')
        sent = request.headers.get('Origin')
        if sent and sent != expected:
            abort(403)

    @app.after_request
    def secure_response(response):
        if request.path.startswith(('/admin', '/api/')):
            response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

    @app.get('/healthz')
    def health():
        with closing(database()) as connection:
            connection.execute('SELECT count(*) FROM counts').fetchone()
        return jsonify(status='ok')

    @app.get('/admin')
    def admin():
        return admin_page(signed_in=authenticated())

    @app.get('/analytics.html')
    @app.get('/admin/')
    def admin_redirect():
        return redirect('/admin', code=303)

    @app.post('/admin/sign-in')
    def sign_in():
        now = monotonic()
        key = request.form.get('key', '')
        # The public app is behind one proxy hop. A spoofed earlier address is ignored.
        source = request.access_route[-1] if production and request.access_route else request.remote_addr
        with lock:
            for address in [address for address, (_, expiry) in failures.items() if expiry <= now]:
                del failures[address]
            attempts, expiry = failures.get(source, (0, now + 300))
            if attempts >= 10:
                return admin_page(error='Too many attempts. Try again in five minutes.', status=429)
            if not hmac.compare_digest(key.encode(), admin_key.encode()):
                failures[source] = (attempts + 1, expiry)
                return admin_page(error='That admin key is incorrect.', status=401)
            failures.pop(source, None)
            for token in [token for token, expiry in sessions.items() if expiry <= now]:
                del sessions[token]
            sessions.pop(request.cookies.get(COOKIE), None)
            token = secrets.token_urlsafe(32)
            sessions[token] = now + SESSION_AGE
        response = redirect('/admin', code=303)
        response.set_cookie(COOKIE, token, max_age=SESSION_AGE,
                            secure=production, httponly=True, samesite='Strict')
        return response

    @app.post('/admin/sign-out')
    def sign_out():
        with lock:
            sessions.pop(request.cookies.get(COOKIE), None)
        response = redirect('/admin', code=303)
        response.delete_cookie(COOKIE, secure=production, httponly=True, samesite='Strict')
        return response

    @app.get('/api/analytics')
    def analytics():
        if not authenticated():
            return jsonify(error='Admin sign-in required'), 401
        cutoff = (date.today() - timedelta(days=29)).isoformat()
        with closing(database()) as connection:
            rows = connection.execute(
                'SELECT day, event, model, total FROM counts WHERE day >= ? ORDER BY day', (cutoff,)
            ).fetchall()
        return jsonify(rows=rows)

    @app.post('/api/events')
    def events():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(error='Invalid event'), 400
        event, model = data.get('event'), data.get('model', '')
        if not isinstance(event, str) or event not in EVENTS or not isinstance(model, str) or not re.fullmatch(r'[a-z0-9-]{0,45}', model):
            return jsonify(error='Invalid event'), 400
        with closing(database()) as connection, connection:
            connection.execute(
                'INSERT INTO counts VALUES (?, ?, ?, 1) ON CONFLICT(day, event, model) '
                'DO UPDATE SET total = total + 1', (date.today().isoformat(), event, model)
            )
        return jsonify(recorded=True), 201

    @app.get('/')
    @app.get('/<path:filename>')
    def storefront(filename='index.html'):
        parts = Path(filename).parts
        if not parts or any(part in ('.', '..') or part.startswith('.') for part in parts):
            abort(404)
        if filename in ('products.html', 'shop.html', 'shop-detail.html', 'checkout.html'):
            return redirect('/#catalog', code=302)
        if filename not in PUBLIC_FILES and parts[0] not in PUBLIC_DIRS:
            abort(404)
        return send_from_directory(ROOT, filename)

    return app


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    create_app().run(host='127.0.0.1', port=args.port)
