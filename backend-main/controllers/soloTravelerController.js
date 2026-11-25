const Trip = require('../models/Trip');
const Destination = require('../models/Destination');
const User = require('../models/User');
const SoloTravelerMatch = require('../models/SoloTravelerMatch');
const SoloTravelerSafetyReport = require('../models/SoloTravelerSafetyReport');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const {
  normalizeCityKey,
  tripsOverlap,
  sharedInterests,
  isEligibleSoloTrip,
  tripPairKey,
} = require('../services/soloTravelerMatchingService');

const ACTIVITY_TYPES = ['day_tour', 'meal', 'shared_ride'];
const REPORT_REASONS = ['inappropriate_behavior', 'fake_profile', 'unsafe_request', 'other'];
const exactRegex = (value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

const requireMatchEligibility = (user) => {
  if (user.identityVerification?.status !== 'verified') {
    throw new ApiError(403, 'Complete Stripe ID verification before using solo traveler matching');
  }
  if (!user.identityVerification.ageBand) {
    throw new ApiError(403, 'A verified adult age band is required for solo traveler matching');
  }
};

const findOwnedTrip = async (tripId, userId) => {
  const trip = await Trip.findOne({ _id: tripId, user: userId }).populate('destination', 'name country');
  if (!trip) throw new ApiError(404, "Couldn't find that trip");
  return trip;
};

const ensureMatchableTrip = (trip) => {
  if (!isEligibleSoloTrip(trip)) {
    throw new ApiError(400, 'Only upcoming, opted-in trips for one traveler can be matched');
  }
};

const getCandidates = async (trip, user) => {
  requireMatchEligibility(user);
  ensureMatchableTrip(trip);

  const [sameCityDestinations, existingMatches] = await Promise.all([
    Destination.find({
      name: exactRegex(trip.destination.name.trim()),
      country: exactRegex(trip.destination.country.trim()),
    }).select('_id').lean(),
    SoloTravelerMatch.find({
      $or: [{ requesterTrip: trip._id }, { recipientTrip: trip._id }],
      status: { $ne: 'withdrawn' },
    })
      .select('requesterTrip recipientTrip status')
      .lean(),
  ]);
  if (!sameCityDestinations.length) return [];

  const potentialTrips = await Trip.find({
      _id: { $ne: trip._id },
      matchingEnabled: true,
      travelers: 1,
      destination: { $in: sameCityDestinations.map((destination) => destination._id) },
      $or: [{ members: { $size: 0 } }, { members: { $exists: false } }],
      status: { $in: ['planning', 'booked'] },
      startDate: { $lte: trip.endDate },
      endDate: { $gte: trip.startDate },
    })
      .select('user destination startDate endDate interests members travelers matchingEnabled status')
      .populate('destination', 'name country')
      .sort({ startDate: 1 })
      .limit(500)
      .lean();

  if (!potentialTrips.length) return [];

  const hiddenTripIds = new Set();
  for (const match of existingMatches) {
    hiddenTripIds.add(String(match.requesterTrip) === String(trip._id) ? String(match.recipientTrip) : String(match.requesterTrip));
  }

  const currentUserId = String(user._id);
  const currentBlocked = (user.blockedTravelers || []).map(String);
  const candidateUserIds = [...new Set(potentialTrips.map((candidate) => String(candidate.user)))];
  const candidateUsers = await User.find({
    _id: { $in: candidateUserIds, $nin: [...currentBlocked, currentUserId] },
    'identityVerification.status': 'verified',
    'identityVerification.ageBand': user.identityVerification.ageBand,
    blockedTravelers: { $nin: [user._id] },
  })
    .select('name avatarColor preferences.interests identityVerification.ageBand')
    .lean();
  const usersById = new Map(candidateUsers.map((candidate) => [String(candidate._id), candidate]));
  const currentInterests = [...(user.preferences?.interests || []), ...(trip.interests || [])];
  const currentCityKey = normalizeCityKey(trip.destination);

  return potentialTrips
    .filter((candidateTrip) => {
      const candidateUser = usersById.get(String(candidateTrip.user));
      return candidateUser
        && !hiddenTripIds.has(String(candidateTrip._id))
        && normalizeCityKey(candidateTrip.destination) === currentCityKey
        && tripsOverlap(trip, candidateTrip)
        && sharedInterests(
          currentInterests,
          [...(candidateUser.preferences?.interests || []), ...(candidateTrip.interests || [])]
        ).length > 0;
    })
    .map((candidateTrip) => {
      const candidateUser = usersById.get(String(candidateTrip.user));
      return {
        tripId: candidateTrip._id,
        firstName: candidateUser.name.trim().split(/\s+/)[0] || 'Traveler',
        avatarColor: candidateUser.avatarColor,
        ageBand: candidateUser.identityVerification.ageBand,
        city: candidateTrip.destination.name,
        country: candidateTrip.destination.country,
        startDate: candidateTrip.startDate,
        endDate: candidateTrip.endDate,
        sharedInterests: sharedInterests(
          currentInterests,
          [...(candidateUser.preferences?.interests || []), ...(candidateTrip.interests || [])]
        ),
      };
    })
    .sort((first, second) =>
      second.sharedInterests.length - first.sharedInterests.length
      || new Date(first.startDate) - new Date(second.startDate)
    );
};

const listTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({
    user: req.user._id,
    travelers: 1,
    $or: [{ members: { $size: 0 } }, { members: { $exists: false } }],
    status: { $in: ['planning', 'booked'] },
    endDate: { $gte: new Date() },
  })
    .select('destination startDate endDate status matchingEnabled')
    .populate('destination', 'name country')
    .sort({ startDate: 1 })
    .lean();

  res.json({
    trips: trips.map((trip) => ({
      _id: trip._id,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      matchingEnabled: trip.matchingEnabled,
    })),
  });
});

const setTripVisibility = asyncHandler(async (req, res) => {
  const enabled = req.body.enabled;
  if (typeof enabled !== 'boolean') throw new ApiError(400, 'Choose whether this trip is visible for matching');

  if (enabled) requireMatchEligibility(req.user);
  const trip = await findOwnedTrip(req.params.tripId, req.user._id);
  if (enabled) {
    if (Number(trip.travelers) !== 1 || (trip.members || []).length || !['planning', 'booked'].includes(trip.status) || trip.endDate < new Date()) {
      throw new ApiError(400, 'Only upcoming trips for one traveler with no invited members can be listed');
    }
  }

  trip.matchingEnabled = enabled;
  await trip.save();
  if (!enabled) {
    await SoloTravelerMatch.updateMany(
      { $or: [{ requesterTrip: trip._id }, { recipientTrip: trip._id }], status: { $in: ['pending', 'accepted'] } },
      { $set: { status: 'withdrawn' } }
    );
  }
  res.json({ tripId: trip._id, matchingEnabled: trip.matchingEnabled });
});

const listCandidates = asyncHandler(async (req, res) => {
  const trip = await findOwnedTrip(req.params.tripId, req.user._id);
  res.json({ candidates: await getCandidates(trip, req.user) });
});

const sendRequest = asyncHandler(async (req, res) => {
  const trip = await findOwnedTrip(req.params.tripId, req.user._id);
  const candidateTripId = typeof req.body.candidateTripId === 'string' ? req.body.candidateTripId : '';
  const activityType = typeof req.body.activityType === 'string' ? req.body.activityType : '';
  const introMessage = typeof req.body.message === 'string' ? req.body.message.trim() : '';

  if (!ACTIVITY_TYPES.includes(activityType)) throw new ApiError(400, 'Choose a day tour, meal, or shared ride');
  if (introMessage.length > 500) throw new ApiError(400, 'Intro messages must be 500 characters or fewer');

  const candidate = (await getCandidates(trip, req.user))
    .find((item) => String(item.tripId) === candidateTripId);
  if (!candidate) throw new ApiError(404, 'That traveler is no longer available for matching');

  const candidateTrip = await Trip.findById(candidateTripId).select('user');
  if (!candidateTrip) throw new ApiError(404, "Couldn't find that trip");

  let match = await SoloTravelerMatch.findOne({
    tripPairKey: tripPairKey(trip._id, candidateTrip._id),
  });
  if (match) {
    if (match.status !== 'withdrawn') {
      throw new ApiError(409, 'A request already exists for this trip pair');
    }
    match.requester = req.user._id;
    match.recipient = candidateTrip.user;
    match.requesterTrip = trip._id;
    match.recipientTrip = candidateTrip._id;
    match.activityType = activityType;
    match.introMessage = introMessage;
    match.status = 'pending';
    match.messages = [];
    await match.save();
  } else {
    try {
      match = await SoloTravelerMatch.create({
        tripPairKey: tripPairKey(trip._id, candidateTrip._id),
        requester: req.user._id,
        recipient: candidateTrip.user,
        requesterTrip: trip._id,
        recipientTrip: candidateTrip._id,
        activityType,
        introMessage,
      });
    } catch (error) {
      if (error.code === 11000) throw new ApiError(409, 'A request already exists for this trip pair');
      throw error;
    }
  }

  res.status(201).json({ matchId: match._id, status: match.status });
});

const populateMatch = (query) =>
  query
    .populate('requester', 'name avatarColor preferences.interests identityVerification.ageBand')
    .populate('recipient', 'name avatarColor preferences.interests identityVerification.ageBand')
    .populate({
      path: 'requesterTrip',
      select: 'destination startDate endDate interests',
      populate: { path: 'destination', select: 'name country' },
    })
    .populate({
      path: 'recipientTrip',
      select: 'destination startDate endDate interests',
      populate: { path: 'destination', select: 'name country' },
    })
    .populate('messages.sender', 'name avatarColor');

const firstName = (name) => name?.trim().split(/\s+/)[0] || 'Traveler';

const serializeMatch = (match, currentUserId) => {
  const requesterId = String(match.requester._id);
  const incoming = String(match.recipient._id) === currentUserId;
  const otherUser = incoming ? match.requester : match.recipient;
  const otherTrip = incoming ? match.requesterTrip : match.recipientTrip;
  const ownTrip = incoming ? match.recipientTrip : match.requesterTrip;
  const interests = sharedInterests(
    [...(match.requester.preferences?.interests || []), ...(match.requesterTrip.interests || [])],
    [...(match.recipient.preferences?.interests || []), ...(match.recipientTrip.interests || [])]
  );

  return {
    _id: match._id,
    status: match.status,
    incoming,
    activityType: match.activityType,
    introMessage: match.introMessage,
    createdAt: match.createdAt,
    otherTraveler: {
      firstName: firstName(otherUser.name),
      avatarColor: otherUser.avatarColor,
      ageBand: otherUser.identityVerification?.ageBand,
      sharedInterests: interests,
    },
    city: ownTrip.destination?.name,
    country: ownTrip.destination?.country,
    startDate: ownTrip.startDate,
    endDate: ownTrip.endDate,
    otherTrip: {
      startDate: otherTrip.startDate,
      endDate: otherTrip.endDate,
    },
    messages: match.status === 'accepted'
      ? match.messages.slice(-100).map((message) => ({
        _id: message._id,
        isMine: String(message.sender?._id) === currentUserId,
        senderName: firstName(message.sender?.name),
        content: message.content,
        createdAt: message.createdAt,
      }))
      : [],
  };
};

const listRequests = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const matches = await populateMatch(
    SoloTravelerMatch.find({ $or: [{ requester: req.user._id }, { recipient: req.user._id }] })
      .sort({ updatedAt: -1 })
  ).lean();
  res.json({ matches: matches.map((match) => serializeMatch(match, userId)) });
});

const isStillEligibleMatch = async (match) => {
  const [requester, recipient, requesterTrip, recipientTrip] = await Promise.all([
    User.findById(match.requester).select('identityVerification preferences.interests blockedTravelers'),
    User.findById(match.recipient).select('identityVerification preferences.interests blockedTravelers'),
    Trip.findById(match.requesterTrip).populate('destination', 'name country'),
    Trip.findById(match.recipientTrip).populate('destination', 'name country'),
  ]);
  if (!requester || !recipient || !requesterTrip || !recipientTrip) return false;
  if (
    requester.identityVerification?.status !== 'verified'
    || recipient.identityVerification?.status !== 'verified'
    || !requester.identityVerification?.ageBand
    || requester.identityVerification.ageBand !== recipient.identityVerification?.ageBand
  ) return false;
  if (
    (requester.blockedTravelers || []).some((id) => String(id) === String(recipient._id))
    || (recipient.blockedTravelers || []).some((id) => String(id) === String(requester._id))
  ) return false;

  return requesterTrip.user.equals(requester._id)
    && recipientTrip.user.equals(recipient._id)
    && isEligibleSoloTrip(requesterTrip)
    && isEligibleSoloTrip(recipientTrip)
    && normalizeCityKey(requesterTrip.destination) === normalizeCityKey(recipientTrip.destination)
    && tripsOverlap(requesterTrip, recipientTrip)
    && sharedInterests(
      [...(requester.preferences?.interests || []), ...(requesterTrip.interests || [])],
      [...(recipient.preferences?.interests || []), ...(recipientTrip.interests || [])]
    ).length > 0;
};

const respondToRequest = asyncHandler(async (req, res) => {
  const action = req.body.action;
  if (!['accept', 'decline'].includes(action)) throw new ApiError(400, 'Choose accept or decline');

  const match = await SoloTravelerMatch.findOne({ _id: req.params.matchId, recipient: req.user._id });
  if (!match) throw new ApiError(404, "Couldn't find that connection request");
  if (match.status !== 'pending') throw new ApiError(409, 'This connection request has already been handled');
  if (action === 'accept') {
    requireMatchEligibility(req.user);
    if (!(await isStillEligibleMatch(match))) {
      match.status = 'withdrawn';
      await match.save();
      throw new ApiError(409, 'This traveler is no longer available for matching');
    }
    match.status = 'accepted';
  } else {
    match.status = 'declined';
  }
  await match.save();
  res.json({ status: match.status });
});

const findParticipantMatch = async (matchId, userId) => {
  const match = await SoloTravelerMatch.findOne({
    _id: matchId,
    $or: [{ requester: userId }, { recipient: userId }],
  });
  if (!match) throw new ApiError(404, "Couldn't find that traveler connection");
  return match;
};

const sendMessage = asyncHandler(async (req, res) => {
  const match = await findParticipantMatch(req.params.matchId, req.user._id);
  if (match.status !== 'accepted') throw new ApiError(403, 'Both travelers must accept before messaging');

  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if (!content) throw new ApiError(400, 'Write a message before sending');
  if (content.length > 1000) throw new ApiError(400, 'Messages must be 1000 characters or fewer');

  match.messages.push({ sender: req.user._id, content });
  if (match.messages.length > 100) match.messages.splice(0, match.messages.length - 100);
  await match.save();
  const message = match.messages[match.messages.length - 1];
  res.status(201).json({
    message: {
      _id: message._id,
      isMine: true,
      senderName: firstName(req.user.name),
      content: message.content,
      createdAt: message.createdAt,
    },
  });
});

const blockTraveler = asyncHandler(async (req, res) => {
  const match = await findParticipantMatch(req.params.matchId, req.user._id);
  const otherUserId = String(match.requester) === String(req.user._id) ? match.recipient : match.requester;
  await User.updateOne({ _id: req.user._id }, { $addToSet: { blockedTravelers: otherUserId } });
  match.status = 'blocked';
  await match.save();
  res.json({ status: match.status });
});

const reportTraveler = asyncHandler(async (req, res) => {
  const match = await findParticipantMatch(req.params.matchId, req.user._id);
  const reason = typeof req.body.reason === 'string' ? req.body.reason : '';
  const details = typeof req.body.details === 'string' ? req.body.details.trim() : '';
  if (!REPORT_REASONS.includes(reason)) throw new ApiError(400, 'Choose a report reason');
  if (details.length > 1000) throw new ApiError(400, 'Report details must be 1000 characters or fewer');

  const reportedUser = String(match.requester) === String(req.user._id) ? match.recipient : match.requester;
  await SoloTravelerSafetyReport.create({
    match: match._id,
    reporter: req.user._id,
    reportedUser,
    reason,
    details,
  });
  res.status(201).json({ message: 'Your report has been recorded' });
});

module.exports = {
  listTrips,
  setTripVisibility,
  listCandidates,
  sendRequest,
  listRequests,
  respondToRequest,
  sendMessage,
  blockTraveler,
  reportTraveler,
};
