const Budget = require('../models/Budget');
const TripPriceWatch = require('../models/TripPriceWatch');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { RATES_FROM_USD, normalizeCurrency } = require('../services/currencyService');
const { currencyScale } = require('../services/groupSplitService');
const { findTripForMember } = require('../services/tripMemberService');
const { recordPriceCheck } = require('../services/priceWatchService');

const amountInCurrency = (value, currency) => {
  const amount = Number(value);
  const scaled = amount * currencyScale(currency);
  const rounded = Math.round(scaled);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(rounded) ||
    Math.abs(scaled - rounded) > 1e-6
  ) {
    throw new ApiError(400, `Enter an amount greater than zero with no more than ${currency === 'JPY' ? 'zero' : 'two'} decimal places`);
  }
  return rounded / currencyScale(currency);
};

const selectedCurrency = async (body, user, trip) => {
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

const validateBookingUrl = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 2048) {
    throw new ApiError(400, 'Booking link must be 2048 characters or fewer');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(400, 'Enter a valid booking link');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ApiError(400, 'Booking link must use http or https');
  }
  return url.toString();
};

const canManageWatch = (watch, trip, userId) =>
  String(trip.user._id) === String(userId) || String(watch.createdBy) === String(userId);

const listWatches = asyncHandler(async (req, res) => {
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const [watches, currency] = await Promise.all([
    TripPriceWatch.find({ trip: trip._id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name avatarColor')
      .lean(),
    selectedCurrency({}, req.user, trip),
  ]);
  res.json({ trip, watches, currency, isOwner: String(trip.user._id) === String(req.user._id) });
});

const createWatch = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const type = body.type;
  if (!['flight', 'hotel'].includes(type)) throw new ApiError(400, 'Choose a flight or hotel');
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label || label.length > 120) throw new ApiError(400, 'Add a booking name of 1 to 120 characters');

  const provider = body.provider === undefined || body.provider === ''
    ? undefined
    : typeof body.provider === 'string' && body.provider.trim().length <= 80
      ? body.provider.trim()
      : null;
  if (provider === null) throw new ApiError(400, 'Provider name must be 80 characters or fewer');

  const currency = await selectedCurrency(body, req.user, trip);
  const bookedPrice = amountInCurrency(body.bookedPrice, currency);
  const hasCurrentPrice = body.currentPrice !== undefined && body.currentPrice !== '';
  const currentPrice = !hasCurrentPrice
    ? bookedPrice
    : amountInCurrency(body.currentPrice, currency);
  const checkedAt = hasCurrentPrice ? new Date() : null;
  const watch = await TripPriceWatch.create({
    trip: trip._id,
    createdBy: req.user._id,
    type,
    label,
    provider,
    bookingUrl: validateBookingUrl(body.bookingUrl),
    bookedPrice,
    latestPrice: currentPrice,
    lowestPrice: Math.min(bookedPrice, currentPrice),
    currency,
    lastCheckedAt: checkedAt,
    lowestPriceAt: currentPrice < bookedPrice ? checkedAt : null,
  });
  await watch.populate('createdBy', 'name avatarColor');
  res.status(201).json({ watch });
});

const checkPrice = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const watch = await TripPriceWatch.findOne({ _id: req.params.watchId, trip: trip._id });
  if (!watch) throw new ApiError(404, "Couldn't find that price watch");
  if (!canManageWatch(watch, trip, req.user._id)) {
    throw new ApiError(403, 'Only the trip owner or booking creator can update this price');
  }

  const price = amountInCurrency(body.latestPrice, watch.currency);
  recordPriceCheck(watch, price);
  await watch.save();
  await watch.populate('createdBy', 'name avatarColor');
  res.json({ watch });
});

const deleteWatch = asyncHandler(async (req, res) => {
  const trip = await findTripForMember(req.params.tripId, req.user._id);
  const watch = await TripPriceWatch.findOne({ _id: req.params.watchId, trip: trip._id });
  if (!watch) throw new ApiError(404, "Couldn't find that price watch");
  if (!canManageWatch(watch, trip, req.user._id)) {
    throw new ApiError(403, 'Only the trip owner or booking creator can remove this price watch');
  }

  await watch.deleteOne();
  res.json({ message: 'Price watch removed', id: watch._id });
});

module.exports = { listWatches, createWatch, checkPrice, deleteWatch };
