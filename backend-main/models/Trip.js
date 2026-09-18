const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
    title: { type: String, trim: true, maxlength: 80 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    travelers: { type: Number, default: 1, min: 1, max: 20 },
    budgetLevel: { type: String, enum: ['budget', 'mid', 'luxury'], default: 'mid' },
    pace: { type: String, enum: ['relaxed', 'balanced', 'packed'], default: 'balanced' },
    interests: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['planning', 'booked', 'completed', 'cancelled'],
      default: 'planning',
    },
    notes: { type: String, maxlength: 2000 },
    coverImage: String,
  },
  { timestamps: true }
);

tripSchema.virtual('days').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  const ms = this.endDate.getTime() - this.startDate.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
});

tripSchema.pre('validate', function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be after the start date');
  }
});

tripSchema.set('toJSON', { virtuals: true });
tripSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Trip', tripSchema);
