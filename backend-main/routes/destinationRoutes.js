const express = require('express');
const {
  listDestinations,
  listTags,
  recommended,
  getDestination,
  getActivities,
  removeDestination,
} = require('../controllers/destinationController');
const { optionalAuth, protect } = require('../middleware/auth');

const router = express.Router();

// all public, but results get personalised when a token is present
router.get('/', optionalAuth, listDestinations);
router.get('/tags', listTags);
router.get('/recommended', optionalAuth, recommended);
router.get('/:idOrSlug', optionalAuth, getDestination);
router.get('/:idOrSlug/activities', getActivities);
router.delete('/:id', protect, removeDestination);

module.exports = router;
