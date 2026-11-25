const test = require('node:test');
const assert = require('node:assert/strict');
const { ageBandFromDob, localStatusForStripe } = require('../services/identityVerificationService');

const today = new Date('2026-06-15T12:00:00Z');

test('age bands enforce adult-only eligibility and exact birthday boundaries', () => {
  assert.equal(ageBandFromDob({ year: 2008, month: 6, day: 16 }, today), null);
  assert.equal(ageBandFromDob({ year: 2008, month: 6, day: 15 }, today), '18-24');
  assert.equal(ageBandFromDob({ year: 2001, month: 6, day: 15 }, today), '25-34');
  assert.equal(ageBandFromDob({ year: 1991, month: 6, day: 15 }, today), '35-44');
  assert.equal(ageBandFromDob({ year: 1981, month: 6, day: 15 }, today), '45+');
});

test('invalid or future dates of birth do not produce an age band', () => {
  assert.equal(ageBandFromDob({ year: 2027, month: 1, day: 1 }, today), null);
  assert.equal(ageBandFromDob({ year: 2000, month: 2, day: 30 }, today), null);
  assert.equal(ageBandFromDob(null, today), null);
});

test('Stripe statuses map to explicit local states', () => {
  assert.equal(localStatusForStripe('verified'), 'verified');
  assert.equal(localStatusForStripe('requires_input'), 'requires_input');
  assert.equal(localStatusForStripe('processing'), 'processing');
  assert.equal(localStatusForStripe('canceled'), 'canceled');
});
