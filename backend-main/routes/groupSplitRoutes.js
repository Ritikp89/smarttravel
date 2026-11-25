const express = require('express');
const { listSplits, createSplit, updateShare, deleteSplit } = require('../controllers/groupSplitController');

const router = express.Router({ mergeParams: true });

router.route('/').get(listSplits).post(createSplit);
router.patch('/:expenseId/shares/:userId', updateShare);
router.delete('/:expenseId', deleteSplit);

module.exports = router;
