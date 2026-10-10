const express = require('express');
const multer = require('multer');
const protect = require('../middleware/auth.middleware');
const careerController = require('../controllers/career.controller');

const router = express.Router();

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'));
    }
  },
});

/**
 * Wrap multer so its errors are returned as clean JSON instead of crashing
 * the request pipeline.
 */
function handleResumeUpload(req, res, next) {
  upload.single('resume')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large. The maximum resume size is 10 MB.',
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'Resume upload failed.',
    });
  });
}

// @desc    Analyse an uploaded resume against a target using NVIDIA NIM
// @route   POST /api/career/analyze
// @access  Private
router.post('/analyze', protect, handleResumeUpload, careerController.analyzeResume);

// @desc    List the authenticated user's past target roles and roadmaps
// @route   GET /api/career/history
// @access  Private
router.get('/history', protect, careerController.getHistory);

// @desc    Fetch a single saved roadmap (with its target role)
// @route   GET /api/career/roadmap/:id
// @access  Private
router.get('/roadmap/:id', protect, careerController.getRoadmap);

// @desc    Grade a weekly quiz and persist the week's completion state
// @route   POST /api/career/roadmap/:id/quiz
// @access  Private
router.post('/roadmap/:id/quiz', protect, careerController.submitQuiz);

// @desc    Verify a skill gap using a public GitHub repository as proof of work
// @route   POST /api/career/roadmap/:id/verify-github
// @access  Private
router.post('/roadmap/:id/verify-github', protect, careerController.verifyGithub);

module.exports = router;
