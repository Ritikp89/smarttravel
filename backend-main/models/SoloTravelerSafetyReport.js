const mongoose = require('mongoose');

const soloTravelerSafetyReportSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'SoloTravelerMatch', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['inappropriate_behavior', 'fake_profile', 'unsafe_request', 'other'],
      required: true,
    },
    details: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: ['open', 'reviewed'], default: 'open' },
  },
  { timestamps: true }
);

soloTravelerSafetyReportSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('SoloTravelerSafetyReport', soloTravelerSafetyReportSchema);
