const Trip = require('../models/Trip');
const { ApiError } = require('../middleware/errorHandler');

const findTripForMember = async (tripId, userId) => {
  const trip = await Trip.findOne({
    _id: tripId,
    $or: [{ user: userId }, { members: userId }],
  })
    .populate('user', 'name avatarColor')
    .populate('members', 'name avatarColor')
    .populate('destination', 'name country');
  if (!trip) throw new ApiError(404, "Couldn't find that trip group");
  return trip;
};

module.exports = { findTripForMember };
