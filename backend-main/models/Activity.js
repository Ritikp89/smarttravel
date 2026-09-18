const mongoose = require('mongoose');

const CATEGORIES = [
  'sightseeing',
  'museum',
  'food',
  'outdoors',
  'adventure',
  'beach',
  'nightlife',
  'shopping',
  'wellness',
  'tour',
];

const activitySchema = new mongoose.Schema(
  {
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: String,
    // which user interests this activity satisfies - matches User.preferences.interests
    interests: { type: [String], default: [] },
    durationHours: { type: Number, required: true, min: 0.5, max: 12 },
    cost: { type: Number, required: true, min: 0 }, // per person, USD
    coordinates: {
      lat: Number,
      lng: Number,
    },
    preferredTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'any'],
      default: 'any',
    },
    indoor: { type: Boolean, default: false },
    rating: { type: Number, min: 0, max: 5, default: 4.3 },
    neighborhood: String,
    bookingRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

activitySchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Activity', activitySchema);
