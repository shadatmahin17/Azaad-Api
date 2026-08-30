const express = require('express');
const { API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD } = require('../config/env');
const { requireApiKey } = require('../middleware/auth');

const router = express.Router();

router.get('/auth-check', requireApiKey, (req, res) => {
  res.json({ ok: true });
});

router.post('/login', async (req, res) => {
  const username =
    typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
  const password =
    typeof req.body?.password === 'string' ? req.body.password : '';
  const identifier = email || username;

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ error: 'username/email and password are required' });
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({
      ok: true,
      mode: 'admin',
      accessToken: API_KEY,
      user: { username: ADMIN_USERNAME, email: `${ADMIN_USERNAME}@azaad.com` },
    });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

router.post('/logout', (req, res) => {
  res.json({ ok: true, message: 'Signed out successfully' });
});

module.exports = router;
