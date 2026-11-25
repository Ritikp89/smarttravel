const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const soloTravelerMatchSchema = new mongoose.Schema(
  {
    tripPairKey: { type: String, required: true, unique: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    recipientTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    activityType: { type: String, enum: ['day_tour', 'meal', 'shared_ride'], required: true },
    introMessage: { type: String, trim: true, maxlength: 500, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'blocked', 'withdrawn'],
      default: 'pending',
    },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

soloTravelerMatchSchema.index({ requester: 1, status: 1, updatedAt: -1 });
soloTravelerMatchSchema.index({ recipient: 1, status: 1, updatedAt: -1 });
soloTravelerMatchSchema.index({ requesterTrip: 1, status: 1 });
soloTravelerMatchSchema.index({ recipientTrip: 1, status: 1 });

module.exports = mongoose.model('SoloTravelerMatch', soloTravelerMatchSchema);
