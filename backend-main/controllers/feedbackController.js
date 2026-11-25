const Feedback = require('../models/Feedback');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const submitFeedback = asyncHandler(async (req, res) => {
  const { name, email, category, rating, message } = req.body;
  if (!String(message || '').trim()) throw new ApiError(400, 'Please enter your feedback');

  const feedback = await Feedback.create({
    user: req.user?._id || null,
    name: name || req.user?.name || '',
    email: email || req.user?.email || '',
    category,
    rating: rating ? Number(rating) : null,
    message: String(message).trim(),
  });

  res.status(201).json({ message: 'Thanks for your feedback', feedbackId: feedback._id });
});

module.exports = { submitFeedback };
