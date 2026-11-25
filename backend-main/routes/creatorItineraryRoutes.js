const express = require('express')
const {
  listPublished,
  getById,
  create,
  update,
} = require('../controllers/creatorItineraryController')
const { optionalAuth, protect } = require('../middleware/auth')

const router = express.Router()

router.get('/', optionalAuth, listPublished)
router.get('/:id', optionalAuth, getById)
router.post('/', protect, create)
router.put('/:id', protect, update)

module.exports = router
