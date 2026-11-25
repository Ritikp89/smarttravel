const express = require('express');
const {
  getPlan,
  createPlan,
  addContribution,
  removeContribution,
  deletePlan,
} = require('../controllers/savingsPlanController');

const router = express.Router({ mergeParams: true });

router.route('/').get(getPlan).post(createPlan).delete(deletePlan);
router.post('/contributions', addContribution);
router.delete('/contributions/:contributionId', removeContribution);

module.exports = router;
