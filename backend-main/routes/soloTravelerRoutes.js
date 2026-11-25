const express = require('express');
const {
  listTrips,
  setTripVisibility,
  listCandidates,
  sendRequest,
  listRequests,
  respondToRequest,
  sendMessage,
  blockTraveler,
  reportTraveler,
} = require('../controllers/soloTravelerController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/trips', listTrips);
router.patch('/trips/:tripId/visibility', setTripVisibility);
router.get('/trips/:tripId/candidates', listCandidates);
router.post('/trips/:tripId/requests', sendRequest);
router.get('/requests', listRequests);
router.patch('/requests/:matchId', respondToRequest);
router.post('/requests/:matchId/messages', sendMessage);
router.post('/requests/:matchId/block', blockTraveler);
router.post('/requests/:matchId/report', reportTraveler);

module.exports = router;
