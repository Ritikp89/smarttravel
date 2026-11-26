const Trip = require('../models/Trip');
const Budget = require('../models/Budget');
const Itinerary = require('../models/Itinerary');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { estimateBudget, budgetInsights, fitBudgetToLimit } = require('../services/budgetService');
const { normalizeCurrency, convertAmount } = require('../services/currencyService');

const parseLimit = (value) => {
  if (value === null || value === '') return undefined;
  const limit = Number(value);
  if (!Number.isFinite(limit) || limit < 0) throw new ApiError(400, 'Budget ceiling must be a non-negative number');
  return limit;
};

const parseContingency = (value) => {
  const percentage = Number(value);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new ApiError(400, 'Contingency must be between 0 and 100 percent');
  }
  return percentage;
};

const convertIfNeeded = (amount, fromCurrency, toCurrency) =>
  normalizeCurrency(fromCurrency) === normalizeCurrency(toCurrency)
    ? Number(amount)
    : convertAmount(amount, fromCurrency, toCurrency);

const isFixedBudgetLine = (line) =>
  line.source !== 'estimated' ||
  (line.category === 'activities' && /\bplanned activities$/.test(line.label || ''));

const assertRealisticCeiling = (limit, lines, contingencyPct, currency) => {
  if (limit == null) return;

  const multiplier = 1 + contingencyPct / 100;
  const estimatedTotal = Math.ceil(
    lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0) * multiplier
  );
  const fixedTotal = Math.ceil(lines
    .filter(isFixedBudgetLine)
    .reduce((sum, line) => sum + (Number(line.amount) || 0), 0) * multiplier);
  const minimum = Math.max(estimatedTotal, fixedTotal);

  if (limit < minimum) {
    throw new ApiError(
      400,
      `Sorry, your ceiling must cover the realistic trip estimate. Please raise it to at least ${minimum} ${currency}.`
    );
  }
};

const manualLinesForCurrency = (lines, fromCurrency, toCurrency) =>
  lines
    .filter((line) => line.source === 'manual')
    .map((line) => {
      const value = typeof line.toObject === 'function' ? line.toObject() : line;
      return { ...value, amount: convertIfNeeded(value.amount, fromCurrency, toCurrency) };
    });

const estimateLinesForCurrency = async ({ trip, itinerary, manualLines, currency, originCity }) => {
  const lines = await estimateBudget({
    trip,
    destination: trip.destination,
    itinerary,
    existingLines: manualLines,
    originCity,
  });

  return lines.map((line) => ({
    ...line,
    amount: line.source === 'manual' ? line.amount : convertAmount(line.amount, 'USD', currency),
  }));
};

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

  const previousCurrency = normalizeCurrency(existing?.currency || 'USD');
  const targetCurrency = normalizeCurrency(
    req.body.currency || req.user.preferences?.currency || existing?.currency || 'INR'
  );
  const manualLines = manualLinesForCurrency(existing?.lines || [], previousCurrency, targetCurrency);
  const lines = await estimateLinesForCurrency({
    trip,
    itinerary,
    manualLines,
    currency: targetCurrency,
    originCity: trip.originCity?.trim() || req.user.preferences?.homeCity?.trim() || '',
  });
  const budget = existing || new Budget({ trip: trip._id, user: req.user._id });
  let limit;
  if (req.body.limit !== undefined) {
    limit = parseLimit(req.body.limit);
  } else if (existing?.limit != null) {
    limit = convertIfNeeded(existing.limit, previousCurrency, targetCurrency);
  }
  const contingencyPct = req.body.contingencyPct === undefined
    ? budget.contingencyPct
    : parseContingency(req.body.contingencyPct);

  assertRealisticCeiling(limit, lines, contingencyPct, targetCurrency);

  budget.lines = fitBudgetToLimit(lines, limit, contingencyPct);
  budget.currency = targetCurrency;
  budget.limit = limit;
  budget.contingencyPct = contingencyPct;
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
// Manual lines are preserved while estimated lines rebalance against the ceiling.
const updateBudget = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user._id);
  const budget = await Budget.findOne({ trip: trip._id });
  if (!budget) throw new ApiError(404, 'No budget yet - run an estimate first');

  const { limit, contingencyPct, currency, lines } = req.body;
  const previousCurrency = normalizeCurrency(budget.currency);
  const targetCurrency = currency ? normalizeCurrency(currency) : previousCurrency;
  let targetLimit = budget.limit == null
    ? undefined
    : convertIfNeeded(budget.limit, previousCurrency, targetCurrency);
  if (limit !== undefined) {
    const parsedLimit = parseLimit(limit);
    targetLimit = parsedLimit === undefined
      ? undefined
      : convertIfNeeded(parsedLimit, previousCurrency, targetCurrency);
  }
  const targetContingency = contingencyPct === undefined ? budget.contingencyPct : parseContingency(contingencyPct);
  const itinerary = await Itinerary.findOne({ trip: trip._id }).lean();
  const manualLines = manualLinesForCurrency(budget.lines, previousCurrency, targetCurrency);
  const updatedLines = await estimateLinesForCurrency({
    trip,
    itinerary,
    manualLines,
    currency: targetCurrency,
    originCity: trip.originCity?.trim() || req.user.preferences?.homeCity?.trim() || '',
  });

  if (Array.isArray(lines)) {
    lines.forEach((incoming) => {
      const line = updatedLines.find((l) => l.category === incoming.category);
      if (!line) {
        updatedLines.push({ ...incoming, source: 'manual' });
        return;
      }
      if (incoming.amount !== undefined) line.amount = Number(incoming.amount);
      if (incoming.label !== undefined) line.label = incoming.label;
      line.source = 'manual';
    });
  }

  if (targetLimit != null) {
    assertRealisticCeiling(targetLimit, updatedLines, targetContingency, targetCurrency);
  }

  budget.lines = fitBudgetToLimit(updatedLines, targetLimit, targetContingency);
  budget.limit = targetLimit;
  budget.contingencyPct = targetContingency;
  budget.currency = targetCurrency;
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
  if (!budget.lines.some((line) => line.category === req.params.category)) {
    throw new ApiError(404, 'Unknown budget line');
  }
  const manualLines = manualLinesForCurrency(
    budget.lines.filter((line) => !(line.category === req.params.category && line.source === 'manual')),
    budget.currency,
    budget.currency
  );
  const fresh = await estimateLinesForCurrency({
    trip,
    itinerary,
    manualLines,
    currency: normalizeCurrency(budget.currency),
    originCity: trip.originCity?.trim() || req.user.preferences?.homeCity?.trim() || '',
  });
  const replacement = fresh.find((l) => l.category === req.params.category);

  if (!replacement) throw new ApiError(404, 'Unknown budget line');
  assertRealisticCeiling(budget.limit, fresh, budget.contingencyPct, budget.currency);
  budget.lines = fitBudgetToLimit(fresh, budget.limit, budget.contingencyPct);
  budget.recalculate(trip.travelers, trip.days);
  budget.estimatedAt = new Date();
  await budget.save();

  res.json({ budget, insights: budgetInsights({ budget, trip, destination: trip.destination }) });
});

module.exports = { estimate, getBudget, updateBudget, resetLine };
