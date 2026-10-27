const crypto = require('crypto');
const { PFX, redis, getJSON, setJSON, body, userFrom, roleOf, fail } = require('./_lib');
const { summary, STAGES } = require('../engine.js');

// Team lead only: everyone's practice, plus account management.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { token, action, id, role, pass } = body(req);
  try {
    const me = await userFrom(token);
    if (!me) return res.status(401).json({ error: 'session_expired' });
    if (me.role !== 'admin') return res.status(403).json({ error: 'เฉพาะหัวหน้าทีม' });

    if (action === 'get') {
      const s = id && await getJSON('s:' + id);
      if (!s) return res.status(404).json({ error: 'ไม่พบแชตนี้' });
      return res.json(s);
    }

    if (action === 'users') {
      const ids = await redis('SMEMBERS', PFX + 'users');
      const users = (await Promise.all(ids.map(i => getJSON('u:' + i)))).filter(Boolean)
        .map(u => ({ id: u.id, name: u.name, role: roleOf(u), created: u.created, lastSeen: u.lastSeen }));
      return res.json({ users });
    }

    if (action === 'setRole' || action === 'resetPass') {
      const u = id && await getJSON('u:' + id);
      if (!u) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
      if (action === 'setRole') {
        if (u.id === me.id) return res.status(400).json({ error: 'เปลี่ยนสิทธิ์ตัวเองไม่ได้' });
        u.role = role === 'admin' ? 'admin' : 'member';
      } else {
        if (!pass || String(pass).length < 4) return res.status(400).json({ error: 'รหัสผ่านอย่างน้อย 4 ตัว' });
        u.salt = crypto.randomBytes(16).toString('hex');
        u.hash = require('./auth').hash(pass, u.salt);
      }
      await setJSON('u:' + u.id, u);
      return res.json({ ok: true, user: { id: u.id, name: u.name, role: roleOf(u) } });
    }

    // default: every session summary, newest first
    const ids = await redis('LRANGE', PFX + 'all', 0, 999);
    const all = (await Promise.all(ids.map(i => getJSON('s:' + i)))).filter(Boolean);
    return res.json({ sessions: all.map(summary), stages: STAGES });
  } catch (e) { return fail(res, e); }
};
