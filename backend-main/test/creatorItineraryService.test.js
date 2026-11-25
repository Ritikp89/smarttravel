const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const CreatorItinerary = require('../models/CreatorItinerary')
const { isSafeHttpsUrl, sanitizeInput } = require('../services/creatorItineraryService')

test('creator source and booking URLs must be HTTPS without credentials', () => {
  assert.equal(isSafeHttpsUrl('https://www.youtube.com/watch?v=abc'), true)
  assert.equal(isSafeHttpsUrl('https://user:pass@example.com/route'), false)
  assert.equal(isSafeHttpsUrl('http://example.com/route'), false)
  assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false)
})

test('creator route input only keeps supported stop fields', () => {
  const input = sanitizeInput({
    title: 'Food walk',
    creator: 'attacker',
    status: 'published',
    stops: [{
      name: 'Market',
      kind: 'restaurant',
      address: 'Main Street',
      bookingUrl: 'https://example.com/book',
      dayNumber: 1,
      owner: 'attacker',
    }],
  })

  assert.equal(input.creator, undefined)
  assert.equal(input.stops[0].owner, undefined)
  assert.equal(input.stops[0].name, 'Market')
})

test('creator route input rejects unsupported status and excessive stop counts', () => {
  assert.throws(() => sanitizeInput({ status: 'admin' }), /Route status must be draft or published/)
  assert.throws(() => sanitizeInput({ stops: Array(31).fill({}) }), /up to 30 stops/)
})

test('published routes require a stop and an HTTPS source URL', async () => {
  const itinerary = new CreatorItinerary({
    title: 'Food walk',
    destination: new mongoose.Types.ObjectId(),
    creator: new mongoose.Types.ObjectId(),
    sourceUrl: 'http://example.com/video',
    status: 'published',
  })

  await assert.rejects(itinerary.validate(), (error) => {
    assert.ok(error.errors.sourceUrl)
    assert.ok(error.errors.stops)
    return true
  })
})

test('stop booking URLs reject unsafe protocols', async () => {
  const itinerary = new CreatorItinerary({
    title: 'Food walk',
    destination: new mongoose.Types.ObjectId(),
    creator: new mongoose.Types.ObjectId(),
    sourceUrl: 'https://example.com/video',
    stops: [{
      name: 'Cafe',
      kind: 'restaurant',
      address: 'Main Street',
      bookingUrl: 'javascript:alert(1)',
    }],
  })

  await assert.rejects(itinerary.validate(), (error) => {
    assert.ok(error.errors['stops.0.bookingUrl'])
    return true
  })
})
