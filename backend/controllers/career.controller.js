const mongoose = require('mongoose');
const { PDFParse } = require('pdf-parse');
const { analyzeSkillGap } = require('../services/nim.service');
const { verifySkillWithGitHub } = require('../services/githubVerifier.service');
const TargetRole = require('../models/targetRole.model');
const Roadmap = require('../models/roadmap.model');

const ALLOWED_TARGET_TYPES = ['company', 'jd', 'studies'];

const STUDY_LEVEL_LABELS = {
  bachelor: "Bachelor's Degree",
  master: "Master's Degree",
  phd: 'PhD / Doctorate',
};

/* ------------------------------------------------------------------ */
/* Serialisers                                                         */
/* ------------------------------------------------------------------ */

function serializeTargetRole(targetRole) {
  if (!targetRole) {
    return null;
  }

  return {
    id: targetRole._id ? String(targetRole._id) : null,
    type: targetRole.type,
    label: targetRole.label,
    companyName: targetRole.companyName || null,
    jobDescription: targetRole.jobDescription || null,
    studyLevel: targetRole.studyLevel || null,
    parsedRequirements: targetRole.parsedRequirements || [],
    resumeFileName: targetRole.resumeFileName || null,
    createdAt: targetRole.createdAt || null,
  };
}

function serializeRoadmap(roadmap) {
  if (!roadmap) {
    return null;
  }

  const modules = roadmap.weeklyModules || [];
  const completedWeeks = modules.filter((module) => module && module.completed).length;
  const targetRoleRef = roadmap.targetRole;

  return {
    id: roadmap._id ? String(roadmap._id) : null,
    targetRole: targetRoleRef && targetRoleRef._id ? String(targetRoleRef._id) : targetRoleRef || null,
    gapAnalysis: roadmap.gapAnalysis || [],
    weeklyModules: modules,
    completedWeeks,
    totalWeeks: modules.length,
    createdAt: roadmap.createdAt || null,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Remove PDF page markers produced by the extractor and collapse whitespace
 * so the AI receives clean, dense text.
 */
function cleanResumeText(rawText) {
  return String(rawText || '')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/* ------------------------------------------------------------------ */
/* POST /api/career/analyze                                            */
/* ------------------------------------------------------------------ */

exports.analyzeResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF resume to analyse.',
      });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF resumes are supported.',
      });
    }

    const { targetType, companyName, jobDescription, studyLevel, targetName } = req.body;

    if (!ALLOWED_TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target type. Choose company, jd or studies.',
      });
    }

    // A free-text target typed by the user takes precedence over any preset.
    const customTarget = String(targetName || '').trim().slice(0, 160);

    let label;
    let nimTarget;

    if (targetType === 'company') {
      const name = customTarget || String(companyName || '').trim().slice(0, 160);
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Please enter or select a target company.',
        });
      }
      label = name.slice(0, 120);
      nimTarget = name.slice(0, 120);
    } else if (targetType === 'jd') {
      const description = (jobDescription || '').trim();
      if (description.length < 40) {
        return res.status(400).json({
          success: false,
          message: 'Please paste a job description of at least 40 characters.',
        });
      }
      label = 'Pasted Job Description';
      nimTarget = description;
    } else {
      const level = STUDY_LEVEL_LABELS[studyLevel] ? studyLevel : 'master';
      label = customTarget ? customTarget.slice(0, 120) : STUDY_LEVEL_LABELS[level];
      nimTarget = label;
    }

    // Extract text from the uploaded PDF buffer.
    const parser = new PDFParse({ data: req.file.buffer });
    let extractedText = '';
    try {
      const result = await parser.getText();
      extractedText = result && result.text ? result.text : '';
    } finally {
      await parser.destroy();
    }

    const resumeText = cleanResumeText(extractedText);

    if (resumeText.length < 60) {
      return res.status(400).json({
        success: false,
        message:
          'We could not read enough text from that PDF. Please upload a text-based (not scanned) PDF resume.',
      });
    }

    // Ask NVIDIA NIM to analyse the resume against the target.
    const analysis = await analyzeSkillGap(resumeText, nimTarget, targetType);

    // Persist the target and the generated roadmap.
    const targetRole = await TargetRole.create({
      user: req.user._id,
      type: targetType,
      label,
      companyName: targetType === 'company' ? label : undefined,
      jobDescription: targetType === 'jd' ? (jobDescription || '').trim() : undefined,
      studyLevel: targetType === 'studies' ? studyLevel : undefined,
      parsedRequirements: analysis.parsedRequirements,
      resumeFileName: req.file.originalname,
      resumeCharCount: resumeText.length,
    });

    const roadmap = await Roadmap.create({
      user: req.user._id,
      targetRole: targetRole._id,
      gapAnalysis: analysis.gapAnalysis,
      weeklyModules: analysis.weeklyModules,
    });

    return res.status(201).json({
      success: true,
      targetRole: serializeTargetRole(targetRole.toObject()),
      roadmap: serializeRoadmap(roadmap.toObject()),
    });
  } catch (error) {
    if (error && error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/career/history                                             */
/* ------------------------------------------------------------------ */

exports.getHistory = async (req, res, next) => {
  try {
    const targetRoles = await TargetRole.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const roadmaps = await Roadmap.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const roadmapByTarget = new Map();
    roadmaps.forEach((roadmap) => {
      roadmapByTarget.set(String(roadmap.targetRole), roadmap);
    });

    const history = targetRoles.map((targetRole) => {
      const roadmap = roadmapByTarget.get(String(targetRole._id)) || null;
      return {
        targetRole: serializeTargetRole(targetRole),
        roadmap: serializeRoadmap(roadmap),
      };
    });

    return res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    return next(error);
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/career/roadmap/:id                                         */
/* ------------------------------------------------------------------ */

exports.getRoadmap = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roadmap id.',
      });
    }

    const roadmap = await Roadmap.findOne({ _id: id, user: req.user._id })
      .populate('targetRole')
      .lean();

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap not found.',
      });
    }

    const plain = roadmap;
    const targetRoleDoc = plain.targetRole && plain.targetRole._id ? plain.targetRole : null;
    const serializedRoadmap = serializeRoadmap({
      ...plain,
      targetRole: targetRoleDoc ? targetRoleDoc._id : plain.targetRole,
    });

    return res.json({
      success: true,
      targetRole: serializeTargetRole(targetRoleDoc),
      roadmap: serializedRoadmap,
    });
  } catch (error) {
    return next(error);
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/career/roadmap/:id/quiz                                   */
/* ------------------------------------------------------------------ */

exports.submitQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roadmap id.',
      });
    }

    const weekNumber = Number(req.body.weekNumber);
    const selectedAnswer = Number(req.body.selectedAnswer);

    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      return res.status(400).json({
        success: false,
        message: 'weekNumber must be a positive integer.',
      });
    }

    if (!Number.isInteger(selectedAnswer) || selectedAnswer < 0) {
      return res.status(400).json({
        success: false,
        message: 'selectedAnswer must be a non-negative integer index.',
      });
    }

    const roadmap = await Roadmap.findOne({ _id: id, user: req.user._id });

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap not found.',
      });
    }

    const targetWeek = roadmap.weeklyModules.find((module) => module.week === weekNumber);

    if (!targetWeek) {
      return res.status(404).json({
        success: false,
        message: `Week ${weekNumber} was not found on this roadmap.`,
      });
    }

    const quiz = targetWeek.quiz;

    if (!quiz || !Array.isArray(quiz.options) || quiz.options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'This week does not have a quiz to submit.',
      });
    }

    if (selectedAnswer >= quiz.options.length) {
      return res.status(400).json({
        success: false,
        message: 'selectedAnswer is out of range for this quiz.',
      });
    }

    const isCorrect = selectedAnswer === quiz.correctAnswer;

    targetWeek.completed = true;
    targetWeek.selectedAnswer = selectedAnswer;
    targetWeek.score = isCorrect ? 100 : 0;
    targetWeek.completedAt = new Date();

    roadmap.markModified('weeklyModules');
    await roadmap.save();

    return res.json({
      success: true,
      correct: isCorrect,
      score: targetWeek.score,
      correctAnswer: quiz.correctAnswer,
      message: isCorrect
        ? 'Correct answer. Week marked as complete.'
        : 'Answer recorded. Week marked as complete.',
      roadmap: serializeRoadmap(roadmap.toObject()),
    });
  } catch (error) {
    return next(error);
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/career/roadmap/:id/verify-github                          */
/* ------------------------------------------------------------------ */

exports.verifyGithub = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roadmap id.',
      });
    }

    const skillName = String(req.body.skillName || '').trim();
    const githubUrl = String(req.body.githubUrl || '').trim();

    if (!skillName) {
      return res.status(400).json({
        success: false,
        message: 'A skill name is required to verify.',
      });
    }

    if (!githubUrl) {
      return res.status(400).json({
        success: false,
        message: 'A GitHub repository URL is required.',
      });
    }

    const roadmap = await Roadmap.findOne({ _id: id, user: req.user._id });

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap not found.',
      });
    }

    const gap = roadmap.gapAnalysis.find(
      (entry) => String(entry.skill).trim().toLowerCase() === skillName.toLowerCase()
    );

    if (!gap) {
      return res.status(404).json({
        success: false,
        message: `The skill "${skillName}" was not found on this roadmap.`,
      });
    }

    const verification = await verifySkillWithGitHub({
      skillName: gap.skill,
      githubUrl,
    });

    // Record the proof-of-work attempt. The gap is only marked verified when
    // the AI found concrete code evidence in the repository.
    gap.verified = verification.verified === true;
    gap.confidenceScore = verification.confidenceScore;
    gap.evidenceSnippet = verification.evidenceSnippet;
    gap.verificationExplanation = verification.explanation;
    gap.verificationUrl = githubUrl;
    gap.verifiedAt = verification.verified === true ? new Date() : null;

    roadmap.markModified('gapAnalysis');
    await roadmap.save();

    return res.json({
      success: true,
      skill: gap.skill,
      verified: gap.verified,
      confidenceScore: gap.confidenceScore,
      evidenceSnippet: gap.evidenceSnippet,
      explanation: gap.verificationExplanation,
      repoFullName: verification.repoFullName,
      branch: verification.branch,
      filesScanned: verification.filesScanned,
      roadmap: serializeRoadmap(roadmap.toObject()),
    });
  } catch (error) {
    if (error && error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
};
