const Trip = require('../models/Trip');
const Itinerary = require('../models/Itinerary');
const Activity = require('../models/Activity');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { buildItinerary, minutesToClock } = require('../services/itineraryService');
const { estimateTravel } = require('../services/mapsService');

const POPULATE = 'days.slots.activity leftovers';

const ownTrip = async (id, userId) => {
  const trip = await Trip.findOne({ _id: id, user: userId });
  if (!trip) throw new ApiError(404, "Couldn't find that trip");
  return trip;
};

// POST /api/trips/:tripId/itinerary  - (re)generate
const generate = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user._id);

  // allow one-off overrides without saving them to the trip
  const overrides = {};
  ['pace', 'interests', 'budgetLevel'].forEach((k) => {
    if (req.body?.[k] !== undefined) overrides[k] = req.body[k];
  });
  const settings = Object.assign(trip.toObject({ virtuals: true }), overrides);

  const { days, leftovers } = await buildItinerary(settings);

  if (!days.some((d) => d.slots.length)) {
    throw new ApiError(422, "We don't have enough activity data for this destination to build a plan yet");
  }

  const itinerary = await Itinerary.findOneAndUpdate(
    { trip: trip._id },
    { trip: trip._id, user: req.user._id, days, leftovers, generatedAt: new Date(), customised: false },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate(POPULATE);

  res.status(201).json({ itinerary });
});

// GET /api/trips/:tripId/itinerary
const getItinerary = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user._id);
  const itinerary = await Itinerary.findOne({ trip: trip._id }).populate(POPULATE);
  if (!itinerary) throw new ApiError(404, 'No itinerary yet - generate one first');
  res.json({ itinerary });
});

// Recompute clock times + totals for a day after the user has moved things around.
const relayoutDay = async (day) => {
  const ids = day.slots.map((s) => s.activity?._id || s.activity);
  const acts = await Activity.find({ _id: { $in: ids } }).lean();
  const byId = new Map(acts.map((a) => [String(a._id), a]));

  let clock = day.slots[0] ? toMinutes(day.slots[0].startTime) : 9 * 60 + 30;
  let last = null;
  let cost = 0;
  let hours = 0;

  day.slots.forEach((slot) => {
    const act = byId.get(String(slot.activity?._id || slot.activity));
    if (!act) return;
    const travel = last ? estimateTravel(last, act.coordinates) : { minutes: 0 };
    const start = clock + travel.minutes;
    const end = start + Math.round(act.durationHours * 60);
    slot.startTime = minutesToClock(start);
    slot.endTime = minutesToClock(end);
    slot.travelMinutesFromPrevious = travel.minutes;
    clock = end + 15;
    if (act.coordinates?.lat != null) last = act.coordinates;
    cost += act.cost;
    hours += act.durationHours;
  });

  day.estimatedCost = cost;
  day.totalHours = Number(hours.toFixed(1));
};

const toMinutes = (clock) => {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
};

// PUT /api/trips/:tripId/itinerary/days/:dayNumber
// body: { slots: [{ activity, startTime?, note? }] }  - full replacement of that day's slots
const updateDay = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user._id);
  const itinerary = await Itinerary.findOne({ trip: trip._id });
  if (!itinerary) throw new ApiError(404, 'No itinerary to edit');

  const day = itinerary.days.find((d) => d.dayNumber === Number(req.params.dayNumber));
  if (!day) throw new ApiError(404, 'That day is not in this itinerary');

  const incoming = Array.isArray(req.body.slots) ? req.body.slots : [];
  const firstStart = incoming[0]?.startTime || day.slots[0]?.startTime || '09:30';

  day.slots = incoming.map((s, i) => ({
    activity: s.activity?._id || s.activity,
    startTime: i === 0 ? firstStart : '00:00',
    endTime: '00:00',
    note: s.note,
  }));
  if (req.body.theme !== undefined) day.theme = req.body.theme;

  await relayoutDay(day);

  // anything removed from the day goes back to leftovers, anything added comes out of them
  const scheduled = new Set(itinerary.days.flatMap((d) => d.slots.map((s) => String(s.activity))));
  const allIds = await Activity.find({ destination: trip.destination }).distinct('_id');
  itinerary.leftovers = allIds.filter((id) => !scheduled.has(String(id)));
  itinerary.customised = true;

  await itinerary.save();
  await itinerary.populate(POPULATE);
  res.json({ itinerary });
});

// DELETE /api/trips/:tripId/itinerary
const removeItinerary = asyncHandler(async (req, res) => {
  const trip = await ownTrip(req.params.tripId, req.user._id);
  await Itinerary.deleteOne({ trip: trip._id });
  res.json({ message: 'Itinerary cleared' });
});

module.exports = { generate, getItinerary, updateDay, removeItinerary };
