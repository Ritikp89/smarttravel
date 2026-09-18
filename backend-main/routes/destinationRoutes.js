const express = require('express');
const {
  listDestinations,
  listTags,
  recommended,
  getDestination,
  getActivities,
} = require('../controllers/destinationController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// all public, but results get personalised when a token is present
router.get('/', optionalAuth, listDestinations);
router.get('/tags', listTags);
router.get('/recommended', optionalAuth, recommended);
router.get('/:idOrSlug', optionalAuth, getDestination);
router.get('/:idOrSlug/activities', getActivities);

module.exports = router;
