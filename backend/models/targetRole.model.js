const mongoose = require('mongoose');

const targetRoleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['company', 'jd', 'studies'],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    jobDescription: {
      type: String,
    },
    studyLevel: {
      type: String,
      enum: ['bachelor', 'master', 'phd'],
    },
    parsedRequirements: {
      type: [String],
      default: [],
    },
    resumeFileName: {
      type: String,
      trim: true,
    },
    resumeCharCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TargetRole', targetRoleSchema);
