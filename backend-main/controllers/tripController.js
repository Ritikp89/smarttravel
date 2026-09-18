const Trip = require('../models/Trip');
const Destination = require('../models/Destination');
const Itinerary = require('../models/Itinerary');
const Budget = require('../models/Budget');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getForecast, packingHint } = require('../services/weatherService');

const ownTrip = async (id, userId) => {
  const trip = await Trip.findOne({ _id: id, user: userId }).populate('destination');
  if (!trip) throw new ApiError(404, "Couldn't find that trip");
  return trip;
};

// GET /api/trips?status=
const listTrips = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const trips = await Trip.find(filter)
    .populate('destination', 'name country slug image tagline coordinates')
    .sort({ startDate: 1 })
    .lean({ virtuals: true });

  // one query for "does this trip have an itinerary / budget yet"
  const ids = trips.map((t) => t._id);
  const [itins, budgets] = await Promise.all([
    Itinerary.find({ trip: { $in: ids } }).select('trip days').lean(),
    Budget.find({ trip: { $in: ids } }).select('trip total currency').lean(),
  ]);
  const itinMap = new Map(itins.map((i) => [String(i.trip), i]));
  const budgetMap = new Map(budgets.map((b) => [String(b.trip), b]));

  res.json({
    trips: trips.map((t) => ({
      ...t,
      hasItinerary: itinMap.has(String(t._id)),
      activityCount: itinMap.get(String(t._id))?.days.reduce((s, d) => s + d.slots.length, 0) || 0,
      budgetTotal: budgetMap.get(String(t._id))?.total,
      currency: budgetMap.get(String(t._id))?.currency,
    })),
  });
});

// POST /api/trips
const createTrip = asyncHandler(async (req, res) => {
  const { destination, startDate, endDate, travelers, budgetLevel, pace, interests, title, notes } = req.body;

  const dest = await Destination.findById(destination);
  if (!dest) throw new ApiError(400, 'Pick a destination first');

  const prefs = req.user.preferences || {};
  const trip = await Trip.create({
    user: req.user._id,
    destination,
    title: title || `${dest.name} trip`,
    startDate,
    endDate,
    travelers,
    budgetLevel: budgetLevel || prefs.budgetLevel,
    pace: pace || prefs.travelPace,
    interests: interests?.length ? interests : prefs.interests,
    notes,
    coverImage: dest.image,
  });

  await trip.populate('destination');
  res.status(201).json({ trip });
});

// GET /api/trips/:id
const getTrip = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.id, req.user._id);
  const [itinerary, budget] = await Promise.all([
    Itinerary.findOne({ trip: trip._id }).populate('days.slots.activity leftovers'),
    Budget.findOne({ trip: trip._id }),
  ]);
  res.json({ trip, itinerary, budget });
});

// PUT /api/trips/:id
const updateTrip = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.id, req.user._id);
  const allowed = ['title', 'startDate', 'endDate', 'travelers', 'budgetLevel', 'pace', 'interests', 'status', 'notes'];
  const datesChanged = ['startDate', 'endDate'].some((k) => req.body[k] !== undefined);

  allowed.forEach((k) => {
    if (req.body[k] !== undefined) trip[k] = req.body[k];
  });
  await trip.save();

  // Existing itinerary won't line up with new dates - flag it so the UI nudges a regenerate
  if (datesChanged) {
    await Itinerary.updateOne({ trip: trip._id }, { $set: { customised: false } });
  }

  res.json({ trip, staleItinerary: datesChanged });
});

// DELETE /api/trips/:id
const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.id, req.user._id);
  await Promise.all([
    Itinerary.deleteOne({ trip: trip._id }),
    Budget.deleteOne({ trip: trip._id }),
    trip.deleteOne(),
  ]);
  res.json({ message: 'Trip deleted', id: trip._id });
});

// GET /api/trips/:id/analysis
// A single call that gives the trip page its overview numbers.
const analyseTrip = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.id, req.user._id);
  const [itinerary, budget] = await Promise.all([
    Itinerary.findOne({ trip: trip._id }).populate('days.slots.activity'),
    Budget.findOne({ trip: trip._id }),
  ]);

  const analysis = {
    days: trip.days,
    travelers: trip.travelers,
    daysUntil: Math.ceil((trip.startDate - Date.now()) / 86400000),
  };

  if (itinerary) {
    const slots = itinerary.days.flatMap((d) => d.slots.filter((s) => s.activity));
    const byCategory = {};
    const interestsCovered = new Set();
    slots.forEach((s) => {
      byCategory[s.activity.category] = (byCategory[s.activity.category] || 0) + 1;
      (s.activity.interests || []).forEach((i) => interestsCovered.add(i));
    });

    const hours = itinerary.days.map((d) => d.totalHours);
    const busiest = itinerary.days.reduce((a, b) => (b.totalHours > a.totalHours ? b : a), itinerary.days[0]);
    const freeDays = itinerary.days.filter((d) => d.slots.length === 0).length;

    analysis.itinerary = {
      activityCount: slots.length,
      avgHoursPerDay: Number((hours.reduce((a, b) => a + b, 0) / Math.max(1, hours.length)).toFixed(1)),
      busiestDay: busiest ? { dayNumber: busiest.dayNumber, hours: busiest.totalHours } : null,
      freeDays,
      byCategory,
      interestsCovered: [...interestsCovered],
      interestsMissed: (trip.interests || []).filter((i) => !interestsCovered.has(i)),
      leftoverCount: itinerary.leftovers?.length || 0,
      verdict:
        freeDays > trip.days / 2
          ? 'Very light - maybe try a busier pace or a destination with more to do.'
          : analysis.days && hours.some((h) => h > 9)
            ? 'Some long days in there. Keep an eye on your feet.'
            : 'Looks like a well-balanced trip.',
    };
  }

  if (budget) {
    const biggest = [...budget.lines].sort((a, b) => b.amount - a.amount)[0];
    analysis.budget = {
      total: budget.total,
      perPerson: budget.perPerson,
      perDay: budget.perDay,
      currency: budget.currency,
      biggestLine: biggest ? { category: biggest.category, share: Math.round((biggest.amount / budget.total) * 100) } : null,
      overLimit: budget.limit ? budget.total > budget.limit : false,
    };
  }

  // weather only makes sense if the trip is soon
  if (analysis.daysUntil <= 14 && analysis.daysUntil >= -trip.days) {
    try {
      const forecast = await getForecast(trip.destination.coordinates, 16);
      const tripDays = forecast.daily.filter((d) => {
        const dt = new Date(d.date);
        return dt >= new Date(trip.startDate.toDateString()) && dt <= trip.endDate;
      });
      analysis.weather = { daily: tripDays, hint: packingHint({ daily: tripDays }) };
    } catch (err) {
      analysis.weather = { error: 'Forecast unavailable right now' };
    }
  }

  res.json({ analysis });
});

module.exports = { listTrips, createTrip, getTrip, updateTrip, deleteTrip, analyseTrip };
