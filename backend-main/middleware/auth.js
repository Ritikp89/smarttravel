const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Attach the logged-in user to req.user, or bail with 401.
const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'You need to be logged in to do that' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'This account no longer exists' });
    }
    req.user = user;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token';
    return res.status(401).json({ message });
  }
};

// Like protect, but doesn't complain if there's no token.
// Used for endpoints that personalise results when they can.
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch {
    // ignore bad tokens here, treat as anonymous
  }
  next();
};

module.exports = { protect, optionalAuth };
