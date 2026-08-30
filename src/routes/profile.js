const express = require('express');
const { requireApiKey } = require('../middleware/auth');

const router = express.Router();

// Get profile
router.get('/profile', (req, res) => {
  res.json({
    id: 'admin',
    name: 'Azaad User',
    email: 'admin@azaad.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
  });
});

// Update profile
router.put('/profile', (req, res) => {
  const { name, email, avatarUrl } = req.body || {};
  res.json({
    message: 'Profile updated',
    profile: {
      id: 'admin',
      name: name || 'Azaad User',
      email: email || 'admin@azaad.com',
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    },
  });
});

module.exports = router;
