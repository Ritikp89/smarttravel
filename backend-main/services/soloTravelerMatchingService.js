const normalizeCityKey = (destination) =>
  `${(destination?.name || '').trim()}|${(destination?.country || '').trim()}`.toLowerCase();

const tripsOverlap = (first, second) =>
  new Date(first.startDate) <= new Date(second.endDate)
  && new Date(first.endDate) >= new Date(second.startDate);

const sharedInterests = (first, second) => {
  const secondInterests = new Set(second || []);
  return [...new Set(first || [])].filter((interest) => secondInterests.has(interest));
};

const isEligibleSoloTrip = (trip, today = new Date()) =>
  Number(trip?.travelers) === 1
  && !(trip.members || []).length
  && trip.matchingEnabled === true
  && ['planning', 'booked'].includes(trip.status)
  && new Date(trip.endDate) >= today;

const tripPairKey = (firstTripId, secondTripId) =>
  [String(firstTripId), String(secondTripId)].sort().join(':');

module.exports = { normalizeCityKey, tripsOverlap, sharedInterests, isEligibleSoloTrip, tripPairKey };
