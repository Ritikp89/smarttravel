const Destination = require('../models/Destination');
const TravelOption = require('../models/TravelOption');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const {
  buildVerifiedOptionFilter,
  publicVerification,
  sanitizeOptionInput,
  sanitizeVerificationUpdate,
} = require('../services/travelOptionService');

const presentOption = (option) => ({
  _id: option._id,
  name: option.name,
  provider: option.provider,
  category: option.category,
  destination: option.destination,
  description: option.description,
  bookingUrl: option.bookingUrl,
  verification: publicVerification(option.verification),
});

const listVerifiedOptions = asyncHandler(async (req, res) => {
  const filter = buildVerifiedOptionFilter(req.query);
  const options = await TravelOption.find(filter)
    .populate('destination', 'name country slug')
    .sort({ category: 1, name: 1 })
    .limit(100)
    .lean();
  res.json({ count: options.length, options: options.map(presentOption) });
});

const listAllOptions = asyncHandler(async (req, res) => {
  const options = await TravelOption.find()
    .populate('destination', 'name country slug')
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();
  res.json({ count: options.length, options });
});

const createOption = asyncHandler(async (req, res) => {
  const input = sanitizeOptionInput(req.body);
  const destination = await Destination.exists({ _id: input.destination });
  if (!destination) throw new ApiError(400, 'Destination not found');
  const option = await TravelOption.create(input);
  res.status(201).json({ option });
});

const updateVerification = asyncHandler(async (req, res) => {
  const updates = sanitizeVerificationUpdate(req.body, req.user._id);
  const option = await TravelOption.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .populate('destination', 'name country slug')
    .lean();
  if (!option) throw new ApiError(404, 'Travel option not found');
  res.json({ option: presentOption(option) });
});

module.exports = { listVerifiedOptions, listAllOptions, createOption, updateVerification };
