const mongoose = require('mongoose')
const { isSafeHttpsUrl } = require('../services/creatorItineraryService')

const creatorStopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    kind: {
      type: String,
      enum: ['restaurant', 'stay', 'activity', 'attraction'],
      required: true,
    },
    address: { type: String, required: true, trim: true, maxlength: 250 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    bookingUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
      validate: {
        validator: (value) => !value || isSafeHttpsUrl(value),
        message: 'Booking links must be valid HTTPS URLs',
      },
    },
    dayNumber: { type: Number, min: 1, max: 30, default: 1 },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
  },
  { _id: true }
)

const creatorItinerarySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true, index: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: isSafeHttpsUrl,
        message: 'The source must be a valid HTTPS URL',
      },
    },
    stops: {
      type: [creatorStopSchema],
      default: [],
      validate: {
        validator: (stops) => stops.length <= 30,
        message: 'A route can have up to 30 stops',
      },
    },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

creatorItinerarySchema.pre('validate', function () {
  if (this.status === 'published' && this.stops.length === 0) {
    this.invalidate('stops', 'Add at least one stop before publishing')
  }
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date()
  if (this.status === 'draft') this.publishedAt = null
})

creatorItinerarySchema.index({ status: 1, publishedAt: -1 })

module.exports = mongoose.model('CreatorItinerary', creatorItinerarySchema)
