const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      default: [],
    },
    correctAnswer: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const weekSchema = new mongoose.Schema(
  {
    week: {
      type: Number,
      required: true,
      min: 1,
    },
    theme: {
      type: String,
      required: true,
      trim: true,
    },
    tasks: {
      type: [String],
      default: [],
    },
    quiz: {
      type: quizSchema,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    selectedAnswer: {
      type: Number,
      default: null,
      min: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const gapSchema = new mongoose.Schema(
  {
    skill: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      required: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    confidenceScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    evidenceSnippet: {
      type: String,
      default: '',
    },
    verificationExplanation: {
      type: String,
      default: '',
    },
    verificationUrl: {
      type: String,
      default: '',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TargetRole',
      required: true,
      index: true,
    },
    gapAnalysis: {
      type: [gapSchema],
      default: [],
    },
    weeklyModules: {
      type: [weekSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Roadmap', roadmapSchema);
