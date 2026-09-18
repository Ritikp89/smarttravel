const express = require('express');
const { register, login, getMe, updateMe, toggleSaved } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/saved/:destinationId', protect, toggleSaved);

module.exports = router;
