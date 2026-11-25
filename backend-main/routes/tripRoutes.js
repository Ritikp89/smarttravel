const express = require('express');
const { listTrips, createTrip, getTrip, updateTrip, deleteTrip, analyseTrip } = require('../controllers/tripController');
const { protect } = require('../middleware/auth');
const itineraryRoutes = require('./itineraryRoutes');
const budgetRoutes = require('./budgetRoutes');
const groupSplitRoutes = require('./groupSplitRoutes');
const priceWatchRoutes = require('./priceWatchRoutes');
const savingsPlanRoutes = require('./savingsPlanRoutes');

const router = express.Router();

router.use(protect);

router.route('/').get(listTrips).post(createTrip);
router.route('/:id').get(getTrip).put(updateTrip).delete(deleteTrip);
router.get('/:id/analysis', analyseTrip);

// nested resources live under the trip they belong to
router.use('/:tripId/itinerary', itineraryRoutes);
router.use('/:tripId/budget', budgetRoutes);
router.use('/:tripId/splits', groupSplitRoutes);
router.use('/:tripId/price-watches', priceWatchRoutes);
router.use('/:tripId/savings', savingsPlanRoutes);

module.exports = router;
