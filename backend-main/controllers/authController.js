const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sendAuth = (res, user, status = 200) => {
  res.status(status).json({ token: signToken(user._id), user: user.toSafeObject() });
};

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, preferences } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are all required');
  }

  const user = await User.create({ name, email, password, preferences });
  sendAuth(res, user, 201);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, "Email or password didn't match");
  }

  sendAuth(res, user);
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('savedDestinations', 'name country slug image tagline');
  res.json({ user: user.toSafeObject() });
});

// PUT /api/auth/me
const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { name, preferences, password, currentPassword } = req.body;

  if (name !== undefined) user.name = name;
  if (preferences) {
    user.preferences = { ...user.preferences.toObject(), ...preferences };
  }

  if (password) {
    if (!currentPassword) throw new ApiError(400, 'Enter your current password to set a new one');
    const withPassword = await User.findById(req.user._id).select('+password');
    if (!(await withPassword.matchPassword(currentPassword))) {
      throw new ApiError(401, 'Current password is wrong');
    }
    user.password = password;
  }

  await user.save();
  res.json({ user: user.toSafeObject() });
});

// POST /api/auth/saved/:destinationId  (toggle)
const toggleSaved = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const id = req.params.destinationId;
  const idx = user.savedDestinations.findIndex((d) => String(d) === id);

  if (idx >= 0) user.savedDestinations.splice(idx, 1);
  else user.savedDestinations.push(id);

  await user.save();
  res.json({ saved: idx < 0, savedDestinations: user.savedDestinations });
});

module.exports = { register, login, getMe, updateMe, toggleSaved };
