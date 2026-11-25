const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
  },
  { _id: false }
);

const tripSplitSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR'], required: true },
    splitMode: { type: String, enum: ['equal', 'custom'], required: true, default: 'equal' },
    shares: { type: [shareSchema], required: true, validate: [(shares) => shares.length > 0, 'At least one share is required'] },
  },
  { timestamps: true }
);

tripSplitSchema.index({ trip: 1, createdAt: -1 });

module.exports = mongoose.model('TripSplit', tripSplitSchema);
