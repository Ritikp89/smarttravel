const express = require('express');
const { weather, geocodeSearch, travelTime, links } = require('../controllers/externalController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Weather is public (the destination page shows it to everyone); the rest needs a login
// mostly so nobody uses our server as a free geocoding proxy.
router.get('/weather', weather);
router.get('/geocode', protect, geocodeSearch);
router.get('/travel-time', protect, travelTime);
router.get('/map-links', links);

module.exports = router;
