const express = require('express');
const { listWatches, createWatch, checkPrice, deleteWatch } = require('../controllers/priceWatchController');

const router = express.Router({ mergeParams: true });

router.route('/').get(listWatches).post(createWatch);
router.patch('/:watchId/check', checkPrice);
router.delete('/:watchId', deleteWatch);

module.exports = router;
