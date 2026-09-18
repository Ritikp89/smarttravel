const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },
    travelMinutesFromPrevious: { type: Number, default: 0 },
    note: String,
  },
  { _id: true }
);

const daySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true },
    date: { type: Date, required: true },
    theme: String,
    slots: [slotSchema],
    estimatedCost: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
  },
  { _id: true }
);

const itinerarySchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    days: [daySchema],
    generatedAt: { type: Date, default: Date.now },
    // things we couldn't fit that the user might still want to see
    leftovers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
    customised: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Itinerary', itinerarySchema);
