const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const TravelOption = require('../models/TravelOption');
const { requireAdmin } = require('../middleware/auth');
const {
  buildVerifiedOptionFilter,
  publicVerification,
  sanitizeOptionInput,
  sanitizeVerificationUpdate,
} = require('../services/travelOptionService');

test('verified option filters require every selected claim and category', () => {
  const filter = buildVerifiedOptionFilter({
    category: 'hotel,tour',
    accessibility: 'wheelchairAccess,sensoryFriendly',
    dietary: 'vegan',
    allergen: 'peanuts,milk',
  });

  assert.deepEqual(filter.category, { $in: ['hotel', 'tour'] });
  assert.equal(filter['verification.accessibility.wheelchairAccess.verified'], true);
  assert.equal(filter['verification.accessibility.sensoryFriendly.verified'], true);
  assert.equal(filter['verification.dietary.vegan.verified'], true);
  assert.equal(filter.$and.length, 2);
  assert.deepEqual(filter.$and.map((condition) => condition['verification.dietary.allergies'].$elemMatch.allergen), ['peanuts', 'milk']);
});

test('verified option filters reject empty and unsupported requirements', () => {
  assert.throws(() => buildVerifiedOptionFilter({}), /Select at least one accessibility or dietary requirement/);
  assert.throws(() => buildVerifiedOptionFilter({ accessibility: 'stepFree' }), /Invalid accessibility filter/);
  assert.throws(() => buildVerifiedOptionFilter({ allergen: 'anything' }), /Invalid allergen filter/);
});

test('travel option creation only accepts supported metadata and secure booking links', () => {
  const destination = new mongoose.Types.ObjectId();
  const result = sanitizeOptionInput({
    name: 'Accessible hotel',
    provider: 'Example',
    category: 'hotel',
    destination: String(destination),
    bookingUrl: 'https://example.com/book',
    verification: { accessibility: { wheelchairAccess: { verified: true } } },
  });

  assert.equal(result.destination, String(destination));
  assert.equal(result.verification, undefined);
  assert.throws(() => sanitizeOptionInput({
    name: 'Unsafe listing',
    provider: 'Example',
    category: 'hotel',
    destination: String(destination),
    bookingUrl: 'javascript:alert(1)',
  }), /valid HTTPS URL/);
});

test('only an HTTPS evidence URL can mark a claim verified', () => {
  const reviewerId = new mongoose.Types.ObjectId();
  const result = sanitizeVerificationUpdate({
    accessibility: { wheelchairAccess: { verified: true, evidenceUrl: 'https://example.com/accessibility' } },
    dietary: { allergies: [{ allergen: 'peanuts', verified: false }] },
  }, reviewerId);

  assert.equal(result['verification.accessibility.wheelchairAccess'].verifiedBy, reviewerId);
  assert.equal(result['verification.dietary.allergies'][0].verified, false);
  assert.throws(() => sanitizeVerificationUpdate({
    dietary: { halal: { verified: true, evidenceUrl: 'http://example.com/certificate' } },
  }, reviewerId), /HTTPS evidence URL/);
});

test('travel-option claims remain unverified by default and require reviewer evidence', async () => {
  const option = new TravelOption({
    name: 'Accessible hotel',
    provider: 'Example',
    category: 'hotel',
    destination: new mongoose.Types.ObjectId(),
  });

  assert.equal(option.verification.accessibility.wheelchairAccess.verified, false);
  await option.validate();

  option.verification.accessibility.wheelchairAccess = {
    verified: true,
    evidenceUrl: 'https://example.com/accessibility',
  };
  await assert.rejects(option.validate(), /verifiedAt|verifiedBy/);
});

test('public verification output hides unreviewed claims and reviewer identifiers', () => {
  const reviewerId = new mongoose.Types.ObjectId();
  const result = publicVerification({
    accessibility: {
      wheelchairAccess: {
        verified: true,
        evidenceUrl: 'https://example.com/wheelchair',
        verifiedAt: new Date('2026-01-01T00:00:00Z'),
        verifiedBy: reviewerId,
      },
      sensoryFriendly: {
        verified: true,
        evidenceUrl: 'javascript:alert(1)',
        verifiedAt: new Date(),
        verifiedBy: reviewerId,
      },
    },
  });

  assert.ok(result.accessibility.wheelchairAccess);
  assert.equal(result.accessibility.wheelchairAccess.verifiedBy, undefined);
  assert.equal(result.accessibility.sensoryFriendly, undefined);
});

test('only administrator accounts can enter verification-management routes', () => {
  const response = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let continued = false;

  requireAdmin({ user: { role: 'user' } }, response, () => { continued = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(continued, false);

  requireAdmin({ user: { role: 'admin' } }, response, () => { continued = true; });
  assert.equal(continued, true);
});
