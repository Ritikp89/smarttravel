const Destination = require('../models/Destination');
const Activity = require('../models/Activity');
const TravelOption = require('../models/TravelOption');
const Trip = require('../models/Trip');
const Itinerary = require('../models/Itinerary');
const Budget = require('../models/Budget');
const SoloTravelerMatch = require('../models/SoloTravelerMatch');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { recommend, scoreDestination } = require('../services/recommendationService');
const { withBudgetCosts } = require('../services/destinationCostService');

// GET /api/destinations?q=&region=&tag=&maxDaily=&sort=
const listDestinations = asyncHandler(async (req, res) => {
  const { q, region, tag, maxDaily, budgetLevel = 'mid', sort = 'popular', limit = 1000 } = req.query;
  const filter = {};

  if (q) filter.$text = { $search: q };
  if (region) filter.region = region;
  if (tag) filter.tags = tag;
  const sortMap = {
    popular: { popularity: -1 },
    rating: { rating: -1 },
    cheapest: { popularity: -1 },
    name: { name: 1 },
  };

  const resultLimit = Math.max(1, Number(limit) || 1000);
  let query = Destination.find(filter).sort(sortMap[sort] || sortMap.popular);
  if (q) query = query.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
  if (!maxDaily && sort !== 'cheapest') query = query.limit(resultLimit);

  let destinations = (await query.lean()).map(withBudgetCosts);
  if (maxDaily) {
    destinations = destinations.filter((destination) => destination.dailyCost?.[budgetLevel] <= Number(maxDaily));
  }
  if (sort === 'cheapest') {
    destinations.sort((a, b) => (a.dailyCost?.[budgetLevel] || 0) - (b.dailyCost?.[budgetLevel] || 0));
  }
  if (maxDaily || sort === 'cheapest') destinations = destinations.slice(0, resultLimit);

  // If we know who's asking, attach a match score so the UI can badge cards
  const withScores = req.user
    ? destinations.map((d) => ({
        ...d,
        recommendation: scoreDestination(d, {
          interests: req.user.preferences?.interests || [],
          budgetLevel: req.user.preferences?.budgetLevel || 'mid',
        }),
      }))
    : destinations;

  res.json({ count: withScores.length, destinations: withScores });
});

// GET /api/destinations/tags  - distinct tags for the filter chips
const listTags = asyncHandler(async (req, res) => {
  const tags = await Destination.distinct('tags');
  res.json({ tags: tags.sort() });
});

// GET /api/destinations/recommended?month=
const recommended = asyncHandler(async (req, res) => {
  const prefs = req.user?.preferences || {};
  const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;

  const results = await recommend({
    interests: req.query.interests ? String(req.query.interests).split(',') : prefs.interests || [],
    budgetLevel: req.query.budgetLevel || prefs.budgetLevel || 'mid',
    month,
    limit: Number(req.query.limit) || 6,
  });

  res.json({ month, destinations: results.map(withBudgetCosts) });
});

// GET /api/destinations/:idOrSlug
const getDestination = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isId = /^[a-f\d]{24}$/i.test(idOrSlug);

  const destinationRecord = await Destination.findOne(isId ? { _id: idOrSlug } : { slug: idOrSlug }).lean();
  if (!destinationRecord) throw new ApiError(404, "We don't have that destination (yet)");
  const destination = withBudgetCosts(destinationRecord);

  const activities = await Activity.find({ destination: destination._id }).sort({ rating: -1 }).lean();

  const recommendation = req.user
    ? scoreDestination(destination, {
        interests: req.user.preferences?.interests || [],
        budgetLevel: req.user.preferences?.budgetLevel || 'mid',
      })
    : undefined;

  res.json({ destination: { ...destination, recommendation }, activities });
});

// GET /api/destinations/:idOrSlug/activities?category=
const getActivities = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isId = /^[a-f\d]{24}$/i.test(idOrSlug);
  const destination = await Destination.findOne(isId ? { _id: idOrSlug } : { slug: idOrSlug }).select('_id');
  if (!destination) throw new ApiError(404, 'Destination not found');

  const filter = { destination: destination._id };
  if (req.query.category) filter.category = req.query.category;

  const activities = await Activity.find(filter).sort({ rating: -1 }).lean();
  res.json({ count: activities.length, activities });
});

// DELETE /api/destinations/:id
// Only the user who created a custom destination may remove it.
const removeDestination = asyncHandler(async (req, res) => {
  const destination = await Destination.findById(req.params.id);
  if (!destination) throw new ApiError(404, 'Destination not found');
  if (!destination.createdBy || String(destination.createdBy) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only delete destinations you created');
  }

  const trips = await Trip.find({ user: req.user._id, destination: destination._id }).select('_id').lean();
  const tripIds = trips.map((trip) => trip._id);

  await Promise.all([
    Itinerary.deleteMany({ trip: { $in: tripIds } }),
    Budget.deleteMany({ trip: { $in: tripIds } }),
    Activity.deleteMany({ destination: destination._id }),
    TravelOption.deleteMany({ destination: destination._id }),
    SoloTravelerMatch.deleteMany({ $or: [{ requesterTrip: { $in: tripIds } }, { recipientTrip: { $in: tripIds } }] }),
    Trip.deleteMany({ _id: { $in: tripIds } }),
    destination.deleteOne(),
  ]);

  res.json({ message: 'Destination deleted', id: destination._id });
});

module.exports = { listDestinations, listTags, recommended, getDestination, getActivities, removeDestination };
