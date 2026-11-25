const mongoose = require('mongoose');

const tripPriceWatchSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['flight', 'hotel'], required: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    provider: { type: String, trim: true, maxlength: 80 },
    bookingUrl: { type: String, trim: true, maxlength: 2048 },
    bookedPrice: { type: Number, required: true, min: 0.01 },
    latestPrice: { type: Number, required: true, min: 0.01 },
    lowestPrice: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR'], required: true },
    lastCheckedAt: { type: Date, default: null },
    lowestPriceAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tripPriceWatchSchema.index({ trip: 1, createdAt: -1 });

module.exports = mongoose.model('TripPriceWatch', tripPriceWatchSchema);
