import signIn from '../tools/admin-sign-in.html';
import dashboard from '../tools/admin-dashboard.html';
import products from '../site/catalog.js';

const events = new Set(['page_view', 'product_view', 'spec_download', 'contact_click']);
const models = new Set(products.map(product => product.id));
const encoder = new TextEncoder();
const duration = 8 * 60 * 60;
const cookie = 'rv_power_analytics';

function respond(body, status = 200, headers = {}) {
  return new Response(body, {status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY', ...headers
  }});
}

const json = (body, status = 200) => respond(JSON.stringify(body), status, {'Content-Type': 'application/json'});
const html = (body, status = 200) => respond(body, status, {'Content-Type': 'text/html; charset=utf-8'});
const now = () => Math.floor(Date.now() / 1000);
const hex = bytes => [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');

async function mac(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function equal(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function sessionToken(request) {
  const token = (request.headers.get('Cookie') || '').split('; ').find(part => part.startsWith(cookie + '='))?.slice(cookie.length + 1);
  return token && /^[0-9a-f]{64}$/.test(token) ? token : '';
}

async function authenticated(request, env) {
  const token = sessionToken(request);
  if (!token) return false;
  const hash = await mac(env.ADMIN_KEY, 'session:' + token);
  return Boolean(await env.DB.prepare('SELECT 1 FROM admin_sessions WHERE token_hash=? AND expires>?')
    .bind(hash, now()).first());
}

function redirect(cookieValue) {
  return respond(null, 303, {
    Location: '/admin',
    'Set-Cookie': `${cookie}=${cookieValue}; Path=/; Secure; HttpOnly; SameSite=Strict`
  });
}

async function collect(request, env) {
  const origin = request.headers.get('Origin');
  if (origin !== env.STOREFRONT_ORIGIN && origin !== 'https://www.rv-power.in') return respond(null, 403);
  const cors = {'Access-Control-Allow-Origin': origin, Vary: 'Origin'};
  if (request.method === 'OPTIONS') {
    return respond(null, 204, {...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type'});
  }
  if (request.method !== 'POST') return respond(null, 405, cors);
  const body = await request.text();
  if (body.length > 512) return respond(null, 413, cors);
  let data;
  try { data = JSON.parse(body); } catch { return respond(null, 400, cors); }
  const event = data?.event;
  const model = data?.model ?? '';
  if (!events.has(event) || (model !== '' && !models.has(model))) return respond(null, 400, cors);
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare(`INSERT INTO counts (day, event, model, total) VALUES (?, ?, ?, 1)
    ON CONFLICT (day, event, model) DO UPDATE SET total = total + 1`).bind(day, event, model).run();
  return respond(null, 204, cors);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === 'http:' && url.hostname.endsWith('.workers.dev')) {
      url.protocol = 'https:';
      return respond(null, 308, {Location: url.href});
    }
    const {pathname} = url;
    if (pathname === '/api/events') return collect(request, env);
    if (!env.ADMIN_KEY || env.ADMIN_KEY.length < 32) return json({error: 'Analytics admin is being configured'}, 503);
    if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) return respond(null, 403);
    if (pathname === '/admin/sign-in' && request.method === 'POST') {
      const raw = await request.text();
      if (raw.length > 512) return respond(null, 413);
      const submitted = new URLSearchParams(raw).get('key') || '';
      if (!equal(await mac(env.ADMIN_KEY, submitted), await mac(env.ADMIN_KEY, env.ADMIN_KEY))) {
        return html(signIn.replace('<!--SIGN_IN_ERROR-->', '<p class="admin-error" role="alert">That admin key is incorrect.</p>'), 401);
      }
      const token = hex(crypto.getRandomValues(new Uint8Array(32)));
      const hash = await mac(env.ADMIN_KEY, 'session:' + token);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM admin_sessions WHERE expires<=?').bind(now()),
        env.DB.prepare('INSERT INTO admin_sessions (token_hash, expires) VALUES (?, ?)').bind(hash, now() + duration)
      ]);
      return redirect(`${token}; Max-Age=${duration}`);
    }
    if (pathname === '/admin/sign-out' && request.method === 'POST') {
      const token = sessionToken(request);
      if (token) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?')
        .bind(await mac(env.ADMIN_KEY, 'session:' + token)).run();
      return redirect('; Max-Age=0');
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return respond(null, 405);
    if (pathname === '/' || pathname === '/analytics.html') return respond(null, 302, {Location: '/admin'});
    const storefrontLink = markup => markup.replace(/href="(?:\.\/|\/)"/g, `href="${env.STOREFRONT_ORIGIN}/"`);
    if (pathname === '/admin') return html(storefrontLink(await authenticated(request, env) ? dashboard : signIn));
    if (pathname === '/api/analytics') {
      if (!await authenticated(request, env)) return json({error: 'Admin sign-in required'}, 401);
      const start = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      const {results} = await env.DB.prepare('SELECT day, event, model, total FROM counts WHERE day >= ? ORDER BY day').bind(start).all();
      return json({rows: results.map(({day, event, model, total}) => [day, event, model, total])});
    }
    return respond(null, 404);
  }
};
