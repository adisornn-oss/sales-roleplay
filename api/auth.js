const crypto = require('crypto');
const { PFX, redis, getJSON, setJSON, body, norm, newId, TTL, same, roleOf, fail } = require('./_lib');

const hash = (pw, salt) => crypto.pbkdf2Sync(String(pw), salt, 120000, 32, 'sha256').toString('hex');
const publicUser = u => ({ id: u.id, name: u.name, role: roleOf(u) });

async function session(u) {
  const tk = newId(24);
  await redis('SET', PFX + 't:' + tk, u.id, 'EX', TTL);
  return { token: tk, user: publicUser(u) };
}

// Username + password. Roles: "admin" (team lead, sees everyone) or "member" (sees only
// their own practice). ADMIN_USERS lists admin usernames; admins can also promote others.
// TEAM_CODE, when set, is required to create an account so only the team can sign up.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { action, name, pass, code, token } = body(req);
  try {
    if (action === 'me') {
      const id = token && await redis('GET', PFX + 't:' + token);
      const u = id && await getJSON('u:' + id);
      if (!u) return res.status(401).json({ error: 'session_expired' });
      await redis('EXPIRE', PFX + 't:' + token, TTL);
      return res.json({ user: publicUser(u) });
    }
    if (action === 'logout') {
      if (token) await redis('DEL', PFX + 't:' + token);
      return res.json({ ok: true });
    }

    const id = norm(name);
    if (!id) return res.status(400).json({ error: 'ใส่ชื่อผู้ใช้' });
    if (id.length > 40) return res.status(400).json({ error: 'ชื่อยาวเกินไป (ไม่เกิน 40 ตัว)' });
    if (!pass || String(pass).length < 4) return res.status(400).json({ error: 'รหัสผ่านอย่างน้อย 4 ตัว' });
    const existing = await getJSON('u:' + id);

    if (action === 'register') {
      if (process.env.TEAM_CODE && !same(String(code || '').trim(), process.env.TEAM_CODE))
        return res.status(403).json({ error: 'รหัสทีมไม่ถูกต้อง ขอรหัสจากหัวหน้าทีม' });
      if (existing) return res.status(409).json({ error: 'ชื่อนี้มีคนใช้แล้ว ถ้าเป็นของคุณให้เข้าสู่ระบบ' });
      const salt = crypto.randomBytes(16).toString('hex');
      const u = { id, name: String(name).trim(), salt, hash: hash(pass, salt), role: 'member', created: Date.now(), lastSeen: Date.now() };
      await setJSON('u:' + id, u);
      await redis('SADD', PFX + 'users', id);
      return res.json(await session(u));
    }

    if (action === 'login') {
      const fk = PFX + 'f:' + id;
      if (Number(await redis('GET', fk) || 0) >= 10) return res.status(429).json({ error: 'ผิดหลายครั้งเกินไป ลองใหม่ใน 15 นาที' });
      if (!existing || !same(hash(pass, existing.salt), existing.hash)) {
        await redis('INCR', fk); await redis('EXPIRE', fk, 900);
        return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      }
      await redis('DEL', fk);
      existing.lastSeen = Date.now();
      await setJSON('u:' + id, existing);
      return res.json(await session(existing));
    }

    return res.status(400).json({ error: 'unknown_action' });
  } catch (e) { return fail(res, e); }
};

module.exports.hash = hash;
