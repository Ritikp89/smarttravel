const ChatMessage = require('../models/ChatMessage');
const Trip = require('../models/Trip');
const User = require('../models/User');
const SoloTravelerMatch = require('../models/SoloTravelerMatch');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const roomForMember = async (tripId, userId) => {
  const trip = await Trip.findOne({
    _id: tripId,
    $or: [{ user: userId }, { members: userId }],
  });
  if (!trip) throw new ApiError(404, "Couldn't find that group chat");
  return trip;
};

const listRooms = asyncHandler(async (req, res) => {
  const trips = await Trip.find({
    $or: [{ user: req.user._id }, { members: req.user._id }],
  })
    .populate('destination', 'name country image')
    .populate('user', 'name avatarColor')
    .populate('members', 'name avatarColor')
    .sort({ updatedAt: -1 })
    .lean();

  res.json({
    rooms: trips.map((trip) => ({
      _id: trip._id,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      owner: trip.user,
      members: trip.members || [],
      isOwner: String(trip.user?._id) === String(req.user._id),
    })),
  });
});

const listMessages = asyncHandler(async (req, res) => {
  const trip = await roomForMember(req.params.tripId, req.user._id);
  const messages = await ChatMessage.find({ trip: trip._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('sender', 'name avatarColor')
    .lean();

  res.json({ messages: messages.reverse() });
});

const sendMessage = asyncHandler(async (req, res) => {
  const trip = await roomForMember(req.params.tripId, req.user._id);
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if (!content) throw new ApiError(400, 'Write a message before sending');
  if (content.length > 2000) throw new ApiError(400, 'Messages must be 2000 characters or fewer');

  const message = await ChatMessage.create({
    trip: trip._id,
    sender: req.user._id,
    content,
  });
  await message.populate('sender', 'name avatarColor');

  res.status(201).json({ message });
});

const inviteMember = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.tripId, user: req.user._id });
  if (!trip) throw new ApiError(404, "Couldn't find that trip");

  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Enter a valid email address');

  const member = await User.findOne({ email }).select('_id');
  if (!member) throw new ApiError(404, 'No account exists for that email address');
  if (String(member._id) === String(req.user._id)) {
    throw new ApiError(400, 'You are already the owner of this trip');
  }
  if ((trip.members || []).some((id) => String(id) === String(member._id))) {
    throw new ApiError(409, 'That person is already in this group chat');
  }

  trip.members.addToSet(member._id);
  const wasMatchingEnabled = trip.matchingEnabled;
  trip.matchingEnabled = false;
  await trip.save();
  if (wasMatchingEnabled) {
    await SoloTravelerMatch.updateMany(
      { $or: [{ requesterTrip: trip._id }, { recipientTrip: trip._id }], status: { $in: ['pending', 'accepted'] } },
      { $set: { status: 'withdrawn' } }
    );
  }

  res.status(201).json({ message: 'Member added to the group chat' });
});

module.exports = { listRooms, listMessages, sendMessage, inviteMember };
