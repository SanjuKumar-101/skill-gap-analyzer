const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const careerRoutes = require('./career.routes');

// Auth routes
router.use('/auth', authRoutes);

// Career / skill-gap analysis routes
router.use('/career', careerRoutes);

module.exports = router;
