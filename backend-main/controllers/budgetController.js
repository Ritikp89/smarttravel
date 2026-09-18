const Trip = require('../models/Trip');
const Budget = require('../models/Budget');
const Itinerary = require('../models/Itinerary');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { estimateBudget, budgetInsights } = require('../services/budgetService');

const ownTrip = async (id, userId) => {
  const trip = await Trip.findOne({ _id: id, user: userId }).populate('destination');
  if (!trip) throw new ApiError(404, "Couldn't find that trip");
  return trip;
};

// POST /api/trips/:tripId/budget  - estimate (or re-estimate, keeping manual lines)
const estimate = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user._id);
  const [itinerary, existing] = await Promise.all([
    Itinerary.findOne({ trip: trip._id }).lean(),
    Budget.findOne({ trip: trip._id }),
  ]);

  const lines = await estimateBudget({
    trip,
    destination: trip.destination,
    itinerary,
    existingLines: existing?.lines?.map((l) => l.toObject()) || [],
  });

  const budget = existing || new Budget({ trip: trip._id, user: req.user._id });
  budget.lines = lines;
  budget.currency = req.body.currency || budget.currency || req.user.preferences?.currency || 'USD';
  if (req.body.limit !== undefined) budget.limit = req.body.limit || undefined;
  if (req.body.contingencyPct !== undefined) budget.contingencyPct = req.body.contingencyPct;
  budget.estimatedAt = new Date();
  budget.recalculate(trip.travelers, trip.days);
  await budget.save();

  res.status(existing ? 200 : 201).json({
    budget,
    insights: budgetInsights({ budget, trip, destination: trip.destination }),
  });
});

// GET /api/trips/:tripId/budget
const getBudget = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user._id);
  const budget = await Budget.findOne({ trip: trip._id });
  if (!budget) throw new ApiError(404, 'No budget yet - run an estimate first');
  res.json({ budget, insights: budgetInsights({ budget, trip, destination: trip.destination }) });
});

// PUT /api/trips/:tripId/budget
// body: { limit?, contingencyPct?, currency?, lines?: [{ category, amount, label? }] }
// Any line sent here is marked manual so a re-estimate leaves it alone.
const updateBudget = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user._id);
  const budget = await Budget.findOne({ trip: trip._id });
  if (!budget) throw new ApiError(404, 'No budget yet - run an estimate first');

  const { limit, contingencyPct, currency, lines } = req.body;
  if (limit !== undefined) budget.limit = limit === null || limit === '' ? undefined : Number(limit);
  if (contingencyPct !== undefined) budget.contingencyPct = Number(contingencyPct);
  if (currency) budget.currency = currency;

  if (Array.isArray(lines)) {
    lines.forEach((incoming) => {
      const line = budget.lines.find((l) => l.category === incoming.category);
      if (!line) {
        budget.lines.push({ ...incoming, source: 'manual' });
        return;
      }
      if (incoming.amount !== undefined) line.amount = Number(incoming.amount);
      if (incoming.label !== undefined) line.label = incoming.label;
      line.source = 'manual';
    });
  }

  budget.recalculate(trip.travelers, trip.days);
  await budget.save();

  res.json({ budget, insights: budgetInsights({ budget, trip, destination: trip.destination }) });
});

// POST /api/trips/:tripId/budget/lines/:category/reset - drop a manual override
const resetLine = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user._id);
  const budget = await Budget.findOne({ trip: trip._id });
  if (!budget) throw new ApiError(404, 'No budget yet');

  const itinerary = await Itinerary.findOne({ trip: trip._id }).lean();
  const fresh = await estimateBudget({ trip, destination: trip.destination, itinerary });
  const replacement = fresh.find((l) => l.category === req.params.category);
  const idx = budget.lines.findIndex((l) => l.category === req.params.category);

  if (!replacement || idx < 0) throw new ApiError(404, 'Unknown budget line');
  budget.lines[idx] = replacement;
  budget.recalculate(trip.travelers, trip.days);
  await budget.save();

  res.json({ budget, insights: budgetInsights({ budget, trip, destination: trip.destination }) });
});

module.exports = { estimate, getBudget, updateBudget, resetLine };
