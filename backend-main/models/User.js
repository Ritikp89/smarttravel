const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const INTERESTS = [
  'culture',
  'food',
  'nature',
  'adventure',
  'beach',
  'nightlife',
  'history',
  'shopping',
  'art',
  'wellness',
];

const identityVerificationSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['stripe'], default: undefined },
    sessionId: { type: String, default: undefined },
    status: {
      type: String,
      enum: ['not_started', 'creating', 'pending', 'processing', 'requires_input', 'verified', 'canceled'],
      default: 'not_started',
    },
    attempt: { type: Number, min: 0, default: 0 },
    verifiedAt: { type: Date, default: null },
    ageBand: { type: String, enum: ['18-24', '25-34', '35-44', '45+'], default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'admin'], default: 'user', select: false },
    name: {
      type: String,
      required: [true, 'Please tell us your name'],
      trim: true,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "That doesn't look like a valid email"],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password needs at least 6 characters'],
      select: false,
    },
    avatarColor: {
      type: String,
      default: () => {
        const palette = ['#c2410c', '#0f766e', '#7c2d12', '#1d4ed8', '#6b21a8', '#be123c'];
        return palette[Math.floor(Math.random() * palette.length)];
      },
    },
    preferences: {
      interests: { type: [String], enum: INTERESTS, default: [] },
      budgetLevel: { type: String, enum: ['budget', 'mid', 'luxury'], default: 'mid' },
      travelPace: { type: String, enum: ['relaxed', 'balanced', 'packed'], default: 'balanced' },
      homeCity: { type: String, trim: true, default: '' },
      currency: { type: String, default: 'USD' },
    },
    identityVerification: { type: identityVerificationSchema, default: () => ({}) },
    blockedTravelers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    savedDestinations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.blockedTravelers;
  if (obj.identityVerification) {
    delete obj.identityVerification.sessionId;
    delete obj.identityVerification.attempt;
  }
  return obj;
};

userSchema.statics.INTERESTS = INTERESTS;

module.exports = mongoose.model('User', userSchema);
