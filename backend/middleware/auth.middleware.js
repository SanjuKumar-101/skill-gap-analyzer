const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Protect a route by requiring a valid `Authorization: Bearer <token>` header.
 * On success attaches the full user document to `req.user`.
 */
module.exports = async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please sign in and try again.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyError) {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please sign in again.',
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. User no longer exists.',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
