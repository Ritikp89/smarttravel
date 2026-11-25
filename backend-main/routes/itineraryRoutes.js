const express = require('express');
const { generate, getItinerary, updateDay, removeItinerary } = require('../controllers/itineraryController');

// mergeParams so we can read :tripId from the parent router
const router = express.Router({ mergeParams: true });

router.route('/').get(getItinerary).post(generate).delete(removeItinerary);
router.put('/days/:dayNumber', updateDay);

module.exports = router;
