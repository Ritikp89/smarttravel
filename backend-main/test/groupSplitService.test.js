const test = require('node:test');
const assert = require('node:assert/strict');
const { splitEqually } = require('../services/groupSplitService');
const { recordPriceCheck } = require('../services/priceWatchService');

test('equal split distributes leftover minor units without losing value', () => {
  const shares = splitEqually(10000, ['a', 'b', 'c']);

  assert.deepEqual(shares, [
    { userId: 'a', amountMinorUnits: 3334 },
    { userId: 'b', amountMinorUnits: 3333 },
    { userId: 'c', amountMinorUnits: 3333 },
  ]);
  assert.equal(shares.reduce((sum, share) => sum + share.amountMinorUnits, 0), 10000);
});

test('equal split rejects amounts too small to give each selected traveler a share', () => {
  assert.throws(() => splitEqually(2, ['a', 'b', 'c']), /too small/);
});

test('price checks retain the lowest observed price after a later increase', () => {
  const lowPriceAt = new Date('2026-01-01T00:00:00Z');
  const watch = { latestPrice: 125, lowestPrice: 100, lowestPriceAt: lowPriceAt };
  const checkedAt = new Date('2026-01-02T00:00:00Z');

  recordPriceCheck(watch, 110, checkedAt);

  assert.equal(watch.latestPrice, 110);
  assert.equal(watch.lowestPrice, 100);
  assert.equal(watch.lowestPriceAt, lowPriceAt);
});

test('price checks record a new low and its timestamp', () => {
  const checkedAt = new Date('2026-02-01T00:00:00Z');
  const watch = { latestPrice: 125, lowestPrice: 125, lowestPriceAt: null };

  recordPriceCheck(watch, 99.5, checkedAt);

  assert.equal(watch.lowestPrice, 99.5);
  assert.equal(watch.lowestPriceAt, checkedAt);
});
