const mongoose = require('mongoose')
const CreatorItinerary = require('../models/CreatorItinerary')
const Destination = require('../models/Destination')
const { asyncHandler, ApiError } = require('../middleware/errorHandler')
const { sanitizeInput } = require('../services/creatorItineraryService')

const ensureDestinationExists = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Choose a valid destination')
  if (!await Destination.exists({ _id: id })) throw new ApiError(404, 'Destination not found')
}

const populateCreatorRoute = (query) => query
  .populate('destination', 'name slug country')
  .populate('creator', 'name')

const listPublished = asyncHandler(async (req, res) => {
  const itineraries = await populateCreatorRoute(
    CreatorItinerary.find(req.user
      ? { $or: [{ status: 'published' }, { status: 'draft', creator: req.user._id }] }
      : { status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(40)
  ).lean()

  res.json({ itineraries })
})

const getById = asyncHandler(async (req, res) => {
  const itinerary = await populateCreatorRoute(CreatorItinerary.findById(req.params.id)).lean()
  const isOwner = itinerary && req.user
    && String(itinerary.creator?._id || itinerary.creator) === String(req.user._id)

  if (!itinerary || (itinerary.status !== 'published' && !isOwner)) {
    throw new ApiError(404, 'Creator route not found')
  }

  res.json({ itinerary })
})

const create = asyncHandler(async (req, res) => {
  const input = sanitizeInput(req.body)
  await ensureDestinationExists(input.destination)
  const itinerary = await CreatorItinerary.create({
    ...input,
    creator: req.user._id,
  })
  await itinerary.populate([
    { path: 'destination', select: 'name slug country' },
    { path: 'creator', select: 'name' },
  ])
  res.status(201).json({ itinerary })
})

const update = asyncHandler(async (req, res) => {
  const itinerary = await CreatorItinerary.findOne({
    _id: req.params.id,
    creator: req.user._id,
  })
  if (!itinerary) throw new ApiError(404, 'Creator route not found')

  const input = sanitizeInput(req.body)
  if (input.destination !== undefined) await ensureDestinationExists(input.destination)
  itinerary.set(input)
  await itinerary.save()
  await itinerary.populate([
    { path: 'destination', select: 'name slug country' },
    { path: 'creator', select: 'name' },
  ])
  res.json({ itinerary })
})

module.exports = { listPublished, getById, create, update }
