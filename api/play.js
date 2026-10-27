const { PFX, redis, getJSON, setJSON, body, userFrom, askJSON, fail } = require('./_lib');
const E = require('../engine.js');

// The engine asks; the Claude API answers.
const ask = ({ kind, system, prompt, schema }) => askJSON({
  system, prompt, schema,
  effort: kind === 'coach' ? 'medium' : 'low',
  maxTokens: kind === 'coach' ? 8000 : 3000,
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { action, token, id, text, mode, guess, challenge, delay } = body(req);
  try {
    const user = await userFrom(token);
    if (!user) return res.status(401).json({ error: 'session_expired' });

    if (action === 'start') {
      const s = await E.start(ask, { user: user.id, userName: user.name, mode, challenge });
      await setJSON('s:' + s.id, s);
      await redis('LPUSH', PFX + 'us:' + user.id, s.id);
      await redis('LPUSH', PFX + 'all', s.id);
      return res.json(E.view(s));
    }

    if (action === 'mine') {
      const ids = await redis('LRANGE', PFX + 'us:' + user.id, 0, 99);
      const all = await Promise.all(ids.map(i => getJSON('s:' + i)));
      return res.json({ sessions: all.filter(Boolean).map(E.summary), stages: E.STAGES });
    }

    const s = id && await getJSON('s:' + id);
    if (!s || s.user !== user.id) return res.status(404).json({ error: 'ไม่พบเซสชันนี้' });

    if (action === 'get') return res.json(E.view(s));

    if (guess !== undefined && !s.ended) s.guess = E.GROUPS.some(g => g.id === guess) ? guess : null;
    if (action === 'guess') { await setJSON('s:' + s.id, s); return res.json({ ok: true }); }

    if (action === 'suggest') {
      if (s.ended || s.mode === 'real') return res.status(400).json({ error: 'ขอไอเดียได้เฉพาะโหมดฝึก' });
      return res.json({ ideas: await E.suggest(ask, s) });
    }

    if (action === 'say') {
      if (s.ended) return res.status(409).json({ error: 'แชตนี้จบแล้ว' });
      const msg = String(text || '').trim().slice(0, 2000);
      if (!msg) return res.status(400).json({ error: 'พิมพ์ข้อความก่อน' });
      // Coaching runs in a separate `end` call, so a slow coach can't lose this turn.
      await E.say(ask, s, msg, { delay });
      await setJSON('s:' + s.id, s);
      return res.json(E.view(s));
    }

    if (action === 'end') {
      if (!s.ended) { await E.finish(ask, s); await setJSON('s:' + s.id, s); }
      return res.json(E.view(s));
    }

    return res.status(400).json({ error: 'unknown_action' });
  } catch (e) { return fail(res, e); }
};
