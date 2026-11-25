const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['accommodation', 'food', 'activities', 'transport', 'flights', 'misc'],
      required: true,
    },
    label: String,
    amount: { type: Number, required: true, min: 0 },
    // whether we calculated this or the user typed it in
    source: { type: String, enum: ['estimated', 'manual'], default: 'estimated' },
  },
  { _id: true }
);

const budgetSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    currency: { type: String, default: 'USD' },
    lines: [lineSchema],
    total: { type: Number, default: 0 },
    perPerson: { type: Number, default: 0 },
    perDay: { type: Number, default: 0 },
    // optional ceiling the traveller sets for themselves
    limit: { type: Number, min: 0 },
    contingencyPct: { type: Number, default: 10 },
    estimatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

budgetSchema.methods.recalculate = function (travelers = 1, days = 1) {
  const subtotal = this.lines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const contingency = subtotal * (this.contingencyPct / 100);
  this.total = Math.round(subtotal + contingency);
  this.perPerson = Math.round(this.total / Math.max(1, travelers));
  this.perDay = Math.round(this.total / Math.max(1, days));
  return this;
};

module.exports = mongoose.model('Budget', budgetSchema);
