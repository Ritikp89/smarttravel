const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { submitFeedback } = require('../controllers/feedbackController');

const router = express.Router();

router.post('/', optionalAuth, submitFeedback);

module.exports = router;
