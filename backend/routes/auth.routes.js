const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', authController.register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authController.login);

// @desc    Google OAuth authentication
// @route   POST /api/auth/google
// @access  Public
router.post('/google', authController.googleAuth);

module.exports = router;