const express = require('express');
const { listRooms, listMessages, sendMessage, inviteMember } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/rooms', listRooms);
router.get('/rooms/:tripId/messages', listMessages);
router.post('/rooms/:tripId/messages', sendMessage);
router.post('/rooms/:tripId/members', inviteMember);

module.exports = router;
