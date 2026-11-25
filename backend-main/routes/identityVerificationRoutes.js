const express = require('express');
const { getStatus, createSession } = require('../controllers/identityVerificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/status', getStatus);
router.post('/session', createSession);

module.exports = router;
