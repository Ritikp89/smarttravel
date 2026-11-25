const express = require('express');
const { listTrips, createTrip, getTrip, updateTrip, deleteTrip, analyseTrip } = require('../controllers/tripController');
const { protect } = require('../middleware/auth');
const itineraryRoutes = require('./itineraryRoutes');
const budgetRoutes = require('./budgetRoutes');

const router = express.Router();

router.use(protect);

router.route('/').get(listTrips).post(createTrip);
router.route('/:id').get(getTrip).put(updateTrip).delete(deleteTrip);
router.get('/:id/analysis', analyseTrip);

// nested resources live under the trip they belong to
router.use('/:tripId/itinerary', itineraryRoutes);
router.use('/:tripId/budget', budgetRoutes);

module.exports = router;
