const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, trim: true, maxlength: 120 },
    contributedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const tripSavingsPlanSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetAmount: { type: Number, required: true, min: 0.01 },
    depositAmount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR'], required: true },
    frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], required: true },
    departureDate: { type: Date, required: true },
    contributions: { type: [contributionSchema], default: [] },
  },
  { timestamps: true }
);

tripSavingsPlanSchema.index({ trip: 1 }, { unique: true });

module.exports = mongoose.model('TripSavingsPlan', tripSavingsPlanSchema);
