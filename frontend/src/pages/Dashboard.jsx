import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import SkillGoLogo from '../components/SkillGoLogo';
import ThemeToggle from '../components/ThemeToggle';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const COMPANY_OPTIONS = [
  { id: 'microsoft', name: 'Microsoft' },
  { id: 'paypal', name: 'PayPal' },
  { id: 'servicenow', name: 'ServiceNow' },
  { id: 'google', name: 'Google' },
  { id: 'amazon', name: 'Amazon' },
];

const STUDY_OPTIONS = [
  { id: 'bachelor', label: "Bachelor's Degree" },
  { id: 'master', label: "Master's Degree" },
  { id: 'phd', label: 'PhD / Doctorate' },
];

const TARGET_TABS = [
  { id: 'company', label: 'Company Target' },
  { id: 'jd', label: 'Job Description' },
  { id: 'studies', label: 'Higher Studies' },
];

/*
 * Shared neomorphic "sunken field" treatment. Every free-text target input uses
 * this so the pressed/concave look is identical in light and dark mode.
 */
const NEOMORPHIC_INPUT_CLASS =
  'w-full rounded-2xl px-4 py-3 bg-[#e0e0e0] dark:bg-[#1e293b] text-gray-800 placeholder-gray-500 shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#0f172a,inset_-4px_-4px_8px_#334155] transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40';

const HISTORY_TYPE_LABELS = {
  company: 'Company',
  jd: 'Job Description',
  studies: 'Higher Studies',
};

const PRIORITY_META = {
  high: { label: 'High Priority Gaps', dot: 'bg-error-600', text: 'text-error-600' },
  medium: { label: 'Medium Priority Gaps', dot: 'bg-warning-600', text: 'text-warning-600' },
  low: { label: 'Low Priority Gaps', dot: 'bg-info-600', text: 'text-info-600' },
};

const PRINT_PRIORITY_META = {
  high: { label: 'High Priority', color: '#dc2626' },
  medium: { label: 'Medium Priority', color: '#d97706' },
  low: { label: 'Low Priority', color: '#2563eb' },
};

const PRINT_TH_STYLE = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '2px solid #d1d5db',
  color: '#111827',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const PRINT_TD_STYLE = {
  padding: '8px 10px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'top',
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const SCAN_STAGES = [
  'Fetching the repository file tree…',
  'Reading key source files…',
  'Auditing the code with NVIDIA NIM…',
  'Scoring the evidence…',
];

const SCAN_BAR_WIDTHS = ['92%', '78%', '85%', '64%', '90%', '72%', '56%'];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const groupGaps = (gapList) => {
  const groups = { high: [], medium: [], low: [] };

  (Array.isArray(gapList) ? gapList : []).forEach((item) => {
    const priority = String((item && item.priority) || '').toLowerCase();
    const key = priority.startsWith('high')
      ? 'high'
      : priority.startsWith('med')
      ? 'medium'
      : 'low';
    groups[key].push({
      skill: (item && item.skill) || 'Unknown skill',
      rationale: (item && item.reason) || '',
      verified: Boolean(item && item.verified),
      confidenceScore:
        item && typeof item.confidenceScore === 'number' ? item.confidenceScore : null,
      evidenceSnippet: (item && item.evidenceSnippet) || '',
      verificationExplanation: (item && item.verificationExplanation) || '',
      verificationUrl: (item && item.verificationUrl) || '',
    });
  });

  return groups;
};

const hasUsableQuiz = (module) =>
  Boolean(
    module &&
      module.quiz &&
      module.quiz.question &&
      Array.isArray(module.quiz.options) &&
      module.quiz.options.length >= 2
  );

/* ------------------------------------------------------------------ */
/* Printable report                                                    */
/* ------------------------------------------------------------------ */

function PrintInfoCell({ label, value }) {
  return (
    <div
      style={{
        flex: '1 1 180px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '10px 12px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#9ca3af',
        }}
      >
        {label}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
        {value}
      </p>
    </div>
  );
}

function PrintSection({ title, children }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <h2
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: '#111827',
          margin: '0 0 10px',
          borderLeft: '4px solid #2563eb',
          paddingLeft: '10px',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function PrintReport({ user, target, requirements, gaps, weeks }) {
  const generatedAt = new Date().toLocaleString();
  const rows = ['high', 'medium', 'low'];

  return (
    <div
      id="print-report"
      style={{
        backgroundColor: '#ffffff',
        color: '#1f2937',
        fontFamily: 'Inter, Arial, sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          borderBottom: '3px solid #2563eb',
          paddingBottom: '16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#111827' }}>
            SkillGO — Skill Gap Analysis Report
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Personalised learning roadmap generated by SkillGO
          </p>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
          Generated {generatedAt}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <PrintInfoCell label="Candidate" value={(user && user.name) || 'Candidate'} />
        <PrintInfoCell label="Email" value={(user && user.email) || '—'} />
        <PrintInfoCell label="Target" value={target || '—'} />
      </div>

      {requirements.length > 0 && (
        <PrintSection title="Target Requirements">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {requirements.map((requirement, index) => (
              <span
                key={`${requirement}-${index}`}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '999px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  color: '#374151',
                }}
              >
                {requirement}
              </span>
            ))}
          </div>
        </PrintSection>
      )}

      <PrintSection title="Skill Gap Matrix">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={PRINT_TH_STYLE}>Priority</th>
              <th style={PRINT_TH_STYLE}>Skill</th>
              <th style={PRINT_TH_STYLE}>Why it matters</th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((priority, rowIndex) => {
              const meta = PRINT_PRIORITY_META[priority];
              const items = gaps[priority] || [];

              if (items.length === 0) {
                return [
                  <tr key={`${priority}-empty`}>
                    <td style={{ ...PRINT_TD_STYLE, color: meta.color, fontWeight: 700 }}>
                      {meta.label}
                    </td>
                    <td style={PRINT_TD_STYLE} colSpan={2}>
                      <em style={{ color: '#9ca3af' }}>No gaps detected in this band.</em>
                    </td>
                  </tr>,
                ];
              }

              return items.map((item, index) => (
                <tr key={`${priority}-${rowIndex}-${index}`}>
                  <td style={{ ...PRINT_TD_STYLE, color: meta.color, fontWeight: 700 }}>
                    {index === 0 ? meta.label : ''}
                  </td>
                  <td style={{ ...PRINT_TD_STYLE, fontWeight: 600 }}>{item.skill}</td>
                  <td style={PRINT_TD_STYLE}>{item.rationale || '—'}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </PrintSection>

      <PrintSection title="4-Week Learning Roadmap">
        {weeks.map((week) => (
          <div
            key={week.week}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '10px',
              pageBreakInside: 'avoid',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '6px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                Week {week.week} — {week.theme}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '999px',
                  color: week.completed ? '#059669' : '#6b7280',
                  border: `1px solid ${week.completed ? '#059669' : '#d1d5db'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {week.completed
                  ? `Completed${typeof week.score === 'number' ? ` · ${week.score}%` : ''}`
                  : 'Not started'}
              </span>
            </div>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '12px', color: '#374151' }}>
              {week.tasks.map((task, index) => (
                <li key={`${task}-${index}`} style={{ marginBottom: '3px' }}>
                  {task}
                </li>
              ))}
            </ul>
            {hasUsableQuiz(week) && (
              <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#6b7280' }}>
                Quiz: {week.quiz.question}
                {week.completed && Number.isInteger(week.selectedAnswer)
                  ? ` — your answer: ${String.fromCharCode(65 + week.selectedAnswer)} (correct: ${String.fromCharCode(
                      65 + week.quiz.correctAnswer
                    )})`
                  : ''}
              </p>
            )}
          </div>
        ))}
      </PrintSection>

      <p style={{ marginTop: '18px', fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
        Generated by SkillGO
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

const Dashboard = () => {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Target selection
  const [targetType, setTargetType] = useState('company');
  const [targetName, setTargetName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [studiesLevel, setStudiesLevel] = useState('master');

  // Resume upload
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeError, setResumeError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Analysis
  const [analysisInProgress, setAnalysisInProgress] = useState(false);
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [roadmapData, setRoadmapData] = useState([]);
  const [parsedRequirements, setParsedRequirements] = useState([]);
  const [analyzedTarget, setAnalyzedTarget] = useState('');
  const [activeRoadmapId, setActiveRoadmapId] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Quiz
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizWeek, setQuizWeek] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // GitHub proof-of-work verification
  const [verifyGap, setVerifyGap] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [scanStage, setScanStage] = useState(0);

  /* -------------------- Apply a saved/created analysis -------------------- */

  const applyAnalysis = useCallback((payload) => {
    const roadmap = (payload && payload.roadmap) || {};
    const targetRole = (payload && payload.targetRole) || {};

    setAnalysisResult(groupGaps(roadmap.gapAnalysis));
    setRoadmapData(roadmap.weeklyModules || []);
    setParsedRequirements(targetRole.parsedRequirements || []);
    setAnalyzedTarget(targetRole.label || 'Your target');
    setActiveRoadmapId(roadmap.id || null);
  }, []);

  /* -------------------- Load history -------------------- */

  const loadHistory = useCallback(
    async (autoSelect) => {
      if (!token) {
        return;
      }

      setHistoryLoading(true);

      try {
        const response = await fetch('/api/career/history', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          logout();
          navigate('/', { replace: true });
          return;
        }

        const data = await response.json().catch(() => ({}));
        const items = Array.isArray(data.history) ? data.history : [];

        setHistory(items);

        if (autoSelect && items.length > 0) {
          applyAnalysis({ targetRole: items[0].targetRole, roadmap: items[0].roadmap });
        }
      } catch (err) {
        console.error('Failed to load career history:', err);
      } finally {
        setHistoryLoading(false);
      }
    },
    [token, applyAnalysis, logout, navigate]
  );

  useEffect(() => {
    loadHistory(true);
  }, [loadHistory]);

  /* -------------------- Resume file handling -------------------- */

  const validateAndSetFile = (file) => {
    if (!file) {
      return;
    }

    const looksLikePdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!looksLikePdf) {
      setResumeError('Only PDF files are supported.');
      setResumeFile(null);
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setResumeError('That file is larger than 10 MB. Please upload a smaller PDF.');
      setResumeFile(null);
      return;
    }

    setResumeError('');
    setResumeFile(file);
  };

  const handleFileInput = (event) => {
    const file = event.target.files && event.target.files[0];
    validateAndSetFile(file);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearResume = () => {
    setResumeFile(null);
    setResumeError('');
  };

  /* -------------------- Run the analysis -------------------- */

  const handleAnalyze = async () => {
    setError('');

    if (!resumeFile) {
      setError('Please upload your resume as a PDF before running the analysis.');
      return;
    }

    if (targetType === 'company' && targetName.trim().length < 2) {
      setError('Please enter your target role and company, or pick a suggestion below.');
      return;
    }

    if (targetType === 'jd' && jobDescription.trim().length < 40) {
      setError('Please paste a job description of at least 40 characters.');
      return;
    }

    setAnalysisInProgress(true);
    setAnalysisResult(null);
    setRoadmapData([]);
    setParsedRequirements([]);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('targetType', targetType);

      if (targetType === 'company') {
        const company = targetName.trim();
        formData.append('companyName', company);
        formData.append('targetName', company);
      } else if (targetType === 'jd') {
        formData.append('jobDescription', jobDescription.trim());
      } else {
        formData.append('studyLevel', studiesLevel);
        const studyTarget = targetName.trim();
        if (studyTarget) {
          formData.append('targetName', studyTarget);
        }
      }

      const response = await fetch('/api/career/analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        logout();
        navigate('/', { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'The analysis failed. Please try again.');
      }

      applyAnalysis({ targetRole: data.targetRole, roadmap: data.roadmap });
      await loadHistory(false);
    } catch (err) {
      setError(err.message || 'Something went wrong while analysing your resume.');
    } finally {
      setAnalysisInProgress(false);
    }
  };

  /* -------------------- History selection -------------------- */

  const selectHistory = (item) => {
    applyAnalysis({ targetRole: item.targetRole, roadmap: item.roadmap });
    setHistoryOpen(false);
  };

  /* -------------------- Quiz -------------------- */

  const openQuiz = (index) => {
    const module = roadmapData[index];

    if (!hasUsableQuiz(module)) {
      return;
    }

    const alreadyDone = Boolean(module.completed) && Number.isInteger(module.selectedAnswer);

    setActiveQuiz(module.quiz);
    setQuizWeek(module.week || index + 1);
    setSelectedOption(alreadyDone ? module.selectedAnswer : null);
    setSubmitted(alreadyDone);
    setQuizResult(alreadyDone ? module.selectedAnswer === module.quiz.correctAnswer : null);
  };

  const submitAnswer = async () => {
    if (selectedOption === null || submitted || !activeQuiz) {
      return;
    }

    const answerIndex = selectedOption;
    const isCorrect = answerIndex === activeQuiz.correctAnswer;

    setSubmitted(true);
    setQuizResult(isCorrect);

    if (!activeRoadmapId) {
      return;
    }

    setQuizSaving(true);

    try {
      const response = await fetch(`/api/career/roadmap/${activeRoadmapId}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weekNumber: quizWeek, selectedAnswer: answerIndex }),
      });

      if (response.status === 401) {
        logout();
        navigate('/', { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.roadmap) {
        setRoadmapData(data.roadmap.weeklyModules || []);
        setHistory((previous) =>
          previous.map((item) =>
            item.roadmap && item.roadmap.id === activeRoadmapId
              ? { ...item, roadmap: data.roadmap }
              : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to save quiz result:', err);
    } finally {
      setQuizSaving(false);
    }
  };

  const closeQuiz = () => {
    setActiveQuiz(null);
    setSelectedOption(null);
    setSubmitted(false);
    setQuizResult(null);
    setQuizSaving(false);
  };

  /* -------------------- GitHub proof-of-work -------------------- */

  useEffect(() => {
    if (!verifying) {
      return undefined;
    }

    setScanStage(0);
    const interval = setInterval(() => {
      setScanStage((stage) => (stage + 1) % SCAN_STAGES.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [verifying]);

  const openVerify = (gap) => {
    setVerifyGap(gap);
    setGithubUrl(gap.verificationUrl || '');
    setVerifyError('');

    if (gap.verified || gap.evidenceSnippet || gap.verificationExplanation) {
      setVerifyResult({
        verified: gap.verified,
        confidenceScore: gap.confidenceScore,
        evidenceSnippet: gap.evidenceSnippet,
        explanation: gap.verificationExplanation,
      });
    } else {
      setVerifyResult(null);
    }

    setVerifying(false);
    setScanStage(0);
  };

  const closeVerify = () => {
    setVerifyGap(null);
    setGithubUrl('');
    setVerifyError('');
    setVerifyResult(null);
    setVerifying(false);
    setScanStage(0);
  };

  const applyVerifiedGap = (skillName, result, sourceUrl) => {
    setAnalysisResult((previous) => {
      if (!previous) {
        return previous;
      }

      const next = { high: [], medium: [], low: [] };

      ['high', 'medium', 'low'].forEach((priority) => {
        next[priority] = previous[priority].map((item) =>
          item.skill === skillName
            ? {
                ...item,
                verified: result.verified,
                confidenceScore: result.confidenceScore,
                evidenceSnippet: result.evidenceSnippet,
                verificationExplanation: result.explanation,
                verificationUrl: sourceUrl,
              }
            : item
        );
      });

      return next;
    });

    if (activeRoadmapId) {
      setHistory((previous) =>
        previous.map((item) => {
          if (
            !item.roadmap ||
            item.roadmap.id !== activeRoadmapId ||
            !Array.isArray(item.roadmap.gapAnalysis)
          ) {
            return item;
          }

          return {
            ...item,
            roadmap: {
              ...item.roadmap,
              gapAnalysis: item.roadmap.gapAnalysis.map((gap) =>
                gap.skill === skillName
                  ? {
                      ...gap,
                      verified: result.verified,
                      confidenceScore: result.confidenceScore,
                      evidenceSnippet: result.evidenceSnippet,
                      verificationExplanation: result.explanation,
                      verificationUrl: sourceUrl,
                    }
                  : gap
              ),
            },
          };
        })
      );
    }
  };

  const submitVerify = async () => {
    if (!verifyGap || verifying) {
      return;
    }

    const url = githubUrl.trim();

    if (!url) {
      setVerifyError('Please paste a public GitHub repository URL.');
      return;
    }

    if (!activeRoadmapId) {
      setVerifyError('This analysis is not linked to a saved roadmap yet.');
      return;
    }

    setVerifyError('');
    setVerifying(true);
    setVerifyResult(null);

    try {
      const response = await fetch(`/api/career/roadmap/${activeRoadmapId}/verify-github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skillName: verifyGap.skill, githubUrl: url }),
      });

      if (response.status === 401) {
        logout();
        navigate('/', { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed. Please try again.');
      }

      setVerifyResult({
        verified: data.verified,
        confidenceScore: data.confidenceScore,
        evidenceSnippet: data.evidenceSnippet,
        explanation: data.explanation,
        repoFullName: data.repoFullName,
        filesScanned: data.filesScanned,
      });

      applyVerifiedGap(verifyGap.skill, data, url);
    } catch (err) {
      setVerifyError(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  /* -------------------- Export -------------------- */

  const handleExport = () => {
    if (!analysisResult) {
      return;
    }
    window.print();
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  /* -------------------- Render -------------------- */

  const quizIsCorrect = quizResult === true;
  const hasAnalysis = Boolean(analysisResult);

  return (
    <div className="min-h-screen bg-background dark:bg-[#1e293b] transition-colors duration-500 ease-in-out">
      {/* Header */}
      <header className="px-6 py-4 backdrop-blur-sm bg-background/80 dark:bg-[#1e293b]/80 border-b border-white/40 transition-colors duration-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <SkillGoLogo size="md" />
            <div className="hidden sm:block border-l border-gray-300/60 pl-4">
              <p className="text-sm font-medium text-gray-700">
                Welcome back, {user?.name || 'there'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.email || 'Your skill development dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center neomorphism-light hover:neomorphism-hover-light px-5 py-2.5 rounded-2xl font-medium text-gray-800 transition-all duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="py-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Toolbar: history + export */}
          <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
              className="flex items-center justify-between sm:justify-start sm:space-x-3 px-5 py-3 neomorphism-light hover:neomorphism-hover-light rounded-2xl font-medium text-gray-800 transition-all duration-200"
            >
              <span className="flex items-center space-x-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Analysis history</span>
                {history.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold neomorphism-inset-light text-primary">
                    {history.length}
                  </span>
                )}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ml-3 text-gray-500 transition-transform duration-200 ${
                  historyOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={!hasAnalysis}
              className={`flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl font-medium transition-all duration-200 ${
                hasAnalysis
                  ? 'neomorphism-light hover:neomorphism-hover-light text-gray-800'
                  : 'neomorphism-inset-light text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
                />
              </svg>
              <span>Export report (PDF)</span>
            </button>
          </section>

          {/* History drawer */}
          {historyOpen && (
            <section className="mb-8 neomorphism-light rounded-3xl px-6 py-6 dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Your saved analyses</h2>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>

              {historyLoading ? (
                <div className="flex items-center space-x-3 text-gray-500 py-2">
                  <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
                  <span className="text-sm">Loading your history…</span>
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No saved analyses yet. Run your first analysis below and it will appear here.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {history.map((item) => {
                    const roadmap = item.roadmap;
                    const active = Boolean(
                      roadmap && roadmap.id && roadmap.id === activeRoadmapId
                    );
                    const total = roadmap ? roadmap.totalWeeks : 0;
                    const done = roadmap ? roadmap.completedWeeks : 0;
                    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

                    return (
                      <button
                        key={item.targetRole.id}
                        type="button"
                        onClick={() => selectHistory(item)}
                        className={`text-left rounded-2xl px-4 py-4 transition-all duration-200 ${
                          active
                            ? 'neomorphism-inset-light'
                            : 'neomorphism-light hover:neomorphism-hover-light'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p
                              className={`font-semibold truncate ${
                                active ? 'text-primary' : 'text-gray-800'
                              }`}
                            >
                              {item.targetRole.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {HISTORY_TYPE_LABELS[item.targetRole.type] || 'Target'} ·{' '}
                              {formatDate(item.targetRole.createdAt)}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold neomorphism-inset-light text-gray-600 flex-shrink-0">
                            {done}/{total}
                          </span>
                        </div>
                        <div className="h-2 rounded-full neomorphism-inset-light overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{percent}% complete</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Target + resume */}
          <section className="neomorphism-light rounded-3xl px-6 py-6 mb-8 dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Target selection &amp; resume</h2>
            <p className="text-sm text-gray-500 mb-5">
              Upload your resume and choose what you are aiming for. The AI will compare the two and
              build your roadmap.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {TARGET_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTargetType(tab.id)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    targetType === tab.id
                      ? 'neomorphism-inset-light text-primary'
                      : 'neomorphism-light text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {targetType === 'company' && (
              <div className="mb-6">
                <label
                  htmlFor="company-target"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Target role and company
                </label>
                <input
                  id="company-target"
                  type="text"
                  value={targetName}
                  onChange={(event) => setTargetName(event.target.value)}
                  placeholder="e.g., Full Stack Engineer at Stripe"
                  autoComplete="off"
                  className={NEOMORPHIC_INPUT_CLASS}
                />

                <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Suggestions
                </p>
                <div className="flex flex-wrap gap-3">
                  {COMPANY_OPTIONS.map((company) => {
                    const isActive =
                      targetName.trim().toLowerCase() === company.name.toLowerCase();
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => setTargetName(company.name)}
                        className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                          isActive
                            ? 'neomorphism-inset-light text-primary'
                            : 'neomorphism-light text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        {company.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Any role at any company works — type it exactly as you want the AI to benchmark
                  against it.
                </p>
              </div>
            )}

            {targetType === 'jd' && (
              <div className="mb-6">
                <label htmlFor="jd" className="block text-sm font-medium text-gray-700 mb-2">
                  Paste the job description
                </label>
                <textarea
                  id="jd"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={5}
                  className={NEOMORPHIC_INPUT_CLASS}
                />
                <p className="mt-2 text-xs text-gray-500">
                  The AI extracts the required skills and prioritises your gaps against them.
                </p>
              </div>
            )}

            {targetType === 'studies' && (
              <div className="mb-6">
                <label
                  htmlFor="studies-target"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Target programme
                </label>
                <input
                  id="studies-target"
                  type="text"
                  value={targetName}
                  onChange={(event) => setTargetName(event.target.value)}
                  placeholder="e.g., MS in Computer Science at Stanford"
                  autoComplete="off"
                  className={NEOMORPHIC_INPUT_CLASS}
                />

                <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Study level
                </p>
                <div className="flex flex-wrap gap-3">
                  {STUDY_OPTIONS.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setStudiesLevel(level.id)}
                      className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                        studiesLevel === level.id
                          ? 'neomorphism-inset-light text-primary'
                          : 'neomorphism-light text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Leave the programme blank to target the study level on its own, or type the exact
                  programme and university you are aiming for.
                </p>
              </div>
            )}

            {/* Resume upload zone */}
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Upload resume (PDF)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFileInput}
            />

            {!resumeFile ? (
              <div
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openFilePicker();
                  }
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`w-full cursor-pointer rounded-3xl px-6 py-10 text-center transition-all duration-200 ${
                  isDragging
                    ? 'neomorphism-inset-light ring-2 ring-primary/40'
                    : 'neomorphism-inset-light hover:neomorphism-hover-light'
                }`}
              >
                <div className="w-14 h-14 neomorphism-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-gray-800">
                  {isDragging ? 'Drop your PDF here' : 'Drag & drop your resume'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  or <span className="text-primary font-medium">click to browse</span> — PDF only, up
                  to 10 MB
                </p>
              </div>
            ) : (
              <div className="w-full rounded-3xl px-6 py-6 neomorphism-inset-light flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-12 h-12 neomorphism-light rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-error-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2-5V7a2 2 0 00-2-2h-5L7 8v9a2 2 0 002 2h8a2 2 0 002-2v-3"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{resumeFile.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(resumeFile.size)} · PDF</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="px-4 py-2 neomorphism-light hover:neomorphism-hover-light rounded-xl text-sm font-medium text-gray-700 transition-all duration-200"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={clearResume}
                    aria-label="Remove resume"
                    className="px-4 py-2 neomorphism-light hover:neomorphism-hover-light rounded-xl text-sm font-medium text-error-600 transition-all duration-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {resumeError && (
              <div className="mt-4 px-4 py-3 neomorphism-light rounded-2xl text-sm text-error-600">
                {resumeError}
              </div>
            )}

            {error && (
              <div className="mt-4 px-4 py-3 neomorphism-light rounded-2xl text-sm text-error-600">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analysisInProgress}
              className={`mt-6 w-full px-6 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-secondary shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-opacity ${
                analysisInProgress ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-95'
              }`}
            >
              {analysisInProgress ? 'Analysing with NVIDIA NIM…' : 'Run skill gap analysis'}
            </button>
          </section>

          {/* Loading skeleton */}
          {analysisInProgress && (
            <section className="mb-8" aria-busy="true" aria-live="polite">
              <div className="neomorphism-light rounded-3xl px-8 py-12 dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-300 border-t-primary animate-spin" />
                  <p className="mt-5 font-semibold text-gray-800">
                    Analysing your resume with NVIDIA NIM…
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Extracting requirements, scoring gaps and building a four-week roadmap.
                  </p>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className="neomorphism-inset-light rounded-2xl h-40 animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Results */}
          {analysisResult && !analysisInProgress && (
            <>
              <section className="mb-8">
                <div className="flex items-baseline justify-between flex-wrap gap-2 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Skill gap analysis</h2>
                  <span className="text-sm text-gray-500">
                    Target: <span className="font-medium text-gray-700">{analyzedTarget}</span>
                  </span>
                </div>

                {parsedRequirements.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Requirements detected by the AI
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {parsedRequirements.map((requirement, index) => (
                        <span
                          key={`${requirement}-${index}`}
                          className="px-3 py-1 rounded-full text-xs font-medium neomorphism-inset-light text-primary"
                        >
                          {requirement}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['high', 'medium', 'low'].map((priority) => {
                    const meta = PRIORITY_META[priority];
                    const items = analysisResult[priority];
                    return (
                      <div key={priority} className="neomorphism-light rounded-3xl px-5 py-6 dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className={`text-sm font-bold uppercase tracking-wide ${meta.text}`}>
                            {meta.label}
                          </h3>
                          <span className={`w-3 h-3 rounded-full ${meta.dot}`} />
                        </div>
                        {items.length > 0 ? (
                          <div className="space-y-3">
                            {items.map((item, index) => (
                              <div
                                key={`${item.skill}-${index}`}
                                className="neomorphism-inset-light rounded-2xl px-4 py-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-gray-800">
                                    {item.skill}
                                  </p>
                                  {item.verified && (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold neomorphism-inset-light text-success-600 flex-shrink-0">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-3 w-3"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span>GitHub verified</span>
                                    </span>
                                  )}
                                </div>
                                {item.rationale && (
                                  <p className="text-xs text-gray-500 mt-1">{item.rationale}</p>
                                )}
                                {(priority === 'high' || priority === 'medium') && (
                                  <button
                                    type="button"
                                    onClick={() => openVerify(item)}
                                    className="mt-3 w-full flex items-center justify-center space-x-1.5 px-3 py-2 neomorphism-light hover:neomorphism-hover-light rounded-xl text-xs font-medium text-primary transition-all duration-200"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3.5 w-3.5"
                                      viewBox="0 0 16 16"
                                      fill="currentColor"
                                    >
                                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z" />
                                    </svg>
                                    <span>
                                      {item.verified
                                        ? 'Re-verify via GitHub Repo'
                                        : 'Verify via GitHub Repo'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No gaps detected in this band.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Roadmap */}
              {roadmapData.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Your 4-week roadmap</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roadmapData.map((module, index) => (
                      <div
                        key={`${module.week}-${index}`}
                        className="neomorphism-light rounded-3xl px-6 py-6 dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500"
                      >
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-bold">{module.week}</span>
                          </div>
                          <h3 className="font-bold text-gray-800">{module.theme}</h3>
                          {module.completed && (
                            <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold neomorphism-inset-light text-success-600 flex-shrink-0">
                              {typeof module.score === 'number' ? `${module.score}%` : 'Done'}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-2 mb-5">
                          {module.tasks.map((task, taskIndex) => (
                            <li
                              key={`${task}-${taskIndex}`}
                              className="flex items-start space-x-2 text-sm text-gray-600"
                            >
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                        {hasUsableQuiz(module) ? (
                          <button
                            type="button"
                            onClick={() => openQuiz(index)}
                            className="w-full px-4 py-3 neomorphism-light hover:neomorphism-hover-light rounded-2xl font-medium text-primary transition-all duration-200"
                          >
                            {module.completed
                              ? `Review week ${module.week} quiz`
                              : `Take week ${module.week} quiz`}
                          </button>
                        ) : (
                          <p className="text-center text-sm text-gray-400">No quiz for this week.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Empty state */}
          {!analysisResult && !analysisInProgress && !historyLoading && (
            <div className="neomorphism-light rounded-3xl px-8 py-16 text-center dark:bg-[#1e293b] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] transition-colors duration-500">
              <div className="w-14 h-14 neomorphism-light rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">No analysis yet</h3>
              <p className="mt-2 text-gray-600 max-w-md mx-auto">
                Upload your resume, pick a target and run the analysis to see your prioritised skill
                gaps and a personalised four-week learning roadmap.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Quiz modal */}
      {activeQuiz && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background dark:bg-[#1e293b] rounded-3xl shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] w-full max-w-lg transition-colors duration-500">
            <div className="px-7 py-6">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Week {quizWeek} quiz</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {submitted
                      ? quizIsCorrect
                        ? 'Correct — nicely done.'
                        : 'Not quite. Review the answer below.'
                      : 'Choose the best answer.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeQuiz}
                  aria-label="Close quiz"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-base font-medium text-gray-800 mb-4">{activeQuiz.question}</p>

              <div className="space-y-3">
                {activeQuiz.options.map((option, index) => {
                  const isSelected = selectedOption === index;
                  const isCorrect = index === activeQuiz.correctAnswer;

                  let stateClass = 'neomorphism-light text-gray-700';
                  if (submitted && isCorrect) {
                    stateClass =
                      'neomorphism-inset-light text-success-600 ring-1 ring-success-600/40';
                  } else if (submitted && isSelected && !isCorrect) {
                    stateClass =
                      'neomorphism-inset-light text-error-600 ring-1 ring-error-600/40';
                  } else if (isSelected) {
                    stateClass = 'neomorphism-inset-light text-primary';
                  }

                  return (
                    <button
                      key={`${option}-${index}`}
                      type="button"
                      disabled={submitted}
                      onClick={() => setSelectedOption(index)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left transition-all ${stateClass} ${
                        submitted ? 'cursor-default' : 'hover:neomorphism-hover-light'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-primary/10 text-primary flex-shrink-0">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-sm">{option}</span>
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <p className="mt-4 text-xs text-gray-500">
                  {quizSaving
                    ? 'Saving your result…'
                    : activeRoadmapId
                    ? 'Result saved to your account.'
                    : 'Result shown for this session (not linked to a saved roadmap).'}
                </p>
              )}

              <div className="mt-6 flex space-x-3">
                {!submitted ? (
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={selectedOption === null}
                    className={`flex-1 px-4 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-secondary ${
                      selectedOption === null ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95'
                    }`}
                  >
                    Check answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeQuiz}
                    disabled={quizSaving}
                    className={`flex-1 px-4 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-secondary ${
                      quizSaving ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-95'
                    }`}
                  >
                    {quizSaving ? 'Saving…' : 'Done'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GitHub proof-of-work verification modal */}
      {verifyGap && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background dark:bg-[#1e293b] rounded-3xl shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] dark:shadow-[8px_8px_16px_#0f172a,-8px_-8px_16px_#334155] w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors duration-500">
            <div className="px-7 py-6">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Verify skill via GitHub</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Proof-of-work check for{' '}
                    <span className="font-medium text-primary">{verifyGap.skill}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeVerify}
                  aria-label="Close verification"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <label htmlFor="github-url" className="block text-sm font-medium text-gray-700 mb-2">
                Public GitHub repository URL
              </label>
              <input
                id="github-url"
                type="url"
                value={githubUrl}
                onChange={(event) => setGithubUrl(event.target.value)}
                placeholder="https://github.com/username/repo"
                disabled={verifying}
                className="w-full px-4 py-3 neomorphism-inset-light focus:outline-none transition-all duration-200 rounded-2xl text-gray-800 placeholder-gray-500 disabled:opacity-70"
              />
              <p className="mt-2 text-xs text-gray-500">
                We fetch the repository tree and key source files, then audit them with NVIDIA NIM to
                confirm the skill is implemented in code.
              </p>

              {verifyError && (
                <div className="mt-4 px-4 py-3 neomorphism-light rounded-2xl text-sm text-error-600">
                  {verifyError}
                </div>
              )}

              {verifying && (
                <div className="mt-5" aria-busy="true" aria-live="polite">
                  <div className="relative neomorphism-inset-light rounded-2xl p-4 h-44 overflow-hidden">
                    <div className="space-y-2.5">
                      {SCAN_BAR_WIDTHS.map((width, index) => (
                        <div
                          key={index}
                          className="h-2 rounded-full bg-gray-300/60"
                          style={{ width }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/40 to-transparent animate-scan pointer-events-none" />
                  </div>
                  <div className="mt-4 flex items-center space-x-3">
                    <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
                    <span className="text-sm font-medium text-gray-700">
                      {SCAN_STAGES[scanStage]}
                    </span>
                  </div>
                </div>
              )}

              {!verifying && verifyResult && (
                <div className="mt-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 neomorphism-inset-light rounded-2xl px-4 py-3">
                    <span
                      className={`flex items-center space-x-2 font-semibold ${
                        verifyResult.verified ? 'text-success-600' : 'text-warning-600'
                      }`}
                    >
                      {verifyResult.verified ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span>
                        {verifyResult.verified
                          ? 'Verified — skill found in code'
                          : 'Not verified — no clear evidence found'}
                      </span>
                    </span>
                    {typeof verifyResult.confidenceScore === 'number' && (
                      <span className="text-sm font-semibold text-gray-600">
                        {verifyResult.confidenceScore}% confidence
                      </span>
                    )}
                  </div>

                  {(verifyResult.repoFullName ||
                    typeof verifyResult.filesScanned === 'number') && (
                    <p className="mt-2 text-xs text-gray-500">
                      {verifyResult.repoFullName
                        ? `Scanned ${verifyResult.repoFullName}`
                        : 'Scanned repository'}
                      {typeof verifyResult.filesScanned === 'number'
                        ? ` · ${verifyResult.filesScanned} source files read`
                        : ''}
                    </p>
                  )}

                  {verifyResult.explanation && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        AI assessment
                      </p>
                      <p className="text-sm text-gray-700">{verifyResult.explanation}</p>
                    </div>
                  )}

                  {verifyResult.evidenceSnippet && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Evidence detected
                      </p>
                      <pre className="neomorphism-inset-light rounded-2xl px-4 py-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                        <code>{verifyResult.evidenceSnippet}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={closeVerify}
                  disabled={verifying}
                  className="px-5 py-3 neomorphism-light hover:neomorphism-hover-light rounded-2xl font-medium text-gray-700 transition-all duration-200 disabled:opacity-60"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={submitVerify}
                  disabled={verifying || !githubUrl.trim()}
                  className={`flex-1 px-4 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-secondary transition-opacity ${
                    verifying || !githubUrl.trim()
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:opacity-95'
                  }`}
                >
                  {verifying
                    ? 'Scanning repository…'
                    : verifyResult
                    ? 'Re-scan repository'
                    : 'Scan repository'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen printable report (visible only when printing) */}
      {analysisResult && (
        <PrintReport
          user={user}
          target={analyzedTarget}
          requirements={parsedRequirements}
          gaps={analysisResult}
          weeks={roadmapData}
        />
      )}
    </div>
  );
};

export default Dashboard;
