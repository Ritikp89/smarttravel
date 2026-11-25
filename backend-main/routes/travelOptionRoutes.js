const express = require('express');
const {
  listVerifiedOptions,
  listAllOptions,
  createOption,
  updateVerification,
} = require('../controllers/travelOptionController');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/verified', listVerifiedOptions);
router.get('/admin', protect, requireAdmin, listAllOptions);
router.post('/admin', protect, requireAdmin, createOption);
router.patch('/admin/:id/verification', protect, requireAdmin, updateVerification);

module.exports = router;
