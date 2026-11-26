const Budget = require('../models/Budget');
const TripSavingsPlan = require('../models/TripSavingsPlan');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { RATES_FROM_USD, normalizeCurrency } = require('../services/currencyService');
const { currencyScale } = require('../services/groupSplitService');
const { findTripForMember } = require('../services/tripMemberService');
const { buildSavingsSchedule, applyContributions } = require('../services/savingsPlanService');

const amountInCurrency = (value, currency) => {
  const amount = Number(value);
  const scale = currencyScale(currency);
  const scaled = amount * scale;
  const rounded = Math.round(scaled);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(rounded) ||
    Math.abs(scaled - rounded) > 1e-6
  ) {
    throw new ApiError(400, `Enter an amount greater than zero with no more than ${currency === 'JPY' ? 'zero' : 'two'} decimal places`);
  }
  return rounded / scale;
};

const currencyFor = async (body, user, trip) => {
  if (body.currency !== undefined) {
    const currency = String(body.currency).trim().toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(RATES_FROM_USD, currency)) {
      throw new ApiError(400, 'Choose a supported currency');
    }
    return currency;
  }
  const budget = await Budget.findOne({ trip: trip._id }).select('currency').lean();
  return normalizeCurrency(budget?.currency || user.preferences?.currency || 'INR');
};

const serializePlan = (plan, now = new Date()) => {
  const schedule = applyContributions(
    buildSavingsSchedule(plan),
    plan.contributions,
    plan.currency,
    now
  );
  const paidMinor = plan.contributions.reduce(
    (sum, contribution) => sum + Math.round(contribution.amount * currencyScale(plan.currency)),
    0
  );
  return {
    plan,
    schedule,
    contributedAmount: paidMinor / currencyScale(plan.currency),
    remainingAmount: Math.max(0, plan.targetAmount - paidMinor / currencyScale(plan.currency)),
  };
};

const populatePlan = (query) => query
  .populate('createdBy', 'name avatarColor')
  .populate('contributions.user', 'name avatarColor')
  .populate('contributions.recordedBy', 'name avatarColor');

const getPlan = asyncHandler(async (req, res) => {
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const [plan, budget] = await Promise.all([
    populatePlan(TripSavingsPlan.findOne({ trip: trip._id })),
    Budget.findOne({ trip: trip._id }).select('total currency').lean(),
  ]);
  const currency = plan?.currency || normalizeCurrency(budget?.currency || req.user.preferences?.currency || 'INR');
  res.json({
    trip,
    ...(plan ? serializePlan(plan) : { plan: null, schedule: [], contributedAmount: 0, remainingAmount: 0 }),
    currency,
    targetSuggestion: budget?.total || null,
    participants: [trip.user, ...(trip.members || [])],
    isOwner: String(trip.user._id) === String(req.user._id),
  });
});

const createPlan = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  if (String(trip.user._id) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the trip owner can create the savings plan');
  }
  if (trip.startDate <= new Date()) throw new ApiError(400, 'A savings plan needs a future departure date');
  if (!['weekly', 'biweekly', 'monthly'].includes(body.frequency)) {
    throw new ApiError(400, 'Choose weekly, biweekly, or monthly installments');
  }

  const existing = await TripSavingsPlan.findOne({ trip: trip._id }).select('_id').lean();
  if (existing) throw new ApiError(409, 'A savings plan already exists for this trip');

  const currency = await currencyFor(body, req.user, trip);
  const targetAmount = amountInCurrency(body.targetAmount, currency);
  const depositAmount = amountInCurrency(body.depositAmount, currency);
  if (depositAmount >= targetAmount) throw new ApiError(400, 'The deposit must be less than the trip target');
  const createdAt = new Date();
  const planValues = {
    targetAmount,
    depositAmount,
    currency,
    frequency: body.frequency,
    createdAt,
    departureDate: trip.startDate,
  };
  try {
    buildSavingsSchedule(planValues);
  } catch (error) {
    if (error instanceof RangeError) throw new ApiError(400, error.message);
    throw error;
  }

  let plan;
  try {
    plan = await TripSavingsPlan.create({
      trip: trip._id,
      createdBy: req.user._id,
      ...planValues,
    });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'A savings plan already exists for this trip');
    throw error;
  }
  plan = await populatePlan(TripSavingsPlan.findById(plan._id));
  res.status(201).json(serializePlan(plan));
});

const addContribution = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const plan = await TripSavingsPlan.findOne({ trip: trip._id });
  if (!plan) throw new ApiError(404, 'Create a savings plan first');

  const participants = [trip.user._id, ...(trip.members || []).map((member) => member._id)];
  const contributorId = body.userId === undefined ? String(req.user._id) : String(body.userId);
  if (!participants.some((id) => String(id) === contributorId)) {
    throw new ApiError(400, 'Choose a current member of this trip');
  }
  const isOwner = String(trip.user._id) === String(req.user._id);
  if (!isOwner && contributorId !== String(req.user._id)) {
    throw new ApiError(403, 'You can only record your own contribution');
  }

  const amount = amountInCurrency(body.amount, plan.currency);
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > 120) throw new ApiError(400, 'Contribution notes must be 120 characters or fewer');
  const contribution = {
    user: contributorId,
    recordedBy: req.user._id,
    amount,
    note,
    contributedAt: new Date(),
  };
  const updated = await TripSavingsPlan.findOneAndUpdate(
    {
      _id: plan._id,
      trip: trip._id,
      $expr: {
        $lte: [
          {
            $round: [
              {
                $multiply: [
                  {
                    $add: [
                      {
                        $reduce: {
                          input: '$contributions',
                          initialValue: 0,
                          in: { $add: ['$$value', '$$this.amount'] },
                        },
                      },
                      amount,
                    ],
                  },
                  currencyScale(plan.currency),
                ],
              },
              0,
            ],
          },
          { $round: [{ $multiply: ['$targetAmount', currencyScale(plan.currency)] }, 0] },
        ],
      },
    },
    { $push: { contributions: contribution } },
    { new: true, runValidators: true }
  );
  if (!updated) throw new ApiError(409, 'That contribution exceeds the remaining trip target');

  const populated = await populatePlan(TripSavingsPlan.findById(updated._id));
  res.status(201).json(serializePlan(populated));
});

const removeContribution = asyncHandler(async (req, res) => {
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const plan = await TripSavingsPlan.findOne({ trip: trip._id });
  if (!plan) throw new ApiError(404, 'Create a savings plan first');
  const contribution = plan.contributions.id(req.params.contributionId);
  if (!contribution) throw new ApiError(404, "Couldn't find that contribution");

  const isOwner = String(trip.user._id) === String(req.user._id);
  if (!isOwner && String(contribution.recordedBy) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the trip owner or contribution recorder can remove it');
  }
  contribution.deleteOne();
  await plan.save();

  const populated = await populatePlan(TripSavingsPlan.findById(plan._id));
  res.json(serializePlan(populated));
});

const deletePlan = asyncHandler(async (req, res) => {
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  if (String(trip.user._id) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the trip owner can remove the savings plan');
  }
  const plan = await TripSavingsPlan.findOneAndDelete({ trip: trip._id });
  if (!plan) throw new ApiError(404, 'No savings plan yet');
  res.json({ message: 'Savings plan removed' });
});

module.exports = { getPlan, createPlan, addContribution, removeContribution, deletePlan };
