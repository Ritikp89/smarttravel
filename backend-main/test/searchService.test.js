const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeRegex, searchTerms } = require('../services/searchService');

test('search terms preserve input and translate common Hindi place names', () => {
  assert.deepEqual(searchTerms('पेरिस में घूमने की जगह'), [
    'पेरिस में घूमने की जगह',
    'पेरिस',
    'Paris',
  ]);
});

test('search terms omit empty and short variants', () => {
  assert.deepEqual(searchTerms('  a '), []);
});

test('query text is escaped before it becomes a regular expression', () => {
  const expression = new RegExp(escapeRegex('a.*(b)'), 'i');
  assert.equal(expression.test('a.*(b)'), true);
  assert.equal(expression.test('anything'), false);
});
