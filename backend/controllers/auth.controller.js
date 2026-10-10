const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { OAuth2Client } = require('google-auth-library');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register a new user with email/password
exports.register = async (req, res, next) => {
  try {
    const { email, password, name, currentSkills, preferredLearningStyle, timeAvailabilityPerWeek } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { googleId: email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      currentSkills: currentSkills || [],
      preferredLearningStyle: preferredLearningStyle || 'mixed',
      timeAvailabilityPerWeek
    });

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currentSkills: user.currentSkills,
        preferredLearningStyle: user.preferredLearningStyle,
        timeAvailabilityPerWeek: user.timeAvailabilityPerWeek
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user with email/password
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currentSkills: user.currentSkills,
        preferredLearningStyle: user.preferredLearningStyle,
        timeAvailabilityPerWeek: user.timeAvailabilityPerWeek
      }
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth authentication
// Accepts either an ID token (`tokenId`, from GoogleLogin) or an OAuth access
// token (`accessToken`, from useGoogleLogin implicit flow).
exports.googleAuth = async (req, res, next) => {
  try {
    const { tokenId, accessToken } = req.body;

    let profile;

    if (tokenId) {
      // Verify the Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenId,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      profile = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
    } else if (accessToken) {
      // Verify the OAuth access token by fetching the Google user profile
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userInfoResponse.ok) {
        return res.status(401).json({ success: false, message: 'Invalid Google access token' });
      }

      const info = await userInfoResponse.json();
      profile = {
        sub: info.sub,
        email: info.email,
        name: info.name,
        picture: info.picture
      };
    } else {
      return res.status(400).json({ success: false, message: 'Missing Google credential' });
    }

    const { sub, email, name, picture } = profile;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account did not return an email address' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      // Create new user from Google data
      isNewUser = true;
      user = await User.create({
        email,
        name: name || email.split('@')[0],
        googleId: sub,
        avatar: picture,
        currentSkills: [],
        preferredLearningStyle: 'mixed',
        timeAvailabilityPerWeek: 10
      });
    } else {
      // Update existing user if they don't have googleId
      if (!user.googleId) {
        user.googleId = sub;
        user.avatar = picture;
        await user.save();
      }
    }

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        currentSkills: user.currentSkills,
        preferredLearningStyle: user.preferredLearningStyle,
        timeAvailabilityPerWeek: user.timeAvailabilityPerWeek
      },
      isNewUser
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
};