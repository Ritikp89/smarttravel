const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeCityKey,
  tripsOverlap,
  sharedInterests,
  isEligibleSoloTrip,
  tripPairKey,
} = require('../services/soloTravelerMatchingService');

test('city matching ignores letter case and surrounding whitespace', () => {
  assert.equal(
    normalizeCityKey({ name: ' Paris ', country: 'FRANCE ' }),
    normalizeCityKey({ name: 'paris', country: 'france' })
  );
  assert.notEqual(
    normalizeCityKey({ name: 'Paris', country: 'France' }),
    normalizeCityKey({ name: 'Paris', country: 'Texas' })
  );
});

test('date ranges match when they overlap on a boundary day', () => {
  assert.equal(
    tripsOverlap(
      { startDate: '2027-05-01', endDate: '2027-05-10' },
      { startDate: '2027-05-10', endDate: '2027-05-14' }
    ),
    true
  );
  assert.equal(
    tripsOverlap(
      { startDate: '2027-05-01', endDate: '2027-05-09' },
      { startDate: '2027-05-10', endDate: '2027-05-14' }
    ),
    false
  );
});

test('shared interests are unique and limited to interests held by both travelers', () => {
  assert.deepEqual(sharedInterests(['food', 'food', 'culture'], ['food', 'nature']), ['food']);
});

test('only future, active, one-traveler opted-in trips are matchable', () => {
  const trip = {
    travelers: 1,
    members: [],
    matchingEnabled: true,
    status: 'planning',
    endDate: '2027-05-10',
  };
  const today = new Date('2027-05-01T00:00:00Z');

  assert.equal(isEligibleSoloTrip(trip, today), true);
  assert.equal(isEligibleSoloTrip({ ...trip, travelers: 2 }, today), false);
  assert.equal(isEligibleSoloTrip({ ...trip, members: ['member'] }, today), false);
  assert.equal(isEligibleSoloTrip({ ...trip, matchingEnabled: false }, today), false);
  assert.equal(isEligibleSoloTrip({ ...trip, status: 'cancelled' }, today), false);
  assert.equal(isEligibleSoloTrip({ ...trip, endDate: '2027-04-30' }, today), false);
});

test('trip-pair keys do not depend on request direction', () => {
  assert.equal(tripPairKey('trip-a', 'trip-b'), tripPairKey('trip-b', 'trip-a'));
});
