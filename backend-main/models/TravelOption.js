const mongoose = require('mongoose');
const { isSafeHttpsUrl } = require('../services/creatorItineraryService');

const claimSchema = new mongoose.Schema(
  {
    verified: { type: Boolean, default: false },
    evidenceUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || isSafeHttpsUrl(value),
        message: 'Verification evidence must be a valid HTTPS URL',
      },
    },
    verifiedAt: {
      type: Date,
      default: null,
      required: function () { return this.verified; },
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      required: function () { return this.verified; },
    },
  },
  { _id: false }
);

const allergyClaimSchema = new mongoose.Schema(
  {
    allergen: {
      type: String,
      enum: ['peanuts', 'tree-nuts', 'milk', 'eggs', 'wheat', 'soy', 'fish', 'shellfish', 'sesame'],
      required: true,
    },
    verified: { type: Boolean, default: false },
    evidenceUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || isSafeHttpsUrl(value),
        message: 'Verification evidence must be a valid HTTPS URL',
      },
    },
    verifiedAt: {
      type: Date,
      default: null,
      required: function () { return this.verified; },
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      required: function () { return this.verified; },
    },
  },
  { _id: false }
);

const travelOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    provider: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: ['hotel', 'tour', 'transport'], required: true, index: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true, index: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    bookingUrl: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (value) => !value || isSafeHttpsUrl(value),
        message: 'Booking URL must be a valid HTTPS URL',
      },
    },
    verification: {
      accessibility: {
        wheelchairAccess: { type: claimSchema, default: () => ({}) },
        sensoryFriendly: { type: claimSchema, default: () => ({}) },
      },
      dietary: {
        halal: { type: claimSchema, default: () => ({}) },
        vegan: { type: claimSchema, default: () => ({}) },
        allergies: { type: [allergyClaimSchema], default: [] },
      },
    },
  },
  { timestamps: true }
);

travelOptionSchema.index({ category: 1, 'verification.accessibility.wheelchairAccess.verified': 1 });
travelOptionSchema.index({ category: 1, 'verification.dietary.halal.verified': 1 });
travelOptionSchema.index({ category: 1, 'verification.dietary.vegan.verified': 1 });

module.exports = mongoose.model('TravelOption', travelOptionSchema);
