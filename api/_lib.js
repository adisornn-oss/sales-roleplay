const crypto = require('crypto');
const AnthropicMod = require('@anthropic-ai/sdk');
const Anthropic = AnthropicMod.default || AnthropicMod;

const PFX = 'rp:';
// Upstash in production; a JSON file when no Upstash is configured (local dev, or a
// host with a persistent disk mounted at DATA_DIR).
async function redis(...cmd) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return fileRedis(cmd);
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const fs = require('fs'), path = require('path');
const DATA_FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', '.data'), 'db.json');
let mem = null, saveTimer = null;
function load() {
  if (mem) return mem;
  try { mem = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { mem = { kv: {}, exp: {} }; }
  return mem;
}
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(mem));
    fs.renameSync(DATA_FILE + '.tmp', DATA_FILE);
  }, 50);
}
// The handful of Redis commands this app uses.
function fileRedis([op, key, ...a]) {
  const db = load(), kv = db.kv;
  if (db.exp[key] && db.exp[key] < Date.now()) { delete kv[key]; delete db.exp[key]; }
  const list = () => (Array.isArray(kv[key]) ? kv[key] : (kv[key] = []));
  let out = null, dirty = true;
  switch (op) {
    case 'GET': out = typeof kv[key] === 'string' ? kv[key] : null; dirty = false; break;
    case 'SET': kv[key] = String(a[0]); delete db.exp[key]; if (String(a[1]).toUpperCase() === 'EX') db.exp[key] = Date.now() + Number(a[2]) * 1000; out = 'OK'; break;
    case 'DEL': out = key in kv ? 1 : 0; delete kv[key]; delete db.exp[key]; break;
    case 'EXPIRE': if (key in kv) db.exp[key] = Date.now() + Number(a[0]) * 1000; out = 1; break;
    case 'INCR': kv[key] = String(Number(kv[key] || 0) + 1); out = Number(kv[key]); break;
    case 'SADD': { const l = list(); for (const v of a) if (!l.includes(v)) l.push(v); out = 1; break; }
    case 'SMEMBERS': out = Array.isArray(kv[key]) ? [...kv[key]] : []; dirty = false; break;
    case 'LPUSH': { const l = list(); l.unshift(...a.reverse()); out = l.length; break; }
    case 'LRANGE': { const l = Array.isArray(kv[key]) ? kv[key] : []; const end = Number(a[1]) < 0 ? l.length : Number(a[1]) + 1; out = l.slice(Number(a[0]), end); dirty = false; break; }
    case 'LTRIM': { const l = list(); kv[key] = l.slice(Number(a[0]), Number(a[1]) + 1); out = 'OK'; break; }
    default: throw new Error('unsupported_command ' + op);
  }
  if (dirty) persist();
  return out;
}

const getJSON = async k => { const v = await redis('GET', PFX + k); return v ? JSON.parse(v) : null; };
const setJSON = (k, v, ...rest) => redis('SET', PFX + k, JSON.stringify(v), ...rest);

function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  return b || {};
}
const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const newId = (n = 12) => crypto.randomBytes(n).toString('hex');
const TTL = 60 * 60 * 24 * 60;

const ADMINS = () => String(process.env.ADMIN_USERS || '').split(',').map(norm).filter(Boolean);
const roleOf = u => (u.role === 'admin' || ADMINS().includes(u.id)) ? 'admin' : 'member';
async function userFrom(token) {
  const id = token && await redis('GET', PFX + 't:' + token);
  const u = id && await getJSON('u:' + id);
  return u ? { ...u, role: roleOf(u) } : null;
}

function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/* ---------- Claude ---------- */
const MODEL = 'claude-opus-5-5';
let client;
async function askJSON({ system, prompt, schema, effort = 'low', maxTokens = 4000 }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ai_not_configured');
  client = client || new Anthropic();
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort, format: { type: 'json_schema', schema } },
  });
  if (res.stop_reason === 'refusal') throw new Error('ai_refused');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text);
}

function fail(res, e) {
  const map = {
    ai_not_configured: [503, 'ยังไม่ได้ใส่ ANTHROPIC_API_KEY'],
    ai_refused: [502, 'AI ปฏิเสธคำขอ ลองใหม่อีกครั้ง'],
  };
  const [code, msg] = map[e.message] || [500, 'เซิร์ฟเวอร์ขัดข้อง'];
  if (!map[e.message]) console.error(e);
  return res.status(code).json({ error: msg });
}

module.exports = { PFX, redis, getJSON, setJSON, body, norm, newId, TTL, userFrom, roleOf, same, askJSON, fail };
