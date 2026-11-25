const Activity = require('../models/Activity');
const Destination = require('../models/Destination');
const Trip = require('../models/Trip');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { escapeRegex, searchTerms } = require('../services/searchService');

const search = asyncHandler(async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (query.length < 2) throw new ApiError(400, 'Enter at least two characters to search');
  if (query.length > 100) throw new ApiError(400, 'Search queries must be 100 characters or fewer');

  const patterns = searchTerms(query).map((term) => new RegExp(escapeRegex(term), 'i'));
  const destinationConditions = patterns.flatMap((pattern) => [
    { name: pattern },
    { country: pattern },
    { tagline: pattern },
    { tags: pattern },
  ]);
  const activityConditions = patterns.flatMap((pattern) => [
    { name: pattern },
    { category: pattern },
    { description: pattern },
    { neighborhood: pattern },
  ]);

  const [destinations, activities] = await Promise.all([
    Destination.find({ $or: destinationConditions })
      .select('name slug country image tagline')
      .sort({ popularity: -1 })
      .limit(10)
      .lean(),
    Activity.find({ $or: activityConditions })
      .select('name category description neighborhood coordinates destination')
      .populate('destination', 'name slug country')
      .sort({ rating: -1 })
      .limit(12)
      .lean(),
  ]);

  let trips = [];
  if (req.user) {
    const destinationIds = destinations.map((destination) => destination._id);
    const tripConditions = patterns.map((pattern) => ({ title: pattern }));
    if (destinationIds.length) tripConditions.push({ destination: { $in: destinationIds } });

    trips = await Trip.find({
      $or: [
        { user: req.user._id },
        { members: req.user._id },
      ],
      $and: [{ $or: tripConditions }],
    })
      .select('title destination startDate endDate status')
      .populate('destination', 'name slug country')
      .sort({ startDate: 1 })
      .limit(10)
      .lean();
  }

  res.json({ query, destinations, activities, trips });
});

module.exports = { search };
