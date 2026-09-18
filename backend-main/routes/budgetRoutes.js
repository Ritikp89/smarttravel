const express = require('express');
const { estimate, getBudget, updateBudget, resetLine } = require('../controllers/budgetController');

const router = express.Router({ mergeParams: true });

router.route('/').get(getBudget).post(estimate).put(updateBudget);
router.post('/lines/:category/reset', resetLine);

module.exports = router;
