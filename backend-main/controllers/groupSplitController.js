const TripSplit = require('../models/TripSplit');
const Budget = require('../models/Budget');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { RATES_FROM_USD, normalizeCurrency } = require('../services/currencyService');
const { currencyScale, toMinorUnits, fromMinorUnits, splitEqually } = require('../services/groupSplitService');
const { findTripForMember } = require('../services/tripMemberService');

const participantsFor = (trip) => {
  const participants = [trip.user, ...(trip.members || [])];
  return [...new Map(participants.map((person) => [String(person._id), person])).values()];
};

const amountInMinorUnits = (value, currency) => {
  const amount = Number(value);
  const scale = currencyScale(currency);
  const scaled = amount * scale;
  const minorUnits = Math.round(scaled);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(minorUnits) ||
    Math.abs(scaled - minorUnits) > 1e-6
  ) {
    throw new ApiError(400, `Enter an amount greater than zero with no more than ${currency === 'JPY' ? 'zero' : 'two'} decimal places`);
  }
  return minorUnits;
};

const currencyFor = async (req, trip) => {
  if (req.body?.currency !== undefined) {
    const currency = String(req.body.currency).trim().toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(RATES_FROM_USD, currency)) {
      throw new ApiError(400, 'Choose a supported currency');
    }
    return currency;
  }
  const budget = await Budget.findOne({ trip: trip._id }).select('currency').lean();
  return normalizeCurrency(budget?.currency || req.user.preferences?.currency || 'INR');
};

const validateParticipantIds = (ids, participants) => {
  if (!Array.isArray(ids) || !ids.length) throw new ApiError(400, 'Select at least one traveler');
  const participantIds = new Set(participants.map((person) => String(person._id)));
  const uniqueIds = new Set(ids.map(String));
  if (uniqueIds.size !== ids.length || ids.some((id) => !participantIds.has(String(id)))) {
    throw new ApiError(400, 'Choose only current members of this trip');
  }
  return ids.map(String);
};

const listSplits = asyncHandler(async (req, res) => {
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const [expenses, currency] = await Promise.all([
    TripSplit.find({ trip: trip._id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name avatarColor')
      .populate('shares.user', 'name avatarColor')
      .lean(),
    currencyFor(req, trip),
  ]);

  res.json({
    trip,
    participants: participantsFor(trip),
    expenses,
    isOwner: String(trip.user._id) === String(req.user._id),
    currency,
  });
});

const createSplit = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const participants = participantsFor(trip);
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!description || description.length > 120) {
    throw new ApiError(400, 'Add a description of 1 to 120 characters');
  }

  const splitMode = body.splitMode || 'equal';
  if (!['equal', 'custom'].includes(splitMode)) throw new ApiError(400, 'Choose an equal or custom split');
  const currency = await currencyFor({ body, user: req.user }, trip);
  const totalMinorUnits = amountInMinorUnits(body.amount, currency);
  let shares;

  if (splitMode === 'equal') {
    const selectedIds = body.participantIds === undefined
      ? participants.map((person) => String(person._id))
      : validateParticipantIds(body.participantIds, participants);
    if (totalMinorUnits < selectedIds.length) {
      throw new ApiError(400, 'The amount is too small to give each traveler a share');
    }
    shares = splitEqually(totalMinorUnits, selectedIds).map((share) => ({
      user: share.userId,
      amount: fromMinorUnits(share.amountMinorUnits, currency),
      paid: false,
    }));
  } else {
    if (!Array.isArray(body.shares) || !body.shares.length || body.shares.some((share) => !share || typeof share !== 'object')) {
      throw new ApiError(400, 'Add at least one traveler share');
    }
    const selectedIds = validateParticipantIds(
      body.shares.map((share) => share.userId),
      participants
    );
    shares = body.shares.map((share, index) => ({
      user: selectedIds[index],
      amount: fromMinorUnits(amountInMinorUnits(share.amount, currency), currency),
      paid: false,
    }));
    const sharesMinorUnits = shares.reduce(
      (sum, share) => sum + toMinorUnits(share.amount, currency),
      0
    );
    if (sharesMinorUnits !== totalMinorUnits) {
      throw new ApiError(400, 'Custom shares must add up exactly to the total');
    }
  }

  const expense = await TripSplit.create({
    trip: trip._id,
    createdBy: req.user._id,
    description,
    amount: fromMinorUnits(totalMinorUnits, currency),
    currency,
    splitMode,
    shares,
  });
  await expense.populate('createdBy', 'name avatarColor');
  await expense.populate('shares.user', 'name avatarColor');
  res.status(201).json({ expense });
});

const updateShare = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const expense = await TripSplit.findOne({ _id: req.params.expenseId, trip: trip._id });
  if (!expense) throw new ApiError(404, "Couldn't find that group cost");
  if (typeof body.paid !== 'boolean') throw new ApiError(400, 'Paid status must be true or false');

  const share = expense.shares.find((item) => String(item.user) === String(req.params.userId));
  if (!share) throw new ApiError(404, "Couldn't find that traveler's share");
  const isOwner = String(trip.user._id) === String(req.user._id);
  if (!isOwner && String(share.user) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only update your own paid status');
  }

  share.paid = body.paid;
  share.paidAt = body.paid ? new Date() : null;
  await expense.save();
  await expense.populate('createdBy', 'name avatarColor');
  await expense.populate('shares.user', 'name avatarColor');
  res.json({ expense });
});

const deleteSplit = asyncHandler(async (req, res) => {
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const expense = await TripSplit.findOne({ _id: req.params.expenseId, trip: trip._id });
  if (!expense) throw new ApiError(404, "Couldn't find that group cost");

  const isOwner = String(trip.user._id) === String(req.user._id);
  const isCreator = String(expense.createdBy) === String(req.user._id);
  if (!isOwner && !isCreator) throw new ApiError(403, 'Only the trip owner or cost creator can remove it');

  await expense.deleteOne();
  res.json({ message: 'Group cost removed', id: expense._id });
});

module.exports = { listSplits, createSplit, updateShare, deleteSplit };
