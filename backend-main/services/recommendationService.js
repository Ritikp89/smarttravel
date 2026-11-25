const Destination = require('../models/Destination');

// How a destination's tags map to user interests. Tags are freeform on the destination,
// interests are a fixed list on the user, so we need a little translation layer.
const TAG_TO_INTEREST = {
  culture: 'culture',
  temples: 'culture',
  architecture: 'culture',
  food: 'food',
  'street food': 'food',
  wine: 'food',
  coffee: 'food',
  nature: 'nature',
  mountains: 'nature',
  hiking: 'nature',
  wildlife: 'nature',
  adventure: 'adventure',
  surfing: 'adventure',
  diving: 'adventure',
  beach: 'beach',
  islands: 'beach',
  nightlife: 'nightlife',
  music: 'nightlife',
  history: 'history',
  ruins: 'history',
  shopping: 'shopping',
  markets: 'shopping',
  art: 'art',
  museums: 'art',
  design: 'art',
  wellness: 'wellness',
  spa: 'wellness',
  yoga: 'wellness',
};

const interestsForDestination = (dest) => {
  const set = new Set();
  (dest.tags || []).forEach((t) => {
    const mapped = TAG_TO_INTEREST[t.toLowerCase()];
    if (mapped) set.add(mapped);
  });
  return set;
};

/**
 * Score a destination for a given profile. Returns { score, reasons[] }.
 *
 * Weights (out of ~100):
 *  - interest overlap        up to 50
 *  - budget fit              up to 25
 *  - season match            up to 15
 *  - popularity/rating tiebreak up to 10
 */
const scoreDestination = (dest, { interests = [], budgetLevel = 'mid', month } = {}) => {
  const reasons = [];
  let score = 0;

  // interests
  const destInterests = interestsForDestination(dest);
  const matched = interests.filter((i) => destInterests.has(i));
  if (interests.length) {
    score += (matched.length / interests.length) * 50;
    if (matched.length) reasons.push(`Good for ${matched.slice(0, 3).join(', ')}`);
  } else {
    score += 25; // no preferences yet: neutral
  }

  // budget - compare the destination's cost at the user's level to a rough global median
  const medians = { budget: 60, mid: 150, luxury: 350 };
  const cost = dest.dailyCost?.[budgetLevel] ?? medians[budgetLevel];
  const ratio = cost / medians[budgetLevel];
  if (ratio <= 0.8) {
    score += 25;
    reasons.push('Easy on the wallet');
  } else if (ratio <= 1.1) {
    score += 18;
  } else if (ratio <= 1.4) {
    score += 10;
  } else {
    score += 3;
    reasons.push('On the pricier side');
  }

  // season
  if (month && dest.bestMonths?.length) {
    if (dest.bestMonths.includes(month)) {
      score += 15;
      reasons.push('Great time of year to go');
    } else {
      const near = dest.bestMonths.some((m) => Math.abs(m - month) === 1 || Math.abs(m - month) === 11);
      score += near ? 8 : 0;
      if (!near) reasons.push('Off-season, expect fewer crowds');
    }
  } else {
    score += 7;
  }

  // tiebreaker
  score += ((dest.rating || 4) / 5) * 6 + ((dest.popularity || 50) / 100) * 4;

  return { score: Math.round(score), reasons, matchedInterests: matched };
};

const recommend = async ({ interests, budgetLevel, month, exclude = [], limit = 6 }) => {
  const destinations = await Destination.find({ _id: { $nin: exclude } }).lean();

  return destinations
    .map((d) => ({ ...d, recommendation: scoreDestination(d, { interests, budgetLevel, month }) }))
    .sort((a, b) => b.recommendation.score - a.recommendation.score)
    .slice(0, limit);
};

module.exports = { recommend, scoreDestination, TAG_TO_INTEREST };
