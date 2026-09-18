const Destination = require('../models/Destination');
const Activity = require('../models/Activity');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { recommend, scoreDestination } = require('../services/recommendationService');

// GET /api/destinations?q=&region=&tag=&maxDaily=&sort=
const listDestinations = asyncHandler(async (req, res) => {
  const { q, region, tag, maxDaily, budgetLevel = 'mid', sort = 'popular', limit = 40 } = req.query;
  const filter = {};

  if (q) filter.$text = { $search: q };
  if (region) filter.region = region;
  if (tag) filter.tags = tag;
  if (maxDaily) filter[`dailyCost.${budgetLevel}`] = { $lte: Number(maxDaily) };

  const sortMap = {
    popular: { popularity: -1 },
    rating: { rating: -1 },
    cheapest: { [`dailyCost.${budgetLevel}`]: 1 },
    name: { name: 1 },
  };

  let query = Destination.find(filter).sort(sortMap[sort] || sortMap.popular).limit(Number(limit));
  if (q) query = query.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });

  const destinations = await query.lean();

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

  res.json({ month, destinations: results });
});

// GET /api/destinations/:idOrSlug
const getDestination = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isId = /^[a-f\d]{24}$/i.test(idOrSlug);

  const destination = await Destination.findOne(isId ? { _id: idOrSlug } : { slug: idOrSlug }).lean();
  if (!destination) throw new ApiError(404, "We don't have that destination (yet)");

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

module.exports = { listDestinations, listTags, recommended, getDestination, getActivities };
