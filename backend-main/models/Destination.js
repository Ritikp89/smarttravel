const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    country: { type: String, required: true, trim: true },
    region: {
      type: String,
      enum: ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania', 'Middle East'],
      required: true,
    },
    tagline: { type: String, maxlength: 140 },
    description: { type: String, required: true },
    tags: { type: [String], index: true },
    bestMonths: { type: [Number], default: [] }, // 1-12
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    // rough per-person per-day costs in USD, by travel style
    dailyCost: {
      budget: { type: Number, required: true },
      mid: { type: Number, required: true },
      luxury: { type: Number, required: true },
    },
    currency: { type: String, default: 'USD' },
    timezone: String,
    image: String,
    rating: { type: Number, min: 0, max: 5, default: 4.2 },
    popularity: { type: Number, default: 50 }, // 0-100, used as a tiebreaker in recommendations
    knownFor: [String],
    localTip: String,
  },
  { timestamps: true }
);

destinationSchema.index({ name: 'text', country: 'text', tags: 'text', description: 'text' });

destinationSchema.virtual('activities', {
  ref: 'Activity',
  localField: '_id',
  foreignField: 'destination',
});

destinationSchema.set('toJSON', { virtuals: true });
destinationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Destination', destinationSchema);
